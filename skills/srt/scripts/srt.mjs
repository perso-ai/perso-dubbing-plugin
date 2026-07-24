#!/usr/bin/env node
// /srt entry worker: extract the source-language subtitles (SRT) of each input via Perso AI STT.
//   key gate → input(s) → upload once per input → ONE STT project per input (languages share it) →
//   download the original SRT → print one [srt-original] mapping line per input carrying the target list.
//   Translation is NOT done here: the calling agent translates the one original SRT into every language
//   in its `langs` list and saves {stem}_{lang}_Subtitle.srt per language (see ../SKILL.md).
//   usage: node scripts/srt.mjs "<local|URL|folder>" ["<another input>" ...] [--target en,ja] [--space "space name"] [--out folder] [--recursive]
//          node scripts/srt.mjs --resume "<state-file>"
// Shares the dubbing skill's libraries via the sibling folder (../../dubbing) — both skills always install together.
import { writeFileSync, readFileSync, mkdirSync, readdirSync, unlinkSync, renameSync, realpathSync, existsSync } from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preloadKeyEnv } from '../../dubbing/scripts/resolve_key.mjs';
import { ExitCode, UsageError, friendlyError, errorClass, ensureKey, ensureSpace } from '../../dubbing/lib/gates.mjs';
import { expandInputs, prepareInput } from '../../dubbing/lib/input.mjs';
import { getPlanStatus, spacePlanProps } from '../../dubbing/lib/space.mjs';
import { upload, requestStt, downloadAudioScript, getStatus } from '../../dubbing/lib/api_adapter.mjs';
import { probe } from '../../dubbing/lib/ffmpeg.mjs';
import { messages } from '../../dubbing/lib/messages.mjs';
import { checkForUpdate } from '../../dubbing/lib/update_check.mjs';
import { track, initTelemetry, setTelemetrySpace, primeTelemetrySpace, setAgentHost } from '../../dubbing/lib/telemetry.mjs';
import { makeStatusTicker, statusIntervalMs } from '../../dubbing/lib/status.mjs';
import { cleanupTempDirs } from '../../dubbing/lib/tmp.mjs';
import { POLL_INTERVAL_MS, MAX_IDLE_MS } from '../../dubbing/lib/config.mjs';

