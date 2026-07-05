// Scheduler (C/Q concurrency). Pools (chunk × language) from multiple inputs into one queue for concurrent processing.
//   Result: `${inputId}|${index}|${target}` → { inputId, index, target, status, path?, projectId?, name?, reason? }
//   - OK          : path of the dubbing result downloaded locally
//   - PASSTHROUGH : silent (split chunk) → original chunk path as-is (merge included)
//   - DLFAIL      : generated (has projectSeq) · only download failed → re-download on resume (no regeneration)
//   - HARD_FAIL   : excluded from merge (group boundary)
// With opts.lipsync, a completed dubbing task is re-queued as a stage:'lipsync' task (parentSeq = dubbing
// projectSeq) in the same pool: lip-sync jobs share the queue slots, are polled less often, and are never
// re-submitted on failure (a repeat request bills again) — a failed lip-sync falls back to the dubbed video.
import { basename, join } from 'node:path';
import { makeTempDir } from './tmp.mjs';
import { upload, requestTranslation, requestLipSync, getStatus, download, getQueueStatus, cancel } from './api_adapter.mjs';
import { PersoApiError } from './http_client.mjs';
import {
  BACKOFF_BASE_MS, BACKOFF_MAX_MS, POLL_INTERVAL_MS,
  MAX_IDLE_MS, MAX_RETRY, QUEUE_WAIT_MS,
  LIPSYNC_POLL_INTERVAL_MS, LIPSYNC_IDLE_PER_DURATION, LIPSYNC_IDLE_MS,
} from './config.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Credit/usage shortage is judged uniformly by HTTP 402 (does not depend on internal code names)
const isCreditError = (e) => e instanceof PersoApiError && e.httpStatus === 402;
// Translation queue full (backpressure): observed as 429 VT4292 (FULL_VT_TRANSLATE_QUEUE). VT5034 (503) also preserved.
const QUEUE_FULL_CODES = new Set(['VT4292', 'VT5034']);

