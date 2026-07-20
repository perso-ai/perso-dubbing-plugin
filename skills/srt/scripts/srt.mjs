#!/usr/bin/env node
// /srt entry worker: extract the source-language subtitles (SRT) of each input via Perso AI STT.
//   key gate → input(s) → upload once per input → one STT project per (input × language) → download each
//   project's SRT → print one [srt-original] mapping line per (input × language).
//   Translation is NOT done here: the calling agent translates each original SRT into its paired language
//   and saves {stem}_{lang}_Subtitle.srt (see ../SKILL.md).
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
import { track, initTelemetry, setTelemetrySpace } from '../../dubbing/lib/telemetry.mjs';
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
  '',
  '  --target     comma-separated language codes the subtitles will be translated into (default: en).',
  '               One subtitle project is created per input × language.',
  '  --transcribe-only  no translation pairing — the original-language subtitles are the final result',
  '               (one subtitle project per input; cannot be combined with --target)',
  '  --space      workspace name to run in (otherwise asked via the [space-select] flow)',
  '  --out        folder that collects the extracted .srt files (default: next to each source)',
  '  --recursive  when an input is a folder, include its subfolders',
  '  --resume     continue an interrupted run from its state file (already-submitted work is not billed again)',
].join('\n');

// Sentinel "language" for --transcribe-only runs. parseTargets can never produce it (codes are 2-3
// letters), so it cannot collide with a real target; it flows through the manifest keys unchanged.
const TRANSCRIBE = 'original';

function parseArgs(argv) {
  const a = { target: 'en', inputs: [] };
  const VALUE_FLAGS = { '--resume': 'resume', '--target': 'target', '--space': 'space', '--out': 'out' };
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
  return a;
}

// Language tokens only drive project titles and the output pairing (the agent does the translating),
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
// any network/billing and hand the choice to the user (exit 3 = "ask the user", like [space-select]).
function guardExistingState(file) {
  if (!existsSync(file)) return;
  console.log(`[resume-check] An earlier run for this input did not finish — its state file still exists: ${file}`);
  console.log('[resume-check] To finish it without paying again for the completed parts, run:');
  console.log(`[resume-check]   node scripts/srt.mjs --resume "${file}"`);
  console.log('[resume-check] To discard it and start over instead (completed parts will be billed again), delete that state file and re-run this command.');
  throw new ExitCode(3);
}