const log = (m) => console.error('  ' + m); // background verbose log (stderr)
// Milestones exposed to the user (stdout). The agent relays these [progress] lines to chat per the SKILL rules.
const notify = (m) => console.log(`[progress] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const labelOf = (inp) => inp?.originalName ?? inp?.sourceUrl ?? 'input';
const refOf = (inp) => (inp.source === 'local'
  ? { source: 'local', localPath: inp.localPath, originalName: inp.originalName }
  : { source: inp.source, sourceUrl: inp.sourceUrl, originalName: inp.originalName ?? null });
// Notice text for skipping an unsupported format (append the reason if present).
const skipMsg = (name, e) => `Skipped (unsupported format): ${name}${e?.cause?.message ? ` (${e.cause.message})` : ''}`;

const USAGE = [
  'Usage: node scripts/srt.mjs "<file|folder|URL>" ["<another input>" ...] [--target en,ja] [--space "space name"] [--out folder] [--recursive]',
  '       node scripts/srt.mjs "<file|folder|URL>" ["<another input>" ...] --transcribe-only [--space "space name"] [--out folder] [--recursive]',
  '       node scripts/srt.mjs --resume "<state-file>"',
  '       node scripts/srt.mjs --check "<translated.srt>" --source "<original.srt>"',
  '       node scripts/srt.mjs --retime "<translated.srt>"',
  '',
  '  --target     comma-separated language codes the subtitles will be translated into (default: en).',
  '               One subtitle project is created per input; every target shares its original SRT.',
  '  --transcribe-only  no translation — the original-language subtitles are the final result',
  '               (cannot be combined with --target)',
  '  --space      workspace name to run in (otherwise asked via the [space-select] flow)',
  '  --out        folder that collects the extracted .srt files (default: next to each source)',
  '  --recursive  when an input is a folder, include its subfolders',
  '  --resume     continue an interrupted run from its state file (already-submitted work is not billed again)',
  '  --check      offline QA of a translated SRT against its source: cue/timestamp integrity, line',
  '               layout (max 2 lines × 42 chars, 20 for CJK) and reading speed. No key, no billing.',
  '  --source     the original SRT the translation must stay aligned with (required by --check)',
  '  --retime     offline readability pass: extends too-fast cues into following gaps and merges short',
  '               neighbours (Netflix-style), rewriting the file in place. No key, no billing.',
].join('\n');

// Sentinel "language" for --transcribe-only runs. parseTargets can never produce it (codes are 2-3
// letters), so it cannot collide with a real target; it flows through the manifest keys unchanged.
const TRANSCRIBE = 'original';

function parseArgs(argv) {
  const a = { target: 'en', inputs: [] };
  const VALUE_FLAGS = { '--resume': 'resume', '--target': 'target', '--space': 'space', '--out': 'out', '--check': 'check', '--source': 'source', '--retime': 'retime', '--host': 'host' };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--help' || t === '-h') a.help = true;
    else if (t === '--recursive') a.recursive = true;
    else if (t === '--transcribe-only') a.transcribeOnly = true;
    else if (t in VALUE_FLAGS) {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`Missing value for ${t}`);
      a[VALUE_FLAGS[t]] = v;
      if (t === '--target') a.targetSet = true;
    } else if (t.startsWith('--')) {
      throw new UsageError(`Unknown option: ${t}`); // typos must not be swallowed as input paths
    } else a.inputs.push(t); // positional args (multiple): URL/path/folder may be mixed
  }
  if (a.transcribeOnly && a.targetSet) {
    throw new UsageError('--transcribe-only cannot be combined with --target (it skips translation and delivers the original-language subtitles).');
  }
  if (a.check && !a.source) throw new UsageError('--check needs --source "<original.srt>" to compare against.');
  if (a.source && !a.check) throw new UsageError('--source only makes sense together with --check.');
  if ((a.check || a.retime) && (a.inputs.length || a.targetSet || a.transcribeOnly || a.resume)) {
    throw new UsageError('--check/--retime are offline QA commands — run them on their own, without inputs or other modes.');
  }
  return a;
}

// Language tokens only drive the translation list handed to the agent (which does the translating),
// so validate the shape rather than membership in the dubbing language list.
function parseTargets(raw) {
  const list = String(raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!list.length) throw new UsageError('No target language — pass --target with one or more codes (e.g. --target en,ja).');
  const seen = new Set();
  const out = [];
  for (const t of list) {
    if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(t)) {
      throw new UsageError(`"${t}" does not look like a language code (examples: en, ja, pt-BR).`);
    }
    const k = t.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(t); }
  }
  return out;
}

// Save directory (non-volatile): next to the local original; current folder for URL/external/unknown.
function inputSaveDir(inp) {
  if (inp?.source === 'local' && inp.localPath) return dirname(inp.localPath);
  return process.cwd();
}

// If the output filename is already taken, append a _2,_3… suffix before the extension to avoid collisions (also registering it into used).
function uniqueName(fname, used) {
  if (!used.has(fname)) { used.add(fname); return fname; }
  const dot = fname.lastIndexOf('.');
  const stem = dot > 0 ? fname.slice(0, dot) : fname;
  const ext = dot > 0 ? fname.slice(dot) : '';
  let n = 2, cand;
  do { cand = `${stem}_${n}${ext}`; n++; } while (used.has(cand));
  used.add(cand);
  return cand;
}
// Track the set of in-use names per directory (existing files + this run) to avoid collisions.
function reserve(dir, name, usedByDir) {
  let s = usedByDir.get(dir);
  if (!s) { let init = []; try { init = readdirSync(dir); } catch { /* new folder */ } s = new Set(init); usedByDir.set(dir, s); }
  return uniqueName(name, s);
}

// Resume state-file location — mirrors the dubbing worker's placement rules with its own suffix
// so the two workers' resume guards never cross. --out is always a folder for this worker.
function statePath({ out, inputs }) {
  if (out) return join(out, '.srtresume.json');
  const only = inputs.length === 1 ? inputs[0] : null;
  if (only?.source === 'local' && only.localPath) return only.localPath + '.srtresume.json';
  return join(process.cwd(), 'srt-resume.json');
}

// A state file at the target path means an earlier run for this input never finished (it is deleted on
// success). Starting fresh would overwrite it and re-bill work the server already completed, so stop before
// any network/billing and hand the choice to the user (a normal "ask the user" pause, exit 0 — the
// [resume-check] lines say what to ask; a non-zero exit would misread as a failure).
function guardExistingState(file) {
  if (!existsSync(file)) return;
  console.log(`[resume-check] An earlier run for this input did not finish — its state file still exists: ${file}`);
  console.log('[resume-check] To finish it without paying again for the completed parts, run:');
  console.log(`[resume-check]   node scripts/srt.mjs --resume "${file}"`);
  console.log('[resume-check] To discard it and start over instead (completed parts will be billed again), delete that state file and re-run this command.');
  throw new ExitCode(0);
}

// Manifest v2 kind 'stt': one STT project per input (all target languages share it) + per-input
// checkpoints keyed by inputId. v1 (≤0.7.0) keyed done by `${inputId}|${lang}` with one project per
// pair — migrated on resume, never written anymore.
function buildManifest(ctx, perInput, done) {
  return {
    version: 2, kind: 'stt', spaceSeq: ctx.spaceSeq, out: ctx.out ?? null, targets: ctx.targets,
    stopReason: ctx.stopReason ?? null, // why the previous run stopped ('quota') → resume telemetry
    inputs: perInput.map((p) => ({ inputId: p.inputId, ref: p.ref, mediaSeq: p.mediaSeq ?? null, kind: p.kind ?? null, durationSec: p.durationSec ?? null })),
    done, // `${inputId}` → { status:'RUN'|'OK'|'HARD_FAIL', projectId?, savedPath?, reason? }
  };
}
// Collapse a v1 per-pair `done` map to per-input entries. Every pair of an input held the same
// original-language content, so the best entry wins (OK > RUN > HARD_FAIL) — an already-paid
// project is reused and nothing is resubmitted.
function migrateDoneV1(done = {}) {
  const rank = { OK: 3, RUN: 2, HARD_FAIL: 1 };
  const out = {};
  for (const [k, v] of Object.entries(done)) {
    const id = k.split('|')[0];
    if ((rank[v?.status] ?? 0) > (rank[out[id]?.status] ?? 0)) out[id] = v;
  }
  return out;
}
function sttSaver(ctx, perInput, prevDone = {}) {
  const done = { ...prevDone };
  const writeNow = () => {
    try {
      mkdirSync(dirname(ctx.file), { recursive: true });
      const tmp = ctx.file + '.tmp';
      writeFileSync(tmp, JSON.stringify(buildManifest(ctx, perInput, done)), 'utf8');
      renameSync(tmp, ctx.file);
    } catch { /* best-effort — saving state must never break the run */ }
  };
  return {
    writeNow, done,
    // The paid projectId is persisted the moment it exists → a hard kill can't cause a re-submission on resume.
    onSubmit: (inputId, projectId) => { done[inputId] = { status: 'RUN', projectId }; writeNow(); },
    onComplete: (inputId, projectId, savedPath) => { done[inputId] = { status: 'OK', projectId, savedPath }; writeNow(); },
    onFail: (inputId, reason) => { done[inputId] = { status: 'HARD_FAIL', reason }; writeNow(); },
  };
}

// Get a usable prepared-input object for uploading: the fresh-run object as-is; on resume re-prepare
// from the recorded ref (re-stat the local file / re-download the URL).
async function materialize(pin) {
  const cur = pin.inp;
  if (cur?.source === 'external') return cur;
  if (cur?.localPath && existsSync(cur.localPath)) return cur;
  const inputStr = pin.ref.source === 'local' ? pin.ref.localPath : pin.ref.sourceUrl;
  const prepared = await prepareInput(inputStr);
  pin.inp = prepared;
  return prepared;
}

// Upload once per input; every language of that input reuses the same mediaSeq (billing is per STT project).
// A pre-pass upload failure is remembered on the input and re-thrown here, so the caller's error handling
// sees it exactly once and the same file is never uploaded twice.
async function ensureMedia(pin, spaceSeq, saver, { forceReupload = false } = {}) {
  if (pin.uploadError) throw pin.uploadError;
  if (pin.mediaSeq != null && !forceReupload) return;
  const prepared = await materialize(pin);
  const { seq, kind, durationSec } = await upload(prepared, spaceSeq);
  pin.mediaSeq = seq;
  pin.kind = kind;
  if (durationSec != null) pin.durationSec = durationSec; // server-measured length (register response)
  saver.writeNow(); // persist the mediaSeq (and duration) so resume reuses the finished upload
}

// Poll a project until it settles. Progress changes reset the idle window; a stuck job times out.
// onPoll fires each poll (the [status] heartbeat) — its own failures must never break the wait.
async function waitForProject(projectSeq, spaceSeq, onPoll) {
  let last = -1;
  let lastChange = Date.now();
  for (;;) {
    let st = null;
    try { st = await getStatus(projectSeq, spaceSeq); } catch { /* transient — keep polling */ }
    if (st?.state === 'complete' || st?.state === 'failed') return st;
    const p = st?.progress ?? -1;
    if (p !== last) { last = p; lastChange = Date.now(); if (p > 0) log(`transcribing... ${p}%`); }
    if (Date.now() - lastChange > MAX_IDLE_MS) return { state: 'failed', timedOut: true, message: 'timed out (no progress)' };
    try { onPoll?.(); } catch { /* heartbeat must never break the wait */ }
    await sleep(POLL_INTERVAL_MS);
  }
}

// Upload/register rejections for media over the plan's limits. No auto-split here (unlike dubbing) —
// the user is asked to shorten/split the file themselves or upgrade.
const isOverLimit = (e) => e?.name === 'PersoApiError' && (e.code === 'F4008' || e.code === 'F4004');
function overLimitMsg(e) {
  if (e.code === 'F4008') {
    const lim = Number(e.data?.maxLengthMs);
    const min = Number.isFinite(lim) ? `${Math.max(1, Math.round(lim / 60000))} min` : 'the plan limit';
    return `the media is longer than this plan allows (${min}). Split it into shorter parts yourself, or upgrade the plan, and try again.`;
  }
  return 'the file is larger than the upload limit (2 GB). Split or compress it yourself and try again.';
}

// One [srt-original] line per finished input — the agent translates the file at `path` into every
// language in `langs` (null on a --transcribe-only run: deliver the file as-is).
function emitMapping(inp, langs, savedPath, seq) {
  // `seq` is the STT projectSeq → the agent can build a project link on demand: …/vt/stt/<seq> (see SKILL.md).
  console.log('[srt-original] ' + JSON.stringify({ input: labelOf(inp), langs, path: resolve(savedPath), ...(seq != null ? { seq } : {}) }));
}

// Per input: submit ONE STT project (checkpointed) → wait → download the original SRT → report. All
// target languages share that single project (the agent translates the one file). Shared by run + resume.
// Returns true when some paid part is still owed (undelivered) → the caller must keep the state file for resume.
async function sttProcess(perInput, ctx, saver, isResume) {
  const { spaceSeq, targets, out } = ctx;
  const transcribeOnly = targets.length === 1 && targets[0] === TRANSCRIBE;
  const langs = transcribeOnly ? null : targets; // translation list carried on every mapping line
  const usedByDir = new Map();
  let ok = 0, fail = 0, noVoice = 0; // per input (one STT project each)
  const flags = { pending: false };
  const total = perInput.length;
  const allDur = perInput.map((p) => p.durationSec).filter((d) => d != null);
  const ticker = makeStatusTicker(statusIntervalMs(allDur.length ? allDur.reduce((a, b) => a + b, 0) : null));
  const streamDone = (msg) => notify(total > 1 ? `${msg} (${ok + fail + 1}/${total})` : msg); // stream each input as it settles — don't buffer to the end
  // Completed-funnel event — also fired on a quota stop (partial counts), like dubbing_completed.
  const trackCompleted = async () => {
    const knownDur = perInput.map((p) => p.durationSec).filter((d) => d != null);
    track('stt_completed', {
      ...await spacePlanProps(spaceSeq),
      input_count: perInput.length,
      lang_count: transcribeOnly ? null : targets.length,
      ok_count: ok, fail_count: fail, no_voice_count: noVoice,
      target_langs: transcribeOnly ? null : targets.join(','),
      transcribe_only: transcribeOnly,
      duration_sec: knownDur.length ? knownDur.reduce((a, b) => a + b, 0) : null,
      is_resume: isResume,
      recovered: !!isResume && ctx.resumedFrom === 'quota' && ok > 0,
    });
  };
  for (const pin of perInput) {
    const name = labelOf(pin.inp ?? pin.ref);
    try {
      const prev = saver.done[pin.inputId];
      if (prev?.status === 'HARD_FAIL') { streamDone(`Could not extract: ${name} — ${prev.reason ?? 'failed'}`); fail++; continue; }
      if (prev?.status === 'OK' && prev.savedPath && existsSync(prev.savedPath)) {
        emitMapping(pin.inp ?? pin.ref, langs, prev.savedPath, prev.projectId); // re-print so the agent gets the full mapping on resume
        streamDone(`Subtitle ready: ${name} → ${basename(prev.savedPath)}`); ok++;
        continue;
      }
      let projectId = prev?.projectId ?? null;
      if (projectId == null) { // never submitted → upload and submit
        await ensureMedia(pin, spaceSeq, saver);
        try {
          ([projectId] = await requestStt(spaceSeq, pin.mediaSeq, { title: name, kind: pin.kind ?? 'video' }));
        } catch (e) {
          // A mediaSeq recorded in the state file may have expired server-side — re-upload once and retry.
          if (e?.httpStatus === 402 || !isResume) throw e;
          await ensureMedia(pin, spaceSeq, saver, { forceReupload: true });
          ([projectId] = await requestStt(spaceSeq, pin.mediaSeq, { title: name, kind: pin.kind ?? 'video' }));
        }
        if (projectId == null) throw new Error('The subtitle request was not accepted.');
        saver.onSubmit(pin.inputId, projectId); // checkpoint the billed unit before any wait
        log(`${name}: subtitle project submitted`);
      }
      const st = await waitForProject(projectId, spaceSeq, () => ticker.tick(() => `subtitles ${ok + fail}/${total}`));
      if (st.state !== 'complete') {
        if (st.timedOut) { flags.pending = true; streamDone(`Could not extract: ${name} — ${st.message}`); fail++; continue; } // may still be running (paid) → keep the RUN checkpoint so resume re-polls it
        if (st.noVoice) noVoice++;
        const reason = st.noVoice ? 'no voice detected in the source' : (st.message ?? st.failureReason ?? 'failed');
        saver.onFail(pin.inputId, reason); // genuine server failure → terminal (no automatic retry)
        streamDone(`Could not extract: ${name} — ${reason}`); fail++;
        continue;
      }
      const dir = out ?? inputSaveDir(pin.inp?.localPath ? pin.inp : pin.ref);
      mkdirSync(dir, { recursive: true });
      const saved = await downloadAudioScript(projectId, spaceSeq, (serverName) => join(dir, reserve(dir, serverName, usedByDir)));
      saver.onComplete(pin.inputId, projectId, saved.path);
      emitMapping(pin.inp ?? pin.ref, langs, saved.path, projectId);
      streamDone(`Subtitle ready: ${name} → ${basename(saved.path)}`); ok++;
    } catch (e) {
      if (e?.httpStatus === 402) { // out of credits — finished inputs already streamed above → just the top-up/resume path
        ctx.stopReason = 'quota'; // recorded in the state file → resume telemetry reports why
        saver.writeNow();
        const plan = await getPlanStatus(spaceSeq);
        const settled = Object.values(saver.done).filter((d) => d.status === 'OK' || d.status === 'HARD_FAIL').length;
        track('quota_exceeded', { ...await spacePlanProps(spaceSeq), remaining_inputs: Math.max(0, perInput.length - settled) });
        await trackCompleted();
        console.log(messages.quotaExceeded({
          planTier: plan?.planTier, remainingQuota: plan?.remainingQuota,
          resumeHint: `node scripts/srt.mjs --resume "${ctx.file}"`,
          billingScript: '../dubbing/scripts/billing.mjs',
        }));
        throw new ExitCode(0); // credits ran out but finished work was delivered + resume is available — a recoverable stop, not a failure (matches dubbing)
      }
      if (e?.name === 'UnsupportedMediaError') { notify(skipMsg(name, e)); continue; }
      if (isOverLimit(e)) {
        // The register rejected this media, so there is no server-measured duration — best-effort
        // local probe for telemetry only (null when ffprobe is unavailable).
        let durSec = pin.durationSec ?? null;
        if (durSec == null && pin.inp?.localPath) {
          const ms = (await probe(pin.inp.localPath).catch(() => ({}))).durationMs;
          durSec = Number.isFinite(ms) && ms > 0 ? Math.round(ms / 1000) : null;
        }
        track('stt_over_limit', {
          reason: e.code === 'F4008' ? 'length' : 'size',
          limit_min: Number(e.data?.maxLengthMs) > 0 ? Math.round(Number(e.data.maxLengthMs) / 60000) : null,
          duration_sec: durSec,
        });
        streamDone(`Could not extract: ${name} — ${overLimitMsg(e)}`); fail++;
        continue;
      }
      flags.pending = true; // errored after some languages may have been billed → keep state so resume finishes them
      streamDone(`Could not extract: ${name} — ${friendlyError(e)}`); fail++;
    }
  }
  if (perInput.length > 1) console.log(`\nSummary: ${ok} done · ${fail} failed`);
  if (ok) {
    console.log(transcribeOnly
      ? '\nNext: this was a transcription-only run — hand the [srt-original] files to the user as they are (no translation step).'
      : '\nNext: translate each [srt-original] file into every language in its "langs" list and save one <stem>_<lang>_Subtitle.srt per language next to the original, where <stem> is the input file name without its extension (keep cue numbers, timestamps, and cue count unchanged — see SKILL.md).');
  }
  await trackCompleted();
  return flags.pending;
}

// Drop the state file only when nothing paid is still owed; otherwise keep it and point at --resume (no re-billing).
function finishState(file, pending) {
  if (pending) { notify(`Some parts still need finishing — resume with: node scripts/srt.mjs --resume "${file}"`); return; }
  try { if (existsSync(file)) unlinkSync(file); } catch { /* ignore */ }
}

async function runStt(args) {
  await ensureKey();
  const targets = args.transcribeOnly ? [TRANSCRIBE] : parseTargets(args.target);
  const inputs = await expandInputs(args.inputs, { recursive: args.recursive });
  if (!inputs.length) { notify('No inputs to process.'); return; }
  const file = statePath({ out: args.out, inputs });
  guardExistingState(file); // block re-running the original; --resume continues without re-billing submitted parts
  const spaceSeq = await ensureSpace(args);
  const ctx = { spaceSeq, out: args.out ?? null, targets, file };
  const perInput = inputs.map((inp, id) => ({ inputId: id, inp, ref: refOf(inp), mediaSeq: null, kind: null }));
  const saver = sttSaver(ctx, perInput);
  saver.writeNow(); // persist the plan before any submission
  notify(args.transcribeOnly ? 'Extracting the original-language subtitles' : `Extracting subtitles for ${targets.join(', ')}`);
  // Upload everything up-front (the upload itself doesn't bill — project creation does): the register
  // response carries each input's server-measured duration for stt_submitted. A failed upload is
  // remembered on the input and surfaced by sttProcess with its normal handling.
  for (const pin of perInput) {
    try {
      log(`${labelOf(pin.inp ?? pin.ref)}: uploading... (large files take a while)`);
      await ensureMedia(pin, spaceSeq, saver);
    } catch (e) { pin.uploadError = e; }
  }
  const knownDur = perInput.map((p) => p.durationSec).filter((d) => d != null);
  track('stt_submitted', {
    ...await spacePlanProps(spaceSeq),
    input_count: perInput.length, // = billed STT projects (one per input; languages share it)
    lang_count: args.transcribeOnly ? null : targets.length,
    transcribe_only: !!args.transcribeOnly,
    duration_sec: knownDur.length ? knownDur.reduce((a, b) => a + b, 0) : null,
    input_durations_sec: knownDur.length ? knownDur : null,
  });
  const pending = await sttProcess(perInput, ctx, saver, false);
  finishState(file, pending);
}

async function runResume(fileArg) {
  const m = JSON.parse(readFileSync(fileArg, 'utf8'));
  if (m.kind !== 'stt' || ![1, 2].includes(m.version)) {
    throw new Error('Not a subtitle state file — dubbing/separation state files resume with the dubbing worker instead.');
  }
  setTelemetrySpace(m.spaceSeq); // resume bypasses ensureSpace — attach the workspace from the state file
  track('resume_started', { resumed_from: m.stopReason ?? 'manual' });
  const ctx = { spaceSeq: m.spaceSeq, out: m.out ?? null, targets: m.targets ?? [], file: fileArg, resumedFrom: m.stopReason ?? 'manual' };
  if (!ctx.targets.length) throw new Error('Corrupt state file (no target languages) — run again from the original command.');
  // pin.inp starts as the recorded ref; materialize() re-prepares it only if an upload is actually needed.
  const perInput = m.inputs.map((pin) => ({ inputId: pin.inputId, ref: pin.ref, inp: pin.ref, mediaSeq: pin.mediaSeq ?? null, kind: pin.kind ?? null, durationSec: pin.durationSec ?? null }));
  const saver = sttSaver(ctx, perInput, m.version === 1 ? migrateDoneV1(m.done) : m.done ?? {});
  const pending = await sttProcess(perInput, ctx, saver, true);
  finishState(ctx.file, pending);
}

// ---- Offline subtitle QA (--check / --retime): local file work only — no key, no network, no billing ----

// Display limits per script family. A rendered line longer than `lineChars` is force-wrapped by the
// player into 3+ on-screen lines that cover the picture; reading speed beyond `cpsFail` chars/sec
// disappears before it can be read (`cpsWarn` is the comfortable budget).
const LIMITS = {
  latin: { lineChars: 42, cpsWarn: 17, cpsFail: 21 },
  cjk: { lineChars: 20, cpsWarn: 9, cpsFail: 13 },
};
const CJK_RE = /[ᄀ-ᇿ　-鿿가-힯豈-﫿]/g;
const limitsFor = (text) => {
  const t = text.replace(/\s/g, '');
  return ((t.match(CJK_RE) ?? []).length / Math.max(t.length, 1)) > 0.3 ? LIMITS.cjk : LIMITS.latin;
};
const RETIME_GAP_GUARD_S = 0.08; // keep this much silence before the next cue when extending
const RETIME_MERGE_MAX_GAP_S = 1; // never bridge a longer silence — merged text would hang over it
const RETIME_MERGE_MAX_DUR_S = 7; // industry cap for a single subtitle event
const LAST_CUE_EXTEND_S = 2; // the last cue has no successor to bound it — extend at most this much

function parseSrtCues(raw) {
  const cues = [];
  for (const block of raw.replace(/^﻿/, '').trim().split(/\r?\n\s*\r?\n/)) {
    const lines = block.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l !== '');
    if (lines.length < 2 || !lines[1].includes('-->')) continue;
    const m = lines[1].match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/);
    if (!m) continue;
    const g = m.slice(1).map(Number);
    cues.push({
      start: g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000,
      end: g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000,
      ts: lines[1].trim(),
      text: lines.slice(2),
    });
  }
  return cues;
}
const cpsOf = (c) => c.text.join('').length / Math.max(c.end - c.start, 0.001);
function srtTime(t) {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}
// Greedy word wrap into at most 2 lines of `width` chars; null when the text simply doesn't fit.
function wrapTwoLines(text, width) {
  const lines = [];
  let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= width) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length <= 2 && lines.every((l) => l.length <= width) ? lines : null;
}

// Compare a translated SRT against its source: structure must match 1:1 (the translation step never
// retimes), and every cue must respect the layout and reading-speed limits above.
function checkCues(cues, src) {
  const problems = [];
  if (cues.length !== src.length) {
    problems.push({ level: 'FAIL', cue: 0, why: `cue count is ${cues.length} but the source has ${src.length} — cues were merged, dropped, or renumbered` });
  } else {
    src.forEach((s, i) => {
      if (cues[i].ts !== s.ts) problems.push({ level: 'FAIL', cue: i + 1, why: `timestamp differs from the source ("${cues[i].ts}" vs "${s.ts}")` });
    });
  }
  cues.forEach((c, i) => {
    const lim = limitsFor(c.text.join(''));
    if (c.text.length > 2) problems.push({ level: 'FAIL', cue: i + 1, why: `${c.text.length} text lines (max 2)` });
    for (const l of c.text) {
      if (l.length > lim.lineChars) problems.push({ level: 'FAIL', cue: i + 1, why: `line is ${l.length} chars (max ${lim.lineChars}): "${l}"` });
    }
    const cps = cpsOf(c);
    if (cps > lim.cpsFail) problems.push({ level: 'FAIL', cue: i + 1, why: `reading speed ${cps.toFixed(1)} chars/sec (cap ${lim.cpsFail}) — shorten the text` });
    else if (cps > lim.cpsWarn) problems.push({ level: 'WARN', cue: i + 1, why: `reading speed ${cps.toFixed(1)} chars/sec (comfortable is ≤${lim.cpsWarn}) — shorten if it costs no meaning` });
  });
  return problems;
}

// Netflix-style readability pass: (1) extend a too-fast cue's out-time into the silence before the
// next cue — only as far as the comfortable budget needs; (2) merge a still-too-fast cue with its
// neighbour when the combined text re-wraps into one 2×42 event. Merging is skipped when the first
// cue ends interrupted (…/-) or either side is a dialogue-dash line — an intentionally unfinished
// line must stay unfinished, and two speakers must not collapse into one event. CJK text is never
// merged (re-wrapping needs language-aware segmentation); it only gets the extension.
function retimeCues(cues) {
  const out = cues.map((c) => ({ ...c, text: [...c.text] }));
  let extended = 0;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    const lim = limitsFor(c.text.join(''));
    if (cpsOf(c) <= lim.cpsFail) continue;
    const room = i + 1 < out.length ? out[i + 1].start - RETIME_GAP_GUARD_S : c.end + LAST_CUE_EXTEND_S;
    const comfy = c.start + c.text.join('').length / lim.cpsWarn;
    const end = Math.min(room, comfy);
    if (end > c.end) { c.end = end; extended++; }
  }
  const merged = [];
  const res = [];
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    const lim = limitsFor(c.text.join(''));
    if (cpsOf(c) > lim.cpsFail && i + 1 < out.length) {
      const nxt = out[i + 1];
      const first = c.text.join(' ');
      const second = nxt.text.join(' ');
      const combined = `${first} ${second}`;
      const interrupted = /(\.\.\.|…|[-–—])$/.test(first.trim());
      const dialogue = /^[-–—]/.test(first.trim()) || /^[-–—]/.test(second.trim());
      const dur = nxt.end - c.start;
      const wrapped = limitsFor(combined) === LIMITS.latin ? wrapTwoLines(combined, LIMITS.latin.lineChars) : null;
      if (!interrupted && !dialogue && wrapped
          && nxt.start - c.end <= RETIME_MERGE_MAX_GAP_S && dur <= RETIME_MERGE_MAX_DUR_S
          && wrapped.join('').length / dur <= LIMITS.latin.cpsFail) {
        res.push({ start: c.start, end: nxt.end, text: wrapped });
        merged.push({ a: i + 1, b: i + 2, preview: wrapped.join(' ') });
        i++; // the partner is consumed
        continue;
      }
    }
    res.push(c);
  }
  // Whatever is still too fast is genuinely fast speech — only a shorter translation can fix it.
  const still = [];
  res.forEach((c, i) => { if (cpsOf(c) > limitsFor(c.text.join('')).cpsFail) still.push(i + 1); });
  return { cues: res, extended, merged, still };
}

function runCheck(file, sourceFile) {
  const problems = checkCues(parseSrtCues(readFileSync(file, 'utf8')), parseSrtCues(readFileSync(sourceFile, 'utf8')));
  for (const p of problems) console.log(`[check] ${p.level} cue ${p.cue}: ${p.why}`);
  const fails = problems.filter((p) => p.level === 'FAIL').length;
  console.log(fails
    ? `[check] ${file}: ${fails} FAIL · ${problems.length - fails} WARN — rewrite ONLY the failing cues and re-run.`
    : `[check] ${file}: PASS (${problems.length} WARN) — structure and layout are within delivery limits.`);
}

function runRetime(file) {
  const before = parseSrtCues(readFileSync(file, 'utf8'));
  const { cues, extended, merged, still } = retimeCues(before);
  for (const m of merged) console.log(`[retime] merged cues ${m.a}+${m.b}: "${m.preview}"`);
  writeFileSync(file, cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text.join('\n')}`).join('\n\n') + '\n', 'utf8');
  console.log(`[retime] ${file}: ${before.length} → ${cues.length} cues · extended ${extended} · merged ${merged.length}`);
  console.log(still.length
    ? `[retime] ${still.length} cues still read too fast — shorten their text (meaning first): ${still.join(', ')}`
    : '[retime] every cue is within the reading-speed cap.');
}

