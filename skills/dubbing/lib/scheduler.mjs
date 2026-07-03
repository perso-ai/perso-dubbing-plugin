// Scheduler (C/Q concurrency). Pools (chunk × language) from multiple inputs into one queue for concurrent processing.
//   Result: `${inputId}|${index}|${target}` → { inputId, index, target, status, path?, projectId?, name?, reason? }
//   - OK          : path of the dubbing result downloaded locally
//   - PASSTHROUGH : silent (split chunk) → original chunk path as-is (merge included)
//   - DLFAIL      : generated (has projectSeq) · only download failed → re-download on resume (no regeneration)
//   - HARD_FAIL   : excluded from merge (group boundary)
import { basename, join } from 'node:path';
import { makeTempDir } from './tmp.mjs';
import { upload, requestTranslation, getStatus, download, getQueueStatus, cancel } from './api_adapter.mjs';
import { PersoApiError } from './http_client.mjs';
import {
  BACKOFF_BASE_MS, BACKOFF_MAX_MS, POLL_INTERVAL_MS,
  MAX_IDLE_MS, MAX_RETRY, QUEUE_WAIT_MS,
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
  const onResult = hooks.onResult ?? (() => {}); // fired per confirmed result — lets the caller persist resume state incrementally
  const outDir = await makeTempDir('dubbing-out-');

  // Unit of work = (input × chunk × language). Expand every chunk of every input per language to fill one queue.
  const targets = opts.targets ?? [opts.target ?? 'en'];
  const skip = opts.done instanceof Set ? opts.done : new Set(); // resume: already-completed (inputId|index|target) are not submitted
  const taskKey = (t) => `${t.inputId ?? 0}|${t.index}|${t.target}`;
  const mediaKey = (t) => `${t.inputId ?? 0}|${t.index}`;

  const pending = [];
  for (const c of chunks) for (const target of targets) {
    const t = { ...c, inputId: c.inputId ?? 0, path: c.path ?? c.localPath, target, retries: 0 };
    if (!skip.has(taskKey(t))) pending.push(t);
  }
  const submitted = new Map(); // projectId → task (input × chunk × language)
  const results = new Map(); // taskKey → result
  const mediaByKey = new Map(); // `${inputId}|${index}` → {seq, kind}: uploaded once per chunk, shared across languages
  let stopAll = false;
  let stopReason = null;
  let engineError = null; // unrecoverable engine error message (for reporting upward)
  let backoff = BACKOFF_BASE_MS;
  let lastProgressAt = Date.now(); // time of last progress. Guards on 'no progress' rather than absolute elapsed time.

  const timeUp = () => Date.now() - lastProgressAt >= MAX_IDLE_MS;
  const setResult = (t, r) => {
    const rec = { inputId: t.inputId ?? 0, index: t.index, target: t.target, ...r };
    results.set(taskKey(t), rec);
    try { onResult(rec); } catch { /* state saving must never break scheduling */ }
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
          if (chunk.mediaSeq === undefined) {
            let m = mediaByKey.get(mediaKey(chunk));
            if (!m) { m = await upload(toPrepared(chunk), spaceSeq); mediaByKey.set(mediaKey(chunk), m); } // once per chunk (shared across languages)
            chunk.mediaSeq = m.seq;
            chunk.kind = chunk.kind ?? m.kind;
          }
          const [pid] = await requestTranslation(spaceSeq, chunk.mediaSeq, { ...opts, target: chunk.target, title: chunk.title ?? opts.title, kind: chunk.kind });
          if (pid == null) throw new Error('no projectId');
          submitted.set(pid, chunk);
          progressed = true;
          slots -= 1;
          log(`[Input ${chunk.inputId + 1}] segment ${chunk.index + 1}(${chunk.target}) submitted`);
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
        let st = null;
        try { st = await getStatus(pid, spaceSeq); } catch { /* transient error → next round */ }
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
        if (st.state === 'complete') {
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

  if (timeUp()) failRemaining('elapsed_exceeded');

  return {
    results,
    outDir,
    stopped: stopAll,
    stopReason,
    engineError,
    pendingLeft: pending.map(({ retries, mediaSeq, _progress, ...c }) => c), // preserved on stop_all (for resume). mediaSeq removed → re-upload.
  };

  function failRemaining(reason) {
    for (const c of pending) if (!results.has(taskKey(c))) setResult(c, { status: 'HARD_FAIL', reason });
    // In-flight projects may still finish server-side (credits already spent) → keep the projectSeq as DLFAIL
    // so resume re-downloads the result instead of re-dubbing (no double billing). A confirmed server-side
    // failure is converted back to a re-dub by the resume flow.
    for (const [pid, c] of submitted) if (!results.has(taskKey(c))) setResult(c, { status: 'DLFAIL', projectId: pid, reason });
    submitted.clear();
    pending.length = 0;
  }

  // a chunk with an engine error yields the same result in any language → cancel in-flight siblings (same input·chunk, other languages) + drop pending ones.
  async function cancelSiblings(inputId, index, exceptPid) {
    for (const [pid2, t] of [...submitted]) {
      if (t.inputId === inputId && t.index === index && pid2 !== exceptPid) {
        await cancel(pid2, spaceSeq);
        submitted.delete(pid2);
        setResult(t, { status: 'HARD_FAIL', projectId: pid2, reason: 'engine_error' });
        log(`[Input ${t.inputId + 1}] segment ${t.index + 1}(${t.target}) canceled (same chunk engine error)`);
      }
    }
    for (let i = pending.length - 1; i >= 0; i--) {
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