// chunks: pieces from multiple inputs in one array (each piece identifies its input by inputId, index is 0-based within the input).
//   An unsplit input has a single piece. The same (inputId,index) shares mediaSeq across languages (uploaded once).
export async function runSchedule(chunks, spaceSeq, opts = {}, hooks = {}) {
  const log = hooks.log ?? (() => {});
  const notify = hooks.notify ?? (() => {});
  const onResult = hooks.onResult ?? (() => {}); // fired per confirmed result — lets the caller persist resume state incrementally
  const onSubmit = hooks.onSubmit ?? (() => {}); // fired right after a submission — persists the projectSeq before any result exists
  const outDir = await makeTempDir('dubbing-out-');

  // Unit of work = (input × chunk × language). Expand every chunk of every input per language to fill one queue.
  const targets = opts.targets ?? [opts.target ?? 'en'];
  const skip = opts.done instanceof Set ? opts.done : new Set(); // resume: already-completed (inputId|index|target) are not submitted
  const taskKey = (t) => `${t.inputId ?? 0}|${t.index}|${t.target}`;
  const mediaKey = (t) => `${t.inputId ?? 0}|${t.index}`;

  const pending = [];
  for (const c of chunks) {
    if (c.stage === 'lipsync') { // pre-targeted (resume/lipsync-only): explicitly requested by the caller, carries its own language
      pending.push({ ...c, inputId: c.inputId ?? 0, retries: 0 });
      continue;
    }
    for (const target of targets) {
      const t = { ...c, inputId: c.inputId ?? 0, path: c.path ?? c.localPath, target, retries: 0 };
      if (!skip.has(taskKey(t))) pending.push(t);
    }
  }
  const submitted = new Map(); // projectId → task (input × chunk × language)
  const results = new Map(); // taskKey → result
  const mediaByKey = new Map(); // `${inputId}|${index}` → {seq, kind}: uploaded once per chunk, shared across languages
  let stopAll = false;
  let stopReason = null;
  let engineError = null; // unrecoverable engine error message (for reporting upward)
  let backoff = BACKOFF_BASE_MS;
  let lastProgressAt = Date.now(); // time of last progress. Guards on 'no progress' rather than absolute elapsed time.
  let lipsyncAnnounced = false;

  const taskMs = (t) => (Number.isFinite(t?.startMs) && Number.isFinite(t?.endMs) ? t.endMs - t.startMs : null);
  // No-progress allowance: while a lip-sync job is in flight, scale it to the (known) video duration.
  const idleLimit = () => {
    let limit = MAX_IDLE_MS;
    for (const t of submitted.values()) {
      if (t.stage !== 'lipsync') continue;
      const ms = taskMs(t);
      limit = Math.max(limit, ms ? ms * LIPSYNC_IDLE_PER_DURATION : LIPSYNC_IDLE_MS);
    }
    return limit;
  };
  const timeUp = () => Date.now() - lastProgressAt >= idleLimit();
  const setResult = (t, r) => {
    const rec = { inputId: t.inputId ?? 0, index: t.index, target: t.target, ...r };
    results.set(taskKey(t), rec);
    try { onResult(rec); } catch { /* state saving must never break scheduling */ }
  };
  const checkpoint = (t, pid) => {
    try { onSubmit({ inputId: t.inputId ?? 0, index: t.index, target: t.target, stage: t.stage ?? 'dub', projectId: pid, parentSeq: t.parentSeq ?? null, lipsync: !!opts.lipsync }); }
    catch { /* state saving must never break scheduling */ }
  };

  // On stop_all, stop new submissions and only finalize in-flight (submitted) ones → exit when empty (pending is preserved).
  while ((submitted.size || (!stopAll && pending.length)) && !timeUp()) {
    let progressed = false;
    let blocked = false; // no free slots (external/prior jobs occupy the queue), so new submissions are impossible

    // ── Submit ── query the queue state and push only as many as there are 'free slots'; if slots free up, add them next round.
    //            (on query failure slots=Infinity = push until VT4292 as before = fallback)
    if (!stopAll && pending.length) {
      const q = await getQueueStatus(spaceSeq);
      let slots = q ? q.available : Infinity;
      if (q) log(`Queue ${q.used}/${q.max} — ${q.available} free slots`);
      const keep = [];
      let rejected = false;
      for (const chunk of pending) {
        if (stopAll || rejected || slots <= 0) {
          keep.push(chunk);
          if (slots <= 0 || rejected) blocked = true; // held due to capacity occupancy (distinct from transient-error retry)
          continue;
        }
        try {
          let pid;
          if (chunk.stage === 'lipsync') {
            [pid] = await requestLipSync(chunk.parentSeq, spaceSeq, { speed: opts.speed });
          } else {
            if (chunk.mediaSeq === undefined) {
              let m = mediaByKey.get(mediaKey(chunk));
              if (!m) { m = await upload(toPrepared(chunk), spaceSeq); mediaByKey.set(mediaKey(chunk), m); } // once per chunk (shared across languages)
              chunk.mediaSeq = m.seq;
              chunk.kind = chunk.kind ?? m.kind;
            }
            [pid] = await requestTranslation(spaceSeq, chunk.mediaSeq, { ...opts, target: chunk.target, title: chunk.title ?? opts.title, kind: chunk.kind });
          }
          if (pid == null) throw new Error('no projectId');
          submitted.set(pid, chunk);
          checkpoint(chunk, pid); // persisted before any result — a killed process must not lose a paid submission
          progressed = true;
          slots -= 1;
          if (chunk.stage === 'lipsync') {
            if (!lipsyncAnnounced) { lipsyncAnnounced = true; notify('Lip-sync generation started — this takes considerably longer than dubbing; progress updates will follow.'); }
            log(`[Input ${chunk.inputId + 1}] segment ${chunk.index + 1}(${chunk.target}) lip-sync submitted`);
          } else {
            log(`[Input ${chunk.inputId + 1}] segment ${chunk.index + 1}(${chunk.target}) submitted`);
          }
        } catch (e) {
          const code = e instanceof PersoApiError ? e.code : null;
          if (isCreditError(e)) {
            stopAll = true; stopReason = 'credit'; keep.push(chunk);
            log('Usage (credit) shortage — halting new submissions, finishing only in-flight work');
          } else if (QUEUE_FULL_CODES.has(code)) {
            rejected = true; blocked = true; keep.push(chunk); // leave in-flight untouched, stop only this round's new submissions
            log('Queue full — waiting for a free slot, then retrying');
          } else if (code === 'F4008') {
            // local inputs are usually pre-split by resolveChunks → reaching here means an unsplittable case such as external
            setResult(chunk, { status: 'HARD_FAIL', reason: 'too_long' });
            log(`[Input ${chunk.inputId + 1}] segment ${chunk.index + 1} cannot be processed (length)`);
          } else if (chunk.retries < MAX_RETRY) {
            chunk.retries++; keep.push(chunk);
            log(`[Input ${chunk.inputId + 1}] segment ${chunk.index + 1} retrying`);
          } else {
            setResult(chunk, { status: 'HARD_FAIL', reason: 'submit_failed' });
            log(`[Input ${chunk.inputId + 1}] segment ${chunk.index + 1} processing failed`);
          }
        }
      }
      pending.length = 0;
      pending.push(...keep);
    }

    // ── Polling ──
    if (submitted.size) {
      await sleep(POLL_INTERVAL_MS);
      for (const [pid, chunk] of [...submitted]) {
        if (!submitted.has(pid)) continue; // already handled this round (e.g. via sibling cancel) → prevent double processing
        if (chunk.stage === 'lipsync' && Date.now() < (chunk._nextPollAt ?? 0)) continue; // long-running → poll on a relaxed cadence
        let st = null;
        try { st = await getStatus(pid, spaceSeq); } catch { /* transient error → next round */ }
        if (chunk.stage === 'lipsync') chunk._nextPollAt = Date.now() + LIPSYNC_POLL_INTERVAL_MS;
        if (!st || st.state === 'processing') {
          // if the server is raising the progress %, treat it as 'progress' and reset the no-progress timer (don't kill slow long videos).
          if (st && typeof st.progress === 'number' && st.progress > (chunk._progress ?? -1)) {
            chunk._progress = st.progress;
            progressed = true;
          }
          continue;
        }

        submitted.delete(pid);
        progressed = true;
        const tag = `[Input ${chunk.inputId + 1}] segment ${chunk.index + 1}(${chunk.target})`;

        if (chunk.stage === 'lipsync') {
          // Lip-sync outcome. Never re-submit (a repeat request generates & bills again) — on failure fall back to the dubbed video.
          if (st.state === 'complete') {
            const out = join(outDir, `lip_${chunk.inputId}_${String(chunk.index).padStart(3, '0')}_${chunk.target}.mp4`);
            try {
              const dl = await download(pid, spaceSeq, { lipsync: true, outPath: out });
              setResult(chunk, { status: 'OK', projectId: pid, dubProjectId: chunk.parentSeq, lipsync: true, path: out, name: dl.fileName });
              log(`${tag} lip-sync done`);
            } catch {
              setResult(chunk, { status: 'DLFAIL', projectId: pid, dubProjectId: chunk.parentSeq, lipsync: true, reason: 'download_failed' });
              log(`${tag} lip-sync generated (download failed → re-download on resume)`);
            }
          } else {
            log(`${tag} lip-sync failed${st.message ? ` (${st.message})` : ''} — falling back to the dubbed video`);
            const out = join(outDir, `dub_${chunk.inputId}_${String(chunk.index).padStart(3, '0')}_${chunk.target}.mp4`);
            try {
              const dl = await download(chunk.parentSeq, spaceSeq, { kind: chunk.kind, outPath: out });
              setResult(chunk, { status: 'OK', projectId: chunk.parentSeq, lipsyncFailed: true, reason: st.message ?? 'lipsync_failed', path: out, name: dl.fileName });
            } catch {
              setResult(chunk, { status: 'DLFAIL', projectId: chunk.parentSeq, lipsyncFailed: true, reason: 'download_failed' });
            }
          }
          continue;
        }

        if (st.state === 'complete') {
          // Chain: with opts.lipsync, a dubbed video is not the final deliverable — re-queue as a lip-sync task.
          if (opts.lipsync && chunk.kind !== 'audio') {
            pending.push({ ...chunk, stage: 'lipsync', parentSeq: pid, retries: 0, _progress: undefined });
            log(`${tag} dubbed — queueing lip-sync`);
            continue;
          }
          if (opts.lipsync && chunk.kind === 'audio') log(`${tag} is audio — lip-sync skipped, delivering the dubbed audio`);
          const out = join(outDir, `dub_${chunk.inputId}_${String(chunk.index).padStart(3, '0')}_${chunk.target}.mp4`);
          try {
            const dl = await download(pid, spaceSeq, { kind: chunk.kind, outPath: out });
            setResult(chunk, { status: 'OK', projectId: pid, path: out, name: dl.fileName });
            log(`${tag} done`);
          } catch {
            // generation succeeded (has projectSeq) — only download failed. Don't re-dub; mark it as DLFAIL to
            // preserve projectSeq → re-download on resume (no regeneration).
            setResult(chunk, { status: 'DLFAIL', projectId: pid, reason: 'download_failed' });
            log(`${tag} generated (download failed → re-download on resume)`);
          }
        } else if (st.noVoice) {
          // no voice detected. For a split chunk (has endMs), pass the original through → keep silent segments of a long video and dub·merge the rest.
          // For a single (unsplit whole·external) request, fail it so a result byte-identical to the original is not emitted as 'complete'.
          if (chunk.endMs != null) {
            setResult(chunk, { status: 'PASSTHROUGH', projectId: pid, path: chunk.path, reason: 'no_voice' });
            log(`${tag} passthrough (no voice)`);
          } else {
            setResult(chunk, { status: 'HARD_FAIL', projectId: pid, reason: 'no_voice' });
            log(`${tag} no voice detected — nothing to dub`);
          }
        } else if (st.failureReason === 'ENGINE_ERROR') {
          // engine error (unrecoverable) → fail without retry. The same chunk (same mediaSeq) is identical in any language → cancel siblings.
          engineError = st.message ?? engineError ?? 'engine processing error';
          setResult(chunk, { status: 'HARD_FAIL', projectId: pid, reason: st.message ?? 'engine_error' });
          log(`${tag} cannot be processed (engine error): ${st.message ?? ''}`);
          await cancelSiblings(chunk.inputId, chunk.index, pid);
        } else if (chunk.retries < MAX_RETRY) {
          chunk.retries++; pending.push(chunk); // reuse the upload (mediaSeq) to re-translate
          log(`${tag} retrying`);
        } else {
          setResult(chunk, { status: 'HARD_FAIL', projectId: pid, reason: st.message ?? 'failed' });
          log(`${tag} processing failed`);
        }
      }
    } else if (pending.length && !stopAll) {
      if (blocked) {
        // no free slots (external/prior jobs occupy the queue) + no in-flight of ours either: pure waiting.
        // reset the no-progress timer (don't time out while waiting on external jobs) and re-check after 5 minutes.
        lastProgressAt = Date.now();
        log('No free slot in the queue, waiting — re-checking in 5 minutes');
        await sleep(QUEUE_WAIT_MS);
      } else {
        // nothing in-flight but unable to submit (transient error · persistent VT5034) → retry after exponential backoff
        await sleep(backoff);
        backoff = Math.min(backoff * 2, BACKOFF_MAX_MS);
      }
    }

    if (progressed) { backoff = BACKOFF_BASE_MS; lastProgressAt = Date.now(); } // on progress, reset backoff/no-progress timer
  }

  // Credit stop with lip-sync still owed: the dubbing is already paid for — save the dubbed videos now
  // and leave only the lip-sync step to resume (no re-dub charge).
  if (stopAll && stopReason === 'credit') {
    for (let i = pending.length - 1; i >= 0; i--) {
      const c = pending[i];
      if (c.stage !== 'lipsync') continue;
      pending.splice(i, 1);
      const out = join(outDir, `dub_${c.inputId}_${String(c.index).padStart(3, '0')}_${c.target}.mp4`);
      try {
        const dl = await download(c.parentSeq, spaceSeq, { kind: c.kind, outPath: out });
        setResult(c, { status: 'OK', projectId: c.parentSeq, lipsyncPending: true, path: out, name: dl.fileName });
        log(`[Input ${c.inputId + 1}] segment ${c.index + 1}(${c.target}) dubbed video saved — lip-sync will run on resume`);
      } catch {
        setResult(c, { status: 'DLFAIL', projectId: c.parentSeq, lipsyncPending: true, reason: 'download_failed' });
      }
    }
  }

  if (timeUp()) failRemaining('elapsed_exceeded');

  return {
    results,
    outDir,
    stopped: stopAll,
    stopReason,
    engineError,
    pendingLeft: pending.map(({ retries, mediaSeq, _progress, _nextPollAt, ...c }) => c), // preserved on stop_all (for resume). mediaSeq removed → re-upload.
  };

  function failRemaining(reason) {
    for (const c of pending) if (!results.has(taskKey(c))) {
      // A pending lip-sync task still has a completed dubbing behind it — keep that seq so resume only re-runs lip-sync.
      if (c.stage === 'lipsync') setResult(c, { status: 'DLFAIL', projectId: c.parentSeq, lipsyncPending: true, reason });
      else setResult(c, { status: 'HARD_FAIL', reason });
    }
    // In-flight projects may still finish server-side (credits already spent) → keep the projectSeq as DLFAIL
    // so resume re-downloads the result instead of re-dubbing (no double billing). A confirmed server-side
    // failure is converted back to a re-dub by the resume flow.
    for (const [pid, c] of submitted) if (!results.has(taskKey(c))) {
      if (c.stage === 'lipsync') setResult(c, { status: 'DLFAIL', projectId: pid, dubProjectId: c.parentSeq, lipsync: true, reason });
      else setResult(c, { status: 'DLFAIL', projectId: pid, reason });
    }
    submitted.clear();
    pending.length = 0;
  }

  // a chunk with an engine error yields the same result in any language → cancel in-flight siblings (same input·chunk, other languages) + drop pending ones.
  // Lip-sync siblings are left alone: their dubbing already succeeded, so the media itself is fine.
  async function cancelSiblings(inputId, index, exceptPid) {
    for (const [pid2, t] of [...submitted]) {
      if (t.stage === 'lipsync') continue;
      if (t.inputId === inputId && t.index === index && pid2 !== exceptPid) {
        await cancel(pid2, spaceSeq);
        submitted.delete(pid2);
        setResult(t, { status: 'HARD_FAIL', projectId: pid2, reason: 'engine_error' });
        log(`[Input ${t.inputId + 1}] segment ${t.index + 1}(${t.target}) canceled (same chunk engine error)`);
      }
    }
    for (let i = pending.length - 1; i >= 0; i--) {
      if (pending[i].stage === 'lipsync') continue;
      if (pending[i].inputId === inputId && pending[i].index === index) {
        setResult(pending[i], { status: 'HARD_FAIL', reason: 'engine_error' });
        pending.splice(i, 1);
      }
    }
  }
}

function toPrepared(chunk) {
  if (chunk.source === 'external') return { source: 'external', sourceUrl: chunk.sourceUrl };
  return { source: 'local', localPath: chunk.path, originalName: chunk.originalName ?? basename(chunk.path) };
}