// Pure helper exports for testing (when run directly, only main below executes).
export { parseArgs, parseTargets, statePath, guardExistingState, buildManifest, sttSaver, migrateDoneV1, overLimitMsg, TRANSCRIBE, parseSrtCues, checkCues, retimeCues };

// The workspace as far as argv alone reveals it, for the events that fire before the space gate.
function earlySpaceHint(args) {
  if (/^\d+$/.test(String(args.space ?? '').trim())) return args.space; // raw seq; a space NAME needs the gate
  if (args.resume) {
    try { return JSON.parse(readFileSync(args.resume, 'utf8')).spaceSeq; } catch { /* unreadable → no hint */ }
  }
  return null;
}

async function main() {
  let exitCode = 0;
  let updateNotice = null; // daily version check, kicked off in the background and printed after the work finishes
  try {
    preloadKeyEnv(); // pre-inject the key into env before async (at a clean point) → avoid a synchronous powershell call/crash in the main process
    primeTelemetrySpace(); // env pin / previous run — parseArgs itself can throw before any event
    const args = parseArgs(process.argv.slice(2));
    const offline = !!(args.check || args.retime); // local QA — no update check, no telemetry, no key gate
    if (args.host) setAgentHost(args.host); // agent self-reports its runtime (telemetry only) — set before any track()
    if (!args.help && !offline) {
      updateNotice = checkForUpdate().catch(() => null); // non-blocking; never fails the run
      primeTelemetrySpace(earlySpaceHint(args));
      initTelemetry(); // emits first_run once per install
      track('run_started', {
        mode: args.resume ? 'srt-resume' : 'srt',
        input_count: args.inputs.length || null,
        target_count: args.transcribeOnly ? null : String(args.target).split(',').map((s) => s.trim()).filter(Boolean).length || null,
        transcribe_only: !!args.transcribeOnly,
      });
    }
    if (args.help) console.log(USAGE);
    else if (args.check) runCheck(args.check, args.source);
    else if (args.retime) runRetime(args.retime);
    else if (args.resume) await runResume(args.resume);
    else if (!args.inputs.length) {
      console.error(USAGE);
      exitCode = 1;
    } else await runStt(args);
  } catch (e) {
    if (e?.name === 'ExitCode') exitCode = e.code; // message already printed at the throw site
    else if (e?.name === 'UsageError') { console.error(`${e.message}\n${USAGE}`); exitCode = 1; }
    else { track('error', { error_class: errorClass(e) }); console.error(friendlyError(e)); exitCode = 1; }
  } finally {
    await cleanupTempDirs(); // clean the URL-download temp folders
  }
  // After the work is done (never mid-job), surface a version-update notice if one is available.
  if (updateNotice) { try { const n = await updateNotice; if (n) console.log('\n' + n); } catch { /* ignore */ } }
  // Natural exit (loop drain) — process.exit() while fetch sockets are closing hits a Windows libuv assert
  // (async.c) that corrupts the exit code. The unref'd timer is a hard-exit fallback if a handle ever hangs.
  process.exitCode = exitCode;
  setTimeout(() => process.exit(exitCode), 5000).unref();
}

// main only when run directly (CLI). When imported (tests), expose helpers only and do not execute.
// realpath both sides — Node resolves symlinks for the main module, so a skill installed via symlink/junction
// would otherwise silently never run main (argv[1] keeps the link path while import.meta.url is the real one).
const isMain = (() => {
  if (!process.argv[1]) return false;
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) await main();