// Manifest v1 kind 'stt': the (input × language) plan + per-pair checkpoints keyed `${inputId}|${lang}`.
function buildManifest(ctx, perInput, done) {
  return {
    version: 1, kind: 'stt', spaceSeq: ctx.spaceSeq, out: ctx.out ?? null, targets: ctx.targets,
    stopReason: ctx.stopReason ?? null, // why the previous run stopped ('quota') → resume telemetry
    inputs: perInput.map((p) => ({ inputId: p.inputId, ref: p.ref, mediaSeq: p.mediaSeq ?? null, kind: p.kind ?? null, durationSec: p.durationSec ?? null })),
    done, // `${inputId}|${lang}` → { status:'RUN'|'OK'|'HARD_FAIL', projectId?, savedPath?, reason? }
  };
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
    onSubmit: (inputId, lang, projectId) => { done[`${inputId}|${lang}`] = { status: 'RUN', projectId }; writeNow(); },
    onComplete: (inputId, lang, projectId, savedPath) => { done[`${inputId}|${lang}`] = { status: 'OK', projectId, savedPath }; writeNow(); },
    onFail: (inputId, lang, reason) => { done[`${inputId}|${lang}`] = { status: 'HARD_FAIL', reason }; writeNow(); },
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
async function waitForProject(projectSeq, spaceSeq) {
  let last = -1;
  let lastChange = Date.now();
  for (;;) {
    let st = null;
    try { st = await getStatus(projectSeq, spaceSeq); } catch { /* transient — keep polling */ }
    if (st?.state === 'complete' || st?.state === 'failed') return st;
    const p = st?.progress ?? -1;
    if (p !== last) { last = p; lastChange = Date.now(); if (p > 0) log(`transcribing... ${p}%`); }
    if (Date.now() - lastChange > MAX_IDLE_MS) return { state: 'failed', timedOut: true, message: 'timed out (no progress)' };
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

// One [srt-original] line per finished pair — the agent parses these to know which file to translate into which language.
function emitMapping(inp, lang, savedPath) {
  console.log('[srt-original] ' + JSON.stringify({ input: labelOf(inp), lang, path: resolve(savedPath) }));
}

// Per (input × language): submit (checkpointed) → wait → download the SRT → report. Shared by run + resume.
// Returns true when some paid part is still owed (undelivered) → the caller must keep the state file for resume.
async function sttProcess(perInput, ctx, saver, isResume) {
  const { spaceSeq, targets, out } = ctx;
  const transcribeOnly = targets.length === 1 && targets[0] === TRANSCRIBE;
  const usedByDir = new Map();
  const lines = [];
  let ok = 0, fail = 0, noVoice = 0;
  const flags = { pending: false };
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
      for (const lang of targets) {
        const prev = saver.done[`${pin.inputId}|${lang}`];
        if (prev?.status === 'HARD_FAIL') { fail++; lines.push(`Could not extract: ${name} [${lang}] — ${prev.reason ?? 'failed'}`); continue; }
        if (prev?.status === 'OK' && prev.savedPath && existsSync(prev.savedPath)) {
          emitMapping(pin.inp ?? pin.ref, transcribeOnly ? null : lang, prev.savedPath); // re-print so the agent gets the full mapping on resume
          ok++; lines.push(`Done (subtitle): ${name} [${lang}] → ${basename(prev.savedPath)}`);
          continue;
        }
        let projectId = prev?.projectId ?? null;
        if (projectId == null) { // never submitted → upload (once per input) and submit
          await ensureMedia(pin, spaceSeq, saver);
          const title = transcribeOnly ? name : `${name} (${lang})`;
          try {
            ([projectId] = await requestStt(spaceSeq, pin.mediaSeq, { title, kind: pin.kind ?? 'video' }));
          } catch (e) {
            // A mediaSeq recorded in the state file may have expired server-side — re-upload once and retry.
            if (e?.httpStatus === 402 || !isResume) throw e;
            await ensureMedia(pin, spaceSeq, saver, { forceReupload: true });
            ([projectId] = await requestStt(spaceSeq, pin.mediaSeq, { title, kind: pin.kind ?? 'video' }));
          }
          if (projectId == null) throw new Error('The subtitle request was not accepted.');
          saver.onSubmit(pin.inputId, lang, projectId); // checkpoint the billed unit before any wait
          log(`${name} [${lang}]: subtitle project submitted`);
        }
        const st = await waitForProject(projectId, spaceSeq);
        if (st.state !== 'complete') {
          if (st.timedOut) { flags.pending = true; fail++; lines.push(`Could not extract: ${name} [${lang}] — ${st.message}`); continue; } // may still be running (paid) → keep the RUN checkpoint so resume re-polls it
          if (st.noVoice) noVoice++;
          const reason = st.noVoice ? 'no voice detected in the source' : (st.message ?? st.failureReason ?? 'failed');
          saver.onFail(pin.inputId, lang, reason); // genuine server failure → terminal (no automatic retry)
          fail++; lines.push(`Could not extract: ${name} [${lang}] — ${reason}`);
          continue;
        }
        const dir = out ?? inputSaveDir(pin.inp?.localPath ? pin.inp : pin.ref);
        mkdirSync(dir, { recursive: true });
        const saved = await downloadAudioScript(projectId, spaceSeq, (serverName) => join(dir, reserve(dir, serverName, usedByDir)));
        saver.onComplete(pin.inputId, lang, projectId, saved.path);
        emitMapping(pin.inp ?? pin.ref, transcribeOnly ? null : lang, saved.path);
        ok++;
        lines.push(`Done (subtitle): ${name} [${lang}] → ${basename(saved.path)}`);
      }
    } catch (e) {
      if (e?.httpStatus === 402) { // out of credits — deliver what finished + top-up/resume path, then stop
        ctx.stopReason = 'quota'; // recorded in the state file → resume telemetry reports why
        saver.writeNow();
        if (lines.length) console.log('\n' + lines.join('\n'));
        const plan = await getPlanStatus(spaceSeq);
        const settled = Object.values(saver.done).filter((d) => d.status === 'OK' || d.status === 'HARD_FAIL').length;
        track('quota_exceeded', { ...await spacePlanProps(spaceSeq), remaining_pairs: Math.max(0, perInput.length * targets.length - settled) });
        await trackCompleted();
        console.log(messages.quotaExceeded({
          planTier: plan?.planTier, remainingQuota: plan?.remainingQuota,
          resumeHint: `node scripts/srt.mjs --resume "${ctx.file}"`,
          billingScript: '../dubbing/scripts/billing.mjs',
        }));
        throw new ExitCode(1);
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
        const msg = `Could not extract: ${name} — ${overLimitMsg(e)}`;
        notify(msg); fail++; lines.push(msg);
        continue;
      }
      flags.pending = true; // errored after some languages may have been billed → keep state so resume finishes them
      fail++;
      lines.push(`Could not extract: ${name} — ${friendlyError(e)}`);
    }
  }
  console.log('\n' + lines.join('\n'));
  if (perInput.length * targets.length > 1) console.log(`\nSummary: ${ok} done · ${fail} failed`);
  if (ok) {
    console.log(transcribeOnly
      ? '\nNext: this was a transcription-only run — hand the [srt-original] files to the user as they are (no translation step).'
      : '\nNext: translate each [srt-original] file into its paired language and save it as <stem>_<lang>_Subtitle.srt next to the original, where <stem> is the input file name without its extension (keep cue numbers, timestamps, and cue count unchanged — see SKILL.md).');
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
    input_count: perInput.length,
    lang_count: args.transcribeOnly ? null : targets.length,
    pair_count: perInput.length * targets.length,
    transcribe_only: !!args.transcribeOnly,
    duration_sec: knownDur.length ? knownDur.reduce((a, b) => a + b, 0) : null,
    input_durations_sec: knownDur.length ? knownDur : null,
  });
  const pending = await sttProcess(perInput, ctx, saver, false);
  finishState(file, pending);
}

async function runResume(fileArg) {
  const m = JSON.parse(readFileSync(fileArg, 'utf8'));
  if (m.kind !== 'stt' || m.version !== 1) {
    throw new Error('Not a subtitle state file — dubbing/separation state files resume with the dubbing worker instead.');
  }
  setTelemetrySpace(m.spaceSeq); // resume bypasses ensureSpace — attach the workspace from the state file
  track('resume_started', { resumed_from: m.stopReason ?? 'manual' });
  const ctx = { spaceSeq: m.spaceSeq, out: m.out ?? null, targets: m.targets ?? [], file: fileArg, resumedFrom: m.stopReason ?? 'manual' };
  if (!ctx.targets.length) throw new Error('Corrupt state file (no target languages) — run again from the original command.');
  // pin.inp starts as the recorded ref; materialize() re-prepares it only if an upload is actually needed.
  const perInput = m.inputs.map((pin) => ({ inputId: pin.inputId, ref: pin.ref, inp: pin.ref, mediaSeq: pin.mediaSeq ?? null, kind: pin.kind ?? null, durationSec: pin.durationSec ?? null }));
  const saver = sttSaver(ctx, perInput, m.done ?? {});
  const pending = await sttProcess(perInput, ctx, saver, true);
  finishState(ctx.file, pending);
}

// Pure helper exports for testing (when run directly, only main below executes).
export { parseArgs, parseTargets, statePath, guardExistingState, buildManifest, sttSaver, overLimitMsg, TRANSCRIBE };

async function main() {
  let exitCode = 0;
  let updateNotice = null; // daily version check, kicked off in the background and printed after the work finishes
  try {
    preloadKeyEnv(); // pre-inject the key into env before async (at a clean point) → avoid a synchronous powershell call/crash in the main process
    const args = parseArgs(process.argv.slice(2));
    if (!args.help) {
      updateNotice = checkForUpdate().catch(() => null); // non-blocking; never fails the run
      initTelemetry(); // emits first_run once per install
      track('run_started', {
        mode: args.resume ? 'srt-resume' : 'srt',
        input_count: args.inputs.length || null,
        target_count: args.transcribeOnly ? null : String(args.target).split(',').map((s) => s.trim()).filter(Boolean).length || null,
        transcribe_only: !!args.transcribeOnly,
      });
    }
    if (args.help) console.log(USAGE);
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
