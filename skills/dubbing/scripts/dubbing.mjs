#!/usr/bin/env node
// /dubbing entry orchestrator.
//   key gate → input(s) → per-input split → global pool scheduler (all inputs×parts×languages in one queue) → per-input/per-language merge → notice.
//   usage: node scripts/dubbing.mjs "<local|URL|folder>" ["<another input>" ...] [--source auto] [--target en,ja] [--space "space name"] [--out path|folder]
//          node scripts/dubbing.mjs --resume "<statefile>"
import { writeFileSync, readFileSync, copyFileSync, mkdirSync, readdirSync, unlinkSync, renameSync, realpathSync, existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join, basename, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preloadKeyEnv } from './resolve_key.mjs';
import { ExitCode, UsageError, isAuthError, friendlyError, errorClass, ensureKey, ensureSpace } from '../lib/gates.mjs';
import { expandInputs, prepareInput } from '../lib/input.mjs';
import { getPlanStatus, spacePlanProps } from '../lib/space.mjs';
import { getLanguages } from '../lib/languages.mjs';
import { resolveChunks, recutChunk, SplitConfirmNeeded } from '../lib/split.mjs';
import { runSchedule } from '../lib/scheduler.mjs';
import { download, getStatus, upload, requestAudioSeparation, downloadSeparation } from '../lib/api_adapter.mjs';
import { mergeGroups } from '../lib/merge.mjs';
import { messages, withUtm, SUBSCRIPTION_URL } from '../lib/messages.mjs';
import { checkForUpdate } from '../lib/update_check.mjs';
import { track, initTelemetry, setTelemetrySpace, primeTelemetrySpace } from '../lib/telemetry.mjs';
import { cleanupTempDirs, makeTempDir } from '../lib/tmp.mjs';
import { probe } from '../lib/ffmpeg.mjs';
import { AUDIO_EXT, CREDIT_RATE_DUB, CREDIT_RATE_LIPSYNC, UHD_CREDIT_MULT, UHD_BILLED_TIERS, POLL_INTERVAL_MS, MAX_IDLE_MS } from '../lib/config.mjs';

const log = (m) => console.error('  ' + m); // background verbose log (stderr)
// Milestones exposed to the user (stdout). The agent relays these [progress] lines to chat per the SKILL rules.
const notify = (m) => console.log(`[progress] ${m}`);

// split-confirm telemetry props: real units + an ESTIMATED part count (the exact split isn't computed until the confirmed re-run).
function splitConfirmProps(d = {}) {
  const SIZE_CAP = 1.9 * 1024 ** 3; // mirrors split.mjs SIZE_CAP (estimate only)
  if (d.reason === 'length') {
    return {
      reason: 'length',
      duration_sec: Number.isFinite(d.actualMs) ? Math.round(d.actualMs / 1000) : null,
      parts_est: (Number.isFinite(d.actualMs) && d.limitMs) ? Math.ceil(d.actualMs / d.limitMs) : null,
    };
  }
  return {
    reason: 'size',
    size_mb: Number.isFinite(d.actualBytes) ? Math.round(d.actualBytes / 1024 ** 2) : null,
    parts_est: Number.isFinite(d.actualBytes) ? Math.ceil(d.actualBytes / SIZE_CAP) : null,
  };
}

// Sum of known chunk spans across inputs → seconds (null when no boundaries are known, e.g. an unsplit whole).
function totalDurationSec(perInput) {
  const ms = (perInput || []).reduce((s, p) => s + (p.chunks || []).reduce(
    (a, c) => a + (Number.isFinite(c.startMs) && Number.isFinite(c.endMs) ? c.endMs - c.startMs : 0), 0), 0);
  return ms > 0 ? Math.round(ms / 1000) : null;
}

// Per-input lengths (sec) for telemetry: the upload register response's server-measured duration first,
// else the known chunk span. null when any chunk's length is unknown (e.g. external URL — uploaded later).
function inputDurationsSec(perInput) {
  return (perInput || []).map((pin) => {
    let sec = 0;
    for (const c of pin.chunks || []) {
      if (Number.isFinite(c.durationSec) && c.durationSec > 0) sec += c.durationSec;
      else if (Number.isFinite(c.startMs) && Number.isFinite(c.endMs)) sec += Math.round((c.endMs - c.startMs) / 1000);
      else return null; // one unknown chunk would make the input total lie
    }
    return sec > 0 ? sec : null;
  });
}

const USAGE = [
  'Usage: node scripts/dubbing.mjs "<file|folder|URL>" ["<another input>" ...] [--source auto] [--target en,ja] [--space "space name"] [--out path|folder] [--recursive] [--lipsync] [--force] [--no-save]',
  '       node scripts/dubbing.mjs --lipsync-only "<project-ref JSON | projectSeq[,projectSeq...]>" [--space "space name"] [--out path|folder]',
  '       node scripts/dubbing.mjs --separate "<file|folder|URL>" ["<another input>" ...] [--space "space name"] [--out folder]',
  '       node scripts/dubbing.mjs --resume "<state-file>"',
  '',
  '  --lipsync       dub, then generate the lip-synced video (extra credits; takes much longer than dubbing)',
  '  --lipsync-only  lip-sync an already-dubbed project (uses the [project-ref] line printed by a finished run; no re-dub charge)',
  '  --separate      split the source into voice / background / sub-background audio tracks (no dubbing; ~0.5 credit per second)',
  '  --force         skip the upfront credit-estimate gate of --lipsync',
  '  --no-save       leave the result on the server without downloading it (single/unsplit input only; not with --lipsync)',
].join('\n');

function parseArgs(argv) {
  const a = { source: 'auto', target: 'en', inputs: [] };
  const VALUE_FLAGS = { '--resume': 'resume', '--source': 'source', '--target': 'target', '--space': 'space', '--out': 'out', '--lipsync-only': 'lipsyncOnly' };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--help' || t === '-h') a.help = true;
    else if (t === '--recursive') a.recursive = true;
    else if (t === '--separate') a.separate = true;
    else if (t === '--lipsync') a.lipsync = true;
    else if (t === '--force') a.force = true;
    else if (t === '--allow-split') a.allowSplit = true; // user confirmed auto split→dub→merge (set on the re-run after [split-confirm])
    else if (t === '--no-save') a.noSave = true; // server-only: skip downloading the result (single/unsplit input only)
    else if (t in VALUE_FLAGS) {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`Missing value for ${t}`);
      a[VALUE_FLAGS[t]] = v;
    } else if (t.startsWith('--')) {
      throw new UsageError(`Unknown option: ${t}`); // typos must not be swallowed as input paths
    } else a.inputs.push(t); // positional args (multiple): URL/path/folder may be mixed
  }
  return a;
}

// Language codes are validated up-front: a typo is a permanent error, so fail with the supported list
// instead of a mid-run "try again". Best-effort — if the list can't be fetched, let the server decide.
async function validateLanguages(targets, source) {
  const langs = await getLanguages().catch(() => []);
  const codes = langs.map((l) => (typeof l === 'string' ? l : l.code ?? l.languageCode)).filter(Boolean);
  if (!codes.length) return { targets, source };
  const canon = new Map(codes.map((c) => [String(c).toLowerCase(), c]));
  const fixed = targets.map((t) => {
    const hit = canon.get(t.toLowerCase());
    if (!hit) {
      track('lang_invalid', { field: 'target' });
      console.error(`Unsupported target language code: "${t}"\nSupported: ${codes.join(', ')}`);
      throw new ExitCode(1);
    }
    return hit;
  });
  let src = source;
  if (source && source !== 'auto') {
    const hit = canon.get(source.toLowerCase());
    if (!hit) {
      track('lang_invalid', { field: 'source' });
      console.error(`Unsupported source language code: "${source}" (use "auto" to detect)\nSupported: ${codes.join(', ')}`);
      throw new ExitCode(1);
    }
    src = hit;
  }
  return { targets: fixed, source: src };
}

const labelOf = (inp) => inp?.originalName ?? inp?.sourceUrl ?? 'input';
const refOf = (inp) => (inp.source === 'local'
  ? { source: 'local', localPath: inp.localPath, originalName: inp.originalName }
  : { source: inp.source, sourceUrl: inp.sourceUrl, originalName: inp.originalName ?? null });
// Notice text for skipping an unsupported format (append the reason if present).
const skipMsg = (name, e) => `Skipped (unsupported format): ${name}${e?.cause?.message ? ` (${e.cause.message})` : ''}`;

// [split-confirm] prompt: which limit was exceeded + the quality caveat + how to proceed. Emitted (exit 3) before
// the first split when --allow-split isn't set; the agent relays it and re-runs with --allow-split on the user's OK.
function splitConfirmMessage(d, tag, action = 'dub') {
  const min = (ms) => Math.max(1, Math.round(ms / 60000));
  const gb = (b) => (b / 1024 ** 3).toFixed(1);
  const label = tag ? `${tag}: ` : '';
  const noun = action === 'separate' ? 'This file' : 'This video';
  let head;
  if (d.reason === 'length') {
    const lim = d.limitMs ? `${min(d.limitMs)} min` : 'the plan limit';
    head = d.actualMs
      ? `${noun} exceeds the length limit (${lim}; it is ${min(d.actualMs)} min).`
      : `${noun} exceeds the length limit (${lim}).`;
  } else {
    head = d.actualBytes
      ? `${noun} exceeds the 2 GB upload limit (it is ${gb(d.actualBytes)} GB).`
      : `${noun} exceeds the 2 GB upload limit.`;
  }
  const mid = action === 'separate'
    ? 'Separating it needs automatic split → separate → merge, which may come out less polished than splitting it up yourself.'
    : 'Dubbing it needs automatic split → dub → merge, which may come out less polished than splitting it up yourself.';
  return [
    `[split-confirm] ${label}${head}`,
    `[split-confirm] ${mid}`,
    '[split-confirm] Proceed automatically? To confirm, re-run the same command with --allow-split.',
  ].join('\n');
}

// Save directory (non-volatile): next to the local original; current folder for URL/external/unknown.
function inputSaveDir(inp) {
  if (inp?.source === 'local' && inp.localPath) return dirname(inp.localPath);
  return process.cwd();
}

// Resume state-file location — stores no video data (lightweight) and lives in a non-volatile location (survives temp cleanup).
//   if --out is set, next to/inside it; otherwise next to the single local original; else current folder.
function resumePath({ out, inputs, multiInput }) {
  if (out) return multiInput ? join(out, '.dubresume.json') : out + '.dubresume.json';
  const only = inputs.length === 1 ? inputs[0] : null;
  if (only?.source === 'local' && only.localPath) return only.localPath + '.dubresume.json';
  return join(process.cwd(), 'dubbing-resume.json');
}

// A state file at the target path means an earlier run for this input never finished (it is deleted on
// success). Starting fresh would overwrite it and re-bill work the server already completed, so stop before
// any network/billing and hand the choice to the user (exit 3 = "ask the user", like [space-select]).
function guardExistingState(file) {
  if (!existsSync(file)) return;
  console.log(`[resume-check] An earlier run for this input did not finish — its state file still exists: ${file}`);
  console.log('[resume-check] To finish it without paying again for the completed parts, run:');
  console.log(`[resume-check]   node scripts/dubbing.mjs --resume "${file}"`);
  console.log('[resume-check] To discard it and start over instead (completed parts will be billed again), delete that state file and re-run this command.');
  throw new ExitCode(3);
}

// --out single input: add a language suffix if multilingual (single language stays as-is).
// The extension class excludes path separators — a dot in a FOLDER name must not be taken as the extension.
function explicitOutPath(argOut, target, multiLang) {
  return multiLang ? argOut.replace(/(\.[^.\\/]+)?$/, `.${target}$1`) : argOut;
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

// Determine the final save path for one (input × language) bundle + create the directory (if needed).
//  1) single input + --out → that file (_language if multilingual, _2,_3… if multiple outputs).  [user-specified takes precedence]
//  2) single result without split + Perso filename → keep the Perso name as-is (includes language/timestamp → no rename needed).
//  3) otherwise (split merge, etc.) → <originalName>.<suffix>.<language>.<ext> (_2,_3… if multiple; suffix: dubbed|lipsync).
//  Save folder: --out (folder if multi-input) > next to the input original > current folder.
function targetPaths(outputs, ctx) {
  const { inp, target, isSplit, multiInput, multiLang, out, usedByDir, suffix = 'dubbed' } = ctx;
  if (out && !multiInput) {
    const file = explicitOutPath(out, target, multiLang);
    mkdirSync(dirname(file), { recursive: true });
    return outputs.length === 1 ? [file] : outputs.map((_, i) => file.replace(/(\.[^.\\/]+)?$/, `_${i + 1}$1`));
  }
  const dir = (out && multiInput) ? out : inputSaveDir(inp);
  mkdirSync(dir, { recursive: true });
  const names = [];
  if (!isSplit && outputs.length === 1 && outputs[0].name) {
    names.push(reserve(dir, basename(outputs[0].name), usedByDir)); // keep the Perso name as-is (includes timestamp)
  } else {
    const ext = extname(outputs[0]?.name || outputs[0]?.path || '') || '.mp4';
    const stem = String(labelOf(inp)).replace(/\.[^.\\/]+$/, '') || 'output';
    outputs.forEach((_, i) => {
      const base = `${stem}.${suffix}.${target}${outputs.length > 1 ? `_${i + 1}` : ''}${ext}`;
      names.push(reserve(dir, base, usedByDir));
    });
  }
  return names.map((n) => join(dir, n));
}

// Persistable completion entry for one result — what resume needs to skip/re-download. null = nothing worth keeping.
//   OK{projectSeq}                → final project (add lipsync:1 [+dubSeq] when the deliverable is the lip-sync video)
//   OK{…, lipsyncFailed:1}        → lip-sync failed permanently; the dubbed video is the deliverable (never retried)
//   LSWAIT{projectSeq}            → dubbing project exists, lip-sync still owed (resume runs only the lip-sync)
function doneEntry(r) {
  if (r.status === 'OK' || r.status === 'DLFAIL') { // DLFAIL: generated → re-download on resume
    if (r.lipsyncPending) return { status: 'LSWAIT', projectSeq: r.projectId };
    const e = { status: 'OK', projectSeq: r.projectId };
    if (r.lipsync) { e.lipsync = 1; if (r.dubProjectId != null) e.dubSeq = r.dubProjectId; }
    if (r.lipsyncFailed) e.lipsyncFailed = 1;
    return e;
  }
  if (r.status === 'PASSTHROUGH') return { status: 'PASSTHROUGH' };
  return null;
}

// Lightweight manifest (v5) holding the chunk plan (boundaries) + only the completion status per (input|part|language).
function buildManifest(ctx, perInput, results, prevDone = {}) {
  const done = { ...prevDone };
  for (const r of results) {
    const e = doneEntry(r);
    if (e) done[`${r.inputId}|${r.index}|${r.target}`] = e;
  }
  return {
    version: 5, spaceSeq: ctx.spaceSeq, opts: { source: ctx.source }, targets: ctx.targets, out: ctx.out ?? null,
    lipsync: !!ctx.lipsync, stop_reason: ctx.stopReason ?? null,
    inputs: perInput.map((p) => ({
      inputId: p.inputId, ref: p.ref,
      chunks: p.chunks.map((c) => ({
        index: c.index, source: c.source, sourceUrl: c.sourceUrl ?? null,
        startMs: c.startMs ?? null, endMs: c.endMs ?? null, title: c.title ?? null, kind: c.kind ?? null,
        ...(c.parentSeq != null ? { parentSeq: c.parentSeq } : {}), // lipsync-only: the dubbed project behind this part
      })),
    })),
    done,
  };
}

// Incremental resume-state saving: the manifest is written as soon as a chunk plan is known and rewritten after every
// completed piece, so a run that dies mid-way (crash, Ctrl-C, shell timeout, sleep) can still resume instead of losing paid work.
function manifestSaver(ctx, perInput, prevDone = {}) {
  const done = { ...prevDone };
  const writeNow = () => {
    try {
      mkdirSync(dirname(ctx.file), { recursive: true });
      const tmp = ctx.file + '.tmp';
      writeFileSync(tmp, JSON.stringify(buildManifest(ctx, perInput, [], done)), 'utf8');
      renameSync(tmp, ctx.file); // swap so a crash mid-write can't leave a corrupt manifest
    } catch { /* best-effort — saving state must never break the run */ }
  };
  const onResult = (r) => {
    const k = `${r.inputId}|${r.index}|${r.target}`;
    const e = doneEntry(r);
    if (e) { done[k] = e; writeNow(); }
    else if (done[k]) { delete done[k]; writeNow(); } // hard failure after a submit checkpoint → drop the stale entry
  };
  // Submission checkpoint: the paid projectSeq is persisted the moment it exists, so even a hard kill
  // before any result cannot cause a re-submission (= double billing) on resume.
  const onSubmit = (s) => {
    const k = `${s.inputId}|${s.index}|${s.target}`;
    if (s.stage === 'lipsync') done[k] = { status: 'LSRUN', projectSeq: s.projectId, dubSeq: s.parentSeq };
    else if (s.lipsync) done[k] = { status: 'LSWAIT', projectSeq: s.projectId }; // chain: this dub still owes a lip-sync
    else done[k] = { status: 'RUN', projectSeq: s.projectId };
    writeNow();
  };
  return { writeNow, onResult, onSubmit };
}

// Sum of remaining (unprocessed) chunk durations → minutes (rounded up). null if only boundary-less chunks exist.
function remainingMinutes(chunks) {
  const ms = (chunks || []).reduce(
    (s, c) => s + (Number.isFinite(c?.startMs) && Number.isFinite(c?.endMs) ? c.endMs - c.startMs : 0),
    0,
  );
  return ms > 0 ? Math.ceil(ms / 60000) : null;
}

// Machine-readable project reference, one line per delivered (input × language). Lets the agent lip-sync
// this exact dubbing later in the session (--lipsync-only) without re-dubbing. Not meant for end users.
function emitProjectRef(pin, tRes, target, ctx, { lipsync }) {
  const parts = [];
  for (const c of pin.chunks) {
    const r = tRes.find((x) => x.index === c.index);
    if (!r) return;
    if (r.status === 'PASSTHROUGH') {
      parts.push({ pt: [c.startMs ?? 0, c.endMs ?? 0] });
    } else if (r.status === 'OK' || r.status === 'DLFAIL') {
      const dubSeq = r.lipsync ? r.dubProjectId : r.projectId; // always reference the dubbing project (lip-sync reuse needs it)
      if (dubSeq == null) return;
      const part = { seq: dubSeq };
      if (Number.isFinite(c.startMs) && Number.isFinite(c.endMs)) part.ms = [c.startMs, c.endMs];
      parts.push(part);
    } else return;
  }
  if (!parts.some((p) => p.seq != null)) return;
  const input = pin.ref?.localPath ?? pin.ref?.sourceUrl ?? null;
  console.log(`[project-ref] ${JSON.stringify({ v: 1, space: ctx.spaceSeq, input, lang: target, parts, lipsync: !!lipsync })}`);
}

// Group the global pool results by input and language to merge and save them, and if incomplete (credit/download failure), preserve resume state as a manifest.
//   ctx: { spaceSeq, source, targets, out, multiInput, sched, file, prevDone }
async function finishPool(allResults, perInput, ctx) {
  const usedByDir = new Map();
  const multiLang = ctx.targets.length > 1;
  let okCount = 0, failCount = 0;
  const lines = [];

  for (const pin of perInput) {
    const inRes = allResults.filter((r) => r.inputId === pin.inputId);
    const isSplit = pin.chunks.length > 1;
    for (const target of ctx.targets) {
      const tRes = inRes.filter((r) => r.target === target);
      if (!tRes.length) continue; // all canceled / no results
      const tlab = multiLang ? `${labelOf(pin.inp)} (${target})` : labelOf(pin.inp);
      const mergeable = tRes.filter((r) => r.status === 'OK' || r.status === 'PASSTHROUGH');
      if (mergeable.length && mergeable.every((r) => r.status === 'PASSTHROUGH')) {
        // every processed part was silent — merging would just hand the original back as a "dubbed" result
        lines.push(`Could not dub: ${tlab} — no voice detected (nothing to dub)`);
        failCount++;
        continue;
      }
      if (mergeable.length && mergeable.every((r) => r.serverOnly)) {
        // --no-save: the dubbed result was left on the server and never downloaded → report + reference, don't merge/save.
        lines.push(`Kept on server, not saved: ${tlab} → project ${mergeable[0].projectId}`);
        okCount++;
        emitProjectRef(pin, tRes, target, ctx, { lipsync: false });
        continue;
      }
      const hasLs = mergeable.some((r) => r.lipsync);
      const lsFailed = mergeable.some((r) => r.lipsyncFailed);
      const lsPending = mergeable.some((r) => r.lipsyncPending);
      if (mergeable.length > 1) notify(`Merging — ${labelOf(pin.inp)}${multiLang ? ` (${target})` : ''}`);
      const { outputs, report } = await mergeGroups(tRes);
      let saved = [];
      if (outputs.length) {
        const suffix = hasLs ? 'lipsync' : 'dubbed';
        const paths = targetPaths(outputs, { inp: pin.inp, target, isSplit, multiInput: ctx.multiInput, multiLang, out: ctx.out, usedByDir, suffix });
        outputs.forEach((o, i) => copyFileSync(o.path, paths[i]));
        await rm(dirname(outputs[0].path), { recursive: true, force: true }).catch(() => {}); // clean up merge temp folder
        saved = paths;
      }
      if (saved.length) {
        const notes = [];
        if (report) notes.push('some parts excluded');
        if (lsFailed) notes.push(hasLs ? 'lip-sync failed on some parts — dubbed video used for those' : 'lip-sync failed — dubbed video delivered instead');
        if (lsPending) notes.push('lip-sync still pending — resume to finish it');
        lines.push(`Done${hasLs ? ' (lip-sync)' : ''}: ${tlab} → ${saved.map((p) => basename(p)).join(', ')}${notes.length ? ` (${notes.join('; ')})` : ''}`);
        okCount++;
        emitProjectRef(pin, tRes, target, ctx, { lipsync: hasLs && !lsFailed && !lsPending });
      } else {
        lines.push(`Could not dub: ${tlab} — ${report ?? 'no result'}`);
        failCount++;
      }
    }
  }
  if (lines.length) console.log(lines.join('\n'));
  if (perInput.length > 1 || multiLang) console.log(`\nSummary: ${okCount} done · ${failCount} failed`);

  // If it stopped again (out of credit) or only downloads failed, save the manifest → resume.
  const dlPending = allResults.some((r) => r.status === 'DLFAIL');
  const stopped = !!ctx.sched?.stopped;
  if (stopped || dlPending) {
    ctx.stopReason = stopped ? 'quota' : 'download'; // recorded in the manifest → resume reports why it stopped
    if (ctx.multiInput && ctx.out) mkdirSync(ctx.out, { recursive: true });
    writeFileSync(ctx.file, JSON.stringify(buildManifest(ctx, perInput, allResults, ctx.prevDone ?? {})), 'utf8');
    if (stopped) {
      const plan = await getPlanStatus(ctx.spaceSeq);
      const min = remainingMinutes(ctx.sched.pendingLeft);
      const lsOwed = allResults.some((r) => r.lipsyncPending);
      track('quota_exceeded', { ...await spacePlanProps(ctx.spaceSeq), remaining_min: min });
      console.log('\n' + messages.quotaExceeded({
        planTier: plan?.planTier,
        remainingQuota: plan?.remainingQuota,
        remainingNote: min != null ? `~${min} min` : null,
        resumeHint: `node scripts/dubbing.mjs --resume "${ctx.file}"`,
        note: lsOwed ? '   Dubbing for some items is already done — resume will run only the remaining lip-sync (no re-dub charge).' : null,
      }));
    } else {
      console.log(`\nSome parts are still finishing on the server or could not be downloaded — resume later to fetch them (no re-dub, no extra credits):\n  node scripts/dubbing.mjs --resume "${ctx.file}"`);
    }
  } else {
    try { unlinkSync(ctx.file); } catch { /* done → clean up resume state-file (ignore if absent) */ }
  }
  if (!ctx.lipsyncOnly) { // lipsync-only runs report via lipsync_only_started, not dubbing_completed
    track('dubbing_completed', {
      ...await spacePlanProps(ctx.spaceSeq),
      input_count: perInput.length, ok_count: okCount, fail_count: failCount,
      had_split: perInput.some((p) => (p.chunks?.length ?? 0) > 1),
      had_lipsync: allResults.some((r) => r.lipsync),
      duration_sec: totalDurationSec(perInput),
      source_lang: ctx.source, target_lang: (ctx.targets || []).join(','),
      is_resume: !!ctx.isResume, recovered: !!ctx.isResume && ctx.resumedFrom === 'quota' && okCount > 0,
    });
  }
}

// New run: schedule all inputs as a single pool. Per-input split/upload happens once (secures mediaSeq) → reused per language.
async function runPool(args) {
  if (args.noSave && args.lipsync) throw new UsageError('--no-save cannot be combined with --lipsync (the lip-synced video must be downloaded).');
  await ensureKey();
  const wantedTargets = String(args.target).split(',').map((t) => t.trim()).filter(Boolean); // --target en,ja,ko
  if (!wantedTargets.length) throw new UsageError('No target language specified (--target en,ja,...)');
  let inputs = await expandInputs(args.inputs, { recursive: args.recursive });
  if (args.lipsync) {
    // Lip-sync applies to video only — drop audio inputs up-front (before any upload).
    const isAudioInput = (i) => AUDIO_EXT.test(i.originalName ?? i.localPath ?? '');
    const audio = inputs.filter(isAudioInput);
    if (audio.length && audio.length === inputs.length) { console.error('Lip-sync requires video input.'); throw new ExitCode(1); }
    for (const a of audio) notify(`Skipped (lip-sync requires video): ${labelOf(a)}`);
    inputs = inputs.filter((i) => !isAudioInput(i));
    notify('Lip-sync requested — dubbing first, then lip-sync generation (this takes considerably longer than dubbing alone).');
  }
  const multiInput = inputs.length > 1;
  const file = resumePath({ out: args.out, inputs, multiInput });
  guardExistingState(file); // before validate/space/upload — never silently restart (and re-bill) an interrupted run
  const { targets, source } = await validateLanguages(wantedTargets, args.source); // typo-fail before asking anything
  const spaceSeq = await ensureSpace(args); // ask before any download/upload work (cheap to re-run with --space)
  const ctx = { spaceSeq, source, targets, out: args.out, multiInput, file, prevDone: {}, lipsync: !!args.lipsync };

  // Per-input split/upload → tag every part with inputId into a single pool.
  const pool = [];
  const perInput = [];
  const saver = manifestSaver(ctx, perInput);
  for (let id = 0; id < inputs.length; id++) {
    const inp = inputs[id];
    const tag = multiInput ? `[${id + 1}/${inputs.length}] ${labelOf(inp)}` : labelOf(inp);
    let chunks;
    try {
      ({ chunks } = await resolveChunks(inp, spaceSeq, { log, notify, allowSplit: args.allowSplit }));
    } catch (e) {
      if (e?.name === 'SplitConfirmNeeded') {
        track('split_confirm_needed', splitConfirmProps(e.details));
        console.log(splitConfirmMessage(e.details, tag));
        // Nothing is billed yet at the split stage, so discard any partial state so the --allow-split re-run isn't blocked by the resume guard.
        try { if (existsSync(file)) unlinkSync(file); } catch { /* ignore */ }
        throw new ExitCode(3);
      }
      if (isAuthError(e)) { track('error', { error_class: 'auth' }); console.log(`\n${friendlyError(e)}`); return; } // key issues abort everything
      if (e?.name === 'UnsupportedMediaError') { notify(skipMsg(labelOf(inp), e)); continue; } // unsupported → skip
      console.log(`${tag} — split/upload failed: ${friendlyError(e)}`); continue;
    }
    if (chunks.length > 1) notify(`Split complete — ${labelOf(inp)} (${chunks.length} parts)`);
    const noDownload = !!args.noSave && chunks.length === 1; // --no-save is single-input only; a split video's merged file needs a local download
    if (args.noSave && chunks.length > 1) notify(`--no-save is not available for split videos (merging needs a local download) — ${labelOf(inp)} will be saved normally.`);
    for (const c of chunks) pool.push({ ...c, inputId: id, noDownload });
    perInput.push({ inputId: id, inp, ref: refOf(inp), chunks });
    saver.writeNow(); // the chunk plan (boundaries) survives a crash from this point on
  }
  if (!pool.length) { notify('No inputs to process.'); return; }

  if (args.lipsync && !args.force) await creditPreflight(perInput, spaceSeq, targets.length);

  const inputDurs = inputDurationsSec(perInput).filter((d) => d != null);
  track('dub_submitted', {
    ...await spacePlanProps(spaceSeq), input_count: perInput.length, parts: pool.length, target_count: targets.length, has_lipsync: !!args.lipsync,
    duration_sec: inputDurs.length ? inputDurs.reduce((a, b) => a + b, 0) : null,
    input_durations_sec: inputDurs.length ? inputDurs : null,
  });
  notify(`Translating${targets.length > 1 ? ` (${targets.join(', ')})` : ''}`);
  // Fill all inputs×parts×languages into one queue for concurrent processing. Submit as many as there are empty slots and add more every 5 minutes.
  const sched = await runSchedule(pool, spaceSeq, { source, targets, lipsync: !!args.lipsync }, { log, notify, onResult: saver.onResult, onSubmit: saver.onSubmit });

  await finishPool([...sched.results.values()], perInput, { ...ctx, sched });
}

// Upfront credit-estimate gate for --lipsync: the dub+lip-sync chain is long, and running out of credits
// half-way strands the user mid-chain — warn before submitting anything when the estimate clearly exceeds
// the remaining credits. Durations aren't always known locally (no probe available, external URL) — then
// the gate is skipped and the server's own billing check decides.
async function creditPreflight(perInput, spaceSeq, targetCount) {
  const plan = await getPlanStatus(spaceSeq);
  const remaining = plan?.remainingQuota;
  if (remaining == null || typeof remaining !== 'number') return;
  // 4K+ surcharge applies to specific plans only (allowlist — an unknown tier gets no surcharge; the server bills authoritatively).
  const uhdBilled = UHD_BILLED_TIERS.includes(String(plan.planTier ?? '').toLowerCase());
  let needed = 0;
  let anyUhd = false;
  for (const pin of perInput) {
    let inputMs = 0;
    for (const c of pin.chunks) {
      let ms = Number.isFinite(c.startMs) && Number.isFinite(c.endMs) ? c.endMs - c.startMs : null;
      if (ms == null && c.source === 'local' && (c.path || pin.inp?.localPath)) {
        ms = (await probe(c.path ?? pin.inp.localPath).catch(() => ({}))).durationMs ?? null;
      }
      if (ms == null || ms <= 0) return; // unknown duration → no estimate possible
      inputMs += ms;
    }
    let mult = 1;
    if (uhdBilled) {
      const src = pin.inp?.localPath ?? pin.chunks.find((c) => c.path)?.path;
      const { width = 0, height = 0 } = src ? await probe(src).catch(() => ({})) : {};
      if (Math.max(width, height) >= 3840) { mult = UHD_CREDIT_MULT; anyUhd = true; } // resolution unknown → assume non-4K (estimate only; the server bills authoritatively)
    }
    needed += Math.ceil(inputMs / 1000) * (CREDIT_RATE_DUB + CREDIT_RATE_LIPSYNC) * targetCount * mult;
  }
  if (!needed || remaining >= needed) return;
  track('credit_check_blocked', { credits_needed: needed, credits_remaining: remaining, ...await spacePlanProps(spaceSeq) });
  console.log(`[credit-check] Estimated credits for dubbing + lip-sync: ~${needed}${anyUhd ? ` (includes the ×${UHD_CREDIT_MULT} 4K surcharge)` : ''}. Credits left: ${remaining}.`);
  console.log('[credit-check] The run would stop part-way. Ask the user to top up first, or approve continuing anyway — then re-run the same command with --force (whatever completes is kept; the rest resumes later):');
  console.log(`  → ${withUtm(SUBSCRIPTION_URL)}`);
  throw new ExitCode(3);
}

// Resume: completed parts (OK) are re-downloaded from the server via projectSeq; the rest (PASSTHROUGH/unprocessed) are re-cut from the original and processed → merged.
// v5 adds submit checkpoints (RUN/LSRUN) and the lip-sync chain (LSWAIT) — nothing already paid for is ever re-submitted.
async function runResume(file) {
  await ensureKey();
  const m = JSON.parse(readFileSync(file, 'utf8'));
  setTelemetrySpace(m.spaceSeq); // resume bypasses ensureSpace — attach the workspace from the manifest
  if (m.kind === 'separation') return runResumeSeparation(m, file); // separation has its own (scheduler-less) resume
  if (m.version !== 4 && m.version !== 5) throw new Error('Unsupported state-file format — run again from the original.');
  const targets = m.targets ?? [m.opts?.target ?? 'en'];
  const multiInput = (m.inputs?.length ?? 0) > 1;
  const lipsync = !!m.lipsync;
  const ctx = { spaceSeq: m.spaceSeq, source: m.opts?.source ?? 'auto', targets, out: m.out, multiInput, file, prevDone: m.done ?? {}, lipsync, isResume: true, resumedFrom: m.stop_reason ?? 'manual' };
  track('resume_started', { mode: 'resume', resumed_from: m.stop_reason ?? 'manual' });
  const outDir = await makeTempDir('dubbing-resume-');
  const matCache = new Map(); // `${inputId}|${index}` → re-cut path (once per part, shared across languages)

  const downloaded = [];
  const skip = new Set();
  const pool = [];
  const perInput = [];
  const saver = manifestSaver(ctx, perInput, m.done ?? {});

  for (const pin of m.inputs) {
    const inputStr = pin.ref.source === 'local' ? pin.ref.localPath : pin.ref.sourceUrl;
    let prepared = null;
    try {
      prepared = await prepareInput(inputStr); // re-check local / re-download URL
    } catch (e) {
      // Server-side work (re-downloads, pending lip-sync) can still proceed without the original;
      // only parts that would need re-cutting/re-uploading are skipped below.
      console.log(`Original not available: ${pin.ref.originalName ?? inputStr ?? 'input'} (${e.message}) — continuing with server-side results only.`);
    }
    const inp = prepared
      ? { ...prepared, originalName: prepared.originalName ?? pin.ref.originalName }
      : { source: pin.ref.source ?? 'local', localPath: pin.ref.localPath ?? null, originalName: pin.ref.originalName ?? null };
    const localPath = prepared ? (prepared.localPath ?? prepared.path ?? null) : null;
    const materialize = async (c) => {
      if (c.source === 'external') return null; // external cannot be re-cut → resubmit as-is
      if (!localPath) throw new Error('Original not found — cannot resume this part.');
      if (c.endMs == null) return localPath; // if whole (not split), the original
      const mk = `${pin.inputId}|${c.index}`;
      if (!matCache.has(mk)) matCache.set(mk, await recutChunk(localPath, c.startMs, c.endMs));
      return matCache.get(mk);
    };

    // Completed parts use re-download/original; LSWAIT/LSRUN continue the lip-sync chain from the recorded
    // projectSeq (never re-submitting paid work); the rest are resubmission targets (excluded from skip).
    for (const c of pin.chunks) {
      for (const target of targets) {
        const k = `${pin.inputId}|${c.index}|${target}`;
        const d = m.done?.[k];
        const base = { inputId: pin.inputId, index: c.index, target };
        const tag = `[input ${pin.inputId + 1}] part ${c.index + 1}(${target})`;
        if (d?.status === 'OK' || d?.status === 'RUN') {
          const out = join(outDir, `dub_${pin.inputId}_${String(c.index).padStart(3, '0')}_${target}.mp4`);
          try {
            const dl = await download(d.projectSeq, m.spaceSeq, { kind: c.kind, outPath: out, lipsync: !!d.lipsync });
            downloaded.push({
              ...base, status: 'OK', path: out, projectId: d.projectSeq, name: dl.fileName,
              ...(d.lipsync ? { lipsync: true, dubProjectId: d.dubSeq ?? null } : {}),
              ...(d.lipsyncFailed ? { lipsyncFailed: true } : {}),
            });
            log(`${tag} re-downloaded`);
            skip.add(k);
          } catch {
            // Not downloadable (yet). Only a confirmed server-side failure gets re-dubbed; otherwise keep the
            // projectSeq and let a later resume fetch it — never re-spend credits on a job that may still finish.
            let failedOnServer = false;
            try { failedOnServer = (await getStatus(d.projectSeq, m.spaceSeq)).state === 'failed'; } catch { /* unknown → keep waiting */ }
            if (failedOnServer) {
              log(`${tag} failed on the server — will re-dub`);
            } else {
              downloaded.push({ ...base, status: 'DLFAIL', projectId: d.projectSeq, reason: 'download_failed', ...(d.lipsync ? { lipsync: true, dubProjectId: d.dubSeq ?? null } : {}) });
              log(`${tag} not ready/download failed — resume again later (no re-dub)`);
              skip.add(k);
            }
          }
        } else if (d?.status === 'LSWAIT') {
          // Dubbing project recorded; lip-sync still owed for this part.
          let s = null;
          try { s = await getStatus(d.projectSeq, m.spaceSeq); } catch { /* unknown → treat as still processing */ }
          if (s?.state === 'complete') {
            pool.push({ inputId: pin.inputId, index: c.index, stage: 'lipsync', parentSeq: d.projectSeq, target, kind: c.kind, startMs: c.startMs, endMs: c.endMs });
            log(`${tag} dubbed — lip-sync will be requested`);
            skip.add(k);
          } else if (s?.state === 'failed') {
            log(`${tag} dubbing failed on the server — will re-dub`);
          } else {
            downloaded.push({ ...base, status: 'DLFAIL', projectId: d.projectSeq, lipsyncPending: true, reason: 'dub_processing' });
            log(`${tag} dubbing still processing on the server — resume again later`);
            skip.add(k);
          }
        } else if (d?.status === 'LSRUN') {
          // Lip-sync already submitted — never submit again (it would generate and bill again): download, wait, or fall back.
          const out = join(outDir, `lip_${pin.inputId}_${String(c.index).padStart(3, '0')}_${target}.mp4`);
          try {
            const dl = await download(d.projectSeq, m.spaceSeq, { lipsync: true, outPath: out });
            downloaded.push({ ...base, status: 'OK', path: out, projectId: d.projectSeq, lipsync: true, dubProjectId: d.dubSeq ?? null, name: dl.fileName });
            log(`${tag} lip-sync re-downloaded`);
            skip.add(k);
          } catch {
            let s = null;
            try { s = await getStatus(d.projectSeq, m.spaceSeq); } catch { /* unknown → keep waiting */ }
            if (s?.state === 'failed' && d.dubSeq != null) {
              const out2 = join(outDir, `dub_${pin.inputId}_${String(c.index).padStart(3, '0')}_${target}.mp4`);
              try {
                const dl = await download(d.dubSeq, m.spaceSeq, { kind: c.kind, outPath: out2 });
                downloaded.push({ ...base, status: 'OK', path: out2, projectId: d.dubSeq, lipsyncFailed: true, reason: s.message ?? 'lipsync_failed', name: dl.fileName });
                log(`${tag} lip-sync failed — dubbed video delivered instead`);
              } catch {
                downloaded.push({ ...base, status: 'DLFAIL', projectId: d.dubSeq, lipsyncFailed: true, reason: 'download_failed' });
              }
              skip.add(k);
            } else {
              downloaded.push({ ...base, status: 'DLFAIL', projectId: d.projectSeq, lipsync: true, dubProjectId: d.dubSeq ?? null, reason: 'download_failed' });
              log(`${tag} lip-sync still processing — resume again later`);
              skip.add(k);
            }
          }
        } else if (d?.status === 'PASSTHROUGH') {
          try {
            downloaded.push({ ...base, status: 'PASSTHROUGH', path: await materialize(c) });
          } catch (e) {
            log(`${tag} silent part needs the original video — left out of the merge (${e.message})`);
          }
          skip.add(k);
        }
      }
    }

    // Re-cut only parts that have at least one incomplete language and add them to the pool (languages are filtered out via skip).
    for (const c of pin.chunks) {
      const missing = targets.filter((t) => !skip.has(`${pin.inputId}|${c.index}|${t}`));
      if (!missing.length) continue;
      if (c.parentSeq != null) {
        // lipsync-only plan interrupted before submission — the dubbed project is known, only lip-sync is owed
        for (const t of missing) pool.push({ inputId: pin.inputId, index: c.index, stage: 'lipsync', parentSeq: c.parentSeq, target: t, kind: c.kind ?? 'video', startMs: c.startMs, endMs: c.endMs });
      } else if (c.source === 'external') {
        pool.push({ inputId: pin.inputId, index: c.index, source: 'external', sourceUrl: c.sourceUrl, kind: c.kind });
      } else {
        try {
          const path = await materialize(c);
          pool.push({ inputId: pin.inputId, index: c.index, source: 'local', path, startMs: c.startMs, endMs: c.endMs, originalName: basename(path), title: c.title, kind: c.kind });
        } catch (e) {
          log(`[input ${pin.inputId + 1}] part ${c.index + 1} needs the original video to be re-dubbed — skipped (${e.message})`);
        }
      }
    }
    perInput.push({ inputId: pin.inputId, inp, ref: pin.ref, chunks: pin.chunks });
  }

  if (pool.length) notify('Translating (resume)');
  const sched = pool.length
    ? await runSchedule(pool, m.spaceSeq, { source: m.opts?.source ?? 'auto', targets, done: skip, lipsync }, { log, notify, onResult: saver.onResult, onSubmit: saver.onSubmit })
    : { results: new Map(), stopped: false, pendingLeft: [] };

  await finishPool([...downloaded, ...sched.results.values()], perInput, { ...ctx, sched });
}

// Lip-sync an already-dubbed project set: --lipsync-only "<project-ref JSON | seq[,seq...]>".
// Nothing is uploaded or re-dubbed — each part's dubbed project gets a lip-sync request (billed by the
// server as a new generation), then the results are downloaded and merged like a normal run.
async function runLipsyncOnly(args) {
  await ensureKey();
  const raw = String(args.lipsyncOnly).trim();
  let ref;
  if (raw.startsWith('{')) {
    try { ref = JSON.parse(raw); } catch { throw new UsageError('Invalid --lipsync-only value — pass the [project-ref] JSON or a projectSeq list.'); }
  } else if (/^\d+(\s*,\s*\d+)*$/.test(raw)) {
    ref = { parts: raw.split(',').map((s) => ({ seq: Number(s.trim()) })) };
  } else {
    throw new UsageError('Invalid --lipsync-only value — pass the [project-ref] JSON or a projectSeq list.');
  }
  const parts = Array.isArray(ref.parts) ? ref.parts : [];
  if (!parts.some((p) => p?.seq != null)) throw new UsageError('No dubbed project found in the --lipsync-only reference.');
  const lsMs = parts.reduce((s, p) => { const r = p?.ms ?? p?.pt; return s + (Array.isArray(r) && r.length === 2 ? Math.max(0, r[1] - r[0]) : 0); }, 0);

  const target = ref.lang ?? 'out';
  const localPath = ref.input && !/^[a-z]+:\/\//i.test(ref.input) ? ref.input : null;
  const inp = { source: 'local', localPath, originalName: localPath ? basename(localPath) : ref.input ?? null };
  const file = resumePath({ out: args.out, inputs: [inp], multiInput: false });
  guardExistingState(file); // an interrupted earlier run owns this state file — resume it instead of re-billing
  const spaceSeq = Number(ref.space) || await ensureSpace(args);
  setTelemetrySpace(spaceSeq); // a project-ref carrying `space` skips ensureSpace, which is what normally sets this
  const ctx = { spaceSeq, source: 'auto', targets: [target], out: args.out, multiInput: false, file, prevDone: {}, lipsync: true, lipsyncOnly: true };
  track('lipsync_only_started', { ...await spacePlanProps(spaceSeq), input_count: 1, parts: parts.length, duration_sec: lsMs > 0 ? Math.round(lsMs / 1000) : null });

  const chunks = parts.map((p, i) => ({
    index: i, source: 'local',
    startMs: p?.ms?.[0] ?? p?.pt?.[0] ?? null, endMs: p?.ms?.[1] ?? p?.pt?.[1] ?? null,
    kind: 'video', ...(p?.seq != null ? { parentSeq: p.seq } : {}),
  }));
  const perInput = [{ inputId: 0, inp, ref: { source: 'local', localPath, originalName: inp.originalName }, chunks }];
  const saver = manifestSaver(ctx, perInput);

  const downloaded = [];
  const pool = [];
  for (const c of chunks) {
    if (c.parentSeq == null) {
      // silent segment of the original run — rebuild it from the original video for the merge
      if (!localPath) { console.error('This reference contains silent segments — the original video path is required to rebuild them.'); throw new ExitCode(1); }
      const r = { inputId: 0, index: c.index, target, status: 'PASSTHROUGH', path: await recutChunk(localPath, c.startMs, c.endMs) };
      downloaded.push(r);
      saver.onResult(r);
    } else {
      pool.push({ inputId: 0, index: c.index, stage: 'lipsync', parentSeq: c.parentSeq, target, kind: 'video', startMs: c.startMs, endMs: c.endMs });
    }
  }
  saver.writeNow();
  notify('Requesting lip-sync for the existing dubbed project — no re-dubbing, no re-upload.');
  const sched = await runSchedule(pool, spaceSeq, { targets: [target], lipsync: true }, { log, notify, onResult: saver.onResult, onSubmit: saver.onSubmit });
  await finishPool([...downloaded, ...sched.results.values()], perInput, { ...ctx, sched });
}

// ── audio separation (--separate) ─────────────────────────
// Voice/background separation — no languages involved. Chunks are processed sequentially (one queue slot),
// long/large sources reuse the same auto-split, and per-track pieces are merged back like dubbed parts.
// Billing ≈ 0.5 credit per second (server authoritative). Interrupted runs are not resumable yet (re-run re-bills).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SEPARATION_TRACKS = ['voice', 'background', 'sub_background'];

// Separation resume state (version 1, kind 'separation'): the chunk plan + a per-chunk projectId checkpoint.
// Mirrors the dubbing manifest but keyed by inputId|chunkIndex (no target language).
function buildSepManifest(ctx, perInput, done) {
  return {
    version: 1, kind: 'separation', spaceSeq: ctx.spaceSeq, out: ctx.out ?? null,
    inputs: perInput.map((p) => ({
      inputId: p.inputId, ref: p.ref,
      chunks: p.chunks.map((c) => ({
        index: c.index, source: c.source, sourceUrl: c.sourceUrl ?? null,
        startMs: c.startMs ?? null, endMs: c.endMs ?? null, title: c.title ?? null, kind: c.kind ?? null,
      })),
    })),
    done, // `${inputId}|${index}` → { status:'RUN'|'OK'|'HARD_FAIL', projectId?, reason? }
  };
}
function sepSaver(ctx, perInput, prevDone = {}) {
  const done = { ...prevDone };
  const writeNow = () => {
    try {
      mkdirSync(dirname(ctx.file), { recursive: true });
      const tmp = ctx.file + '.tmp';
      writeFileSync(tmp, JSON.stringify(buildSepManifest(ctx, perInput, done)), 'utf8');
      renameSync(tmp, ctx.file);
    } catch { /* best-effort — saving state must never break the run */ }
  };
  return {
    writeNow, done,
    // The paid projectId is persisted the moment it exists → a hard kill can't cause a re-submission on resume.
    onSubmit: (inputId, index, projectId) => { done[`${inputId}|${index}`] = { status: 'RUN', projectId }; writeNow(); },
    onComplete: (inputId, index, projectId) => { done[`${inputId}|${index}`] = { status: 'OK', projectId }; writeNow(); },
    onFail: (inputId, index, reason) => { done[`${inputId}|${index}`] = { status: 'HARD_FAIL', reason }; writeNow(); },
  };
}

async function runSeparation(args) {
  await ensureKey();
  const inputs = await expandInputs(args.inputs, { recursive: args.recursive });
  const multiInput = inputs.length > 1;
  const file = resumePath({ out: args.out, inputs, multiInput });
  guardExistingState(file); // block re-running the original; --resume continues without re-billing submitted parts
  const spaceSeq = await ensureSpace(args);
  const ctx = { spaceSeq, out: args.out ?? null, file };
  const perInput = [];
  const saver = sepSaver(ctx, perInput);
  // Phase 1 — resolve chunk plans (split-confirm happens here) and persist them before any submission.
  for (let id = 0; id < inputs.length; id++) {
    const inp = inputs[id];
    let chunks;
    try {
      ({ chunks } = await resolveChunks(inp, spaceSeq, { log, notify, allowSplit: args.allowSplit }));
    } catch (e) {
      if (e?.name === 'SplitConfirmNeeded') {
        track('split_confirm_needed', splitConfirmProps(e.details));
        console.log(splitConfirmMessage(e.details, multiInput ? labelOf(inp) : null, 'separate'));
        try { if (existsSync(file)) unlinkSync(file); } catch { /* nothing billed yet → safe to discard */ }
        throw new ExitCode(3);
      }
      if (e?.name === 'UnsupportedMediaError') { notify(skipMsg(labelOf(inp), e)); continue; }
      notify(`Could not prepare: ${labelOf(inp)} — ${friendlyError(e)}`); continue;
    }
    if (chunks.length > 1) notify(`Split complete — ${labelOf(inp)} (${chunks.length} parts)`);
    perInput.push({ inputId: id, inp, ref: refOf(inp), chunks });
    saver.writeNow();
  }
  if (!perInput.length) { notify('No inputs to separate.'); return; }
  notify('Separating voice/background');
  // Phase 2 — submit (checkpointed) → wait → download → merge → save.
  const pending = await separationProcess(perInput, spaceSeq, ctx, saver, null, false);
  finishSepState(file, pending);
}

// Drop the state file only when nothing paid is still owed; otherwise keep it and point at --resume (no re-billing).
function finishSepState(file, pending) {
  if (pending) { notify(`Some parts still need downloading — resume with: node scripts/dubbing.mjs --resume "${file}"`); return; }
  try { if (existsSync(file)) unlinkSync(file); } catch { /* ignore */ }
}

// Resume: reload the chunk plan, re-cut/re-upload only the parts never submitted, poll/re-download the submitted ones.
async function runResumeSeparation(m, file) {
  if (m.version !== 1) throw new Error('Unsupported separation state-file format — run again from the original.');
  const spaceSeq = m.spaceSeq;
  const ctx = { spaceSeq, out: m.out ?? null, file };
  const perInput = [];
  const recutCache = new Map(); // `${inputId}|${index}` → re-cut path (once per part)
  for (const pin of m.inputs) {
    const inputStr = pin.ref.source === 'local' ? pin.ref.localPath : pin.ref.sourceUrl;
    let localPath = null; // null when the original can't be re-prepared → materializeFor's guard fires cleanly (server-side parts still resume)
    try { const prepared = await prepareInput(inputStr); localPath = prepared.localPath ?? prepared.path ?? null; }
    catch (e) { console.log(`Original not available: ${pin.ref.originalName ?? inputStr ?? 'input'} (${e.message}) — server-side results only.`); }
    perInput.push({ inputId: pin.inputId, ref: pin.ref, inp: pin.ref, chunks: pin.chunks, _localPath: localPath });
  }
  const saver = sepSaver(ctx, perInput, m.done ?? {});
  const materializeFor = async (pin, c) => {
    if (c.source === 'external') return null; // can't re-cut → upload the source URL
    if (!pin._localPath) throw new Error('Original not found — cannot resume this part.');
    if (c.endMs == null) return pin._localPath; // whole (unsplit) → the original
    const mk = `${pin.inputId}|${c.index}`;
    if (!recutCache.has(mk)) recutCache.set(mk, await recutChunk(pin._localPath, c.startMs, c.endMs));
    return recutCache.get(mk);
  };
  const pending = await separationProcess(perInput, spaceSeq, ctx, saver, materializeFor, true);
  finishSepState(file, pending);
}

// Per-input: separate every chunk (checkpointing each submission), merge tracks, save. Shared by run + resume.
// Returns true when some paid part is still owed (undelivered) → the caller must keep the state file for resume.
async function separationProcess(perInput, spaceSeq, ctx, saver, materializeFor, isResume = false) {
  const usedByDir = new Map();
  const lines = [];
  let ok = 0, fail = 0;
  const flags = { pending: false };
  const tmp = await makeTempDir('dubbing-sep-');
  for (const pin of perInput) {
    try {
      const byTrack = await separateChunks(pin, spaceSeq, tmp, saver, materializeFor, flags);
      const line = await saveSeparationTracks(pin, byTrack, { out: ctx.out, usedByDir });
      lines.push(line);
      if (line.startsWith('Done')) ok++; else fail++;
    } catch (e) {
      if (e?.httpStatus === 402) { // out of credits — deliver what finished + top-up/resume path, then stop
        if (lines.length) console.log('\n' + lines.join('\n'));
        const plan = await getPlanStatus(spaceSeq);
        console.log(messages.quotaExceeded({ planTier: plan?.planTier, remainingQuota: plan?.remainingQuota, resumeHint: `node scripts/dubbing.mjs --resume "${ctx.file}"` }));
        throw new ExitCode(1);
      }
      if (e?.name === 'UnsupportedMediaError') { notify(skipMsg(labelOf(pin.inp ?? pin.ref), e)); continue; }
      flags.pending = true; // errored after some chunks may have been billed → keep state so resume re-downloads them
      fail++;
      lines.push(`Could not separate: ${labelOf(pin.inp ?? pin.ref)} — ${friendlyError(e)}`);
    }
  }
  console.log('\n' + lines.join('\n'));
  if (perInput.length > 1) console.log(`\nSummary: ${ok} done · ${fail} failed`);
  track('separation_completed', { ...await spacePlanProps(spaceSeq), input_count: perInput.length, ok_count: ok, fail_count: fail, duration_sec: totalDurationSec(perInput), is_resume: isResume });
  return flags.pending;
}

// Separate one input's chunks. A chunk with a recorded projectId is polled/re-downloaded (no re-submit); the rest are
// (re-cut/uploaded and) submitted, checkpointing the projectId the instant it exists.
async function separateChunks(pin, spaceSeq, tmp, saver, materializeFor, flags) {
  const byTrack = new Map(SEPARATION_TRACKS.map((t) => [t, []]));
  const gap = (index, reason) => { for (const t of SEPARATION_TRACKS) byTrack.get(t).push({ index, status: 'HARD_FAIL', reason }); };
  for (const c of pin.chunks) {
    const prev = saver.done[`${pin.inputId}|${c.index}`];
    if (prev?.status === 'HARD_FAIL') { gap(c.index, prev.reason ?? 'failed'); continue; }
    let projectId = prev?.projectId ?? null;
    try {
      if (projectId == null) { // never submitted → (re-cut/upload and) submit
        let mediaSeq = c.mediaSeq ?? null, kind = c.kind ?? 'video';
        if (mediaSeq == null) {
          const cut = materializeFor ? await materializeFor(pin, c) : null;
          const ref = cut ? { source: 'local', localPath: cut, originalName: basename(cut) } // basename keeps the extension (c.title has none)
            : (c.source === 'external' ? { source: 'external', sourceUrl: c.sourceUrl } : refOf(pin.inp ?? pin.ref));
          ({ seq: mediaSeq, kind } = await upload(ref, spaceSeq));
        }
        ([projectId] = await requestAudioSeparation(spaceSeq, mediaSeq, { title: c.title, kind }));
        if (projectId == null) throw new Error('Separation request was not accepted.');
        saver.onSubmit(pin.inputId, c.index, projectId); // checkpoint the billed unit before any wait
        if (pin.chunks.length > 1) log(`part ${c.index + 1}/${pin.chunks.length}: separation submitted`);
      }
      if (prev?.status !== 'OK') { // RUN (resume) or freshly submitted → wait for completion
        const st = await waitForProject(projectId, spaceSeq);
        if (st.state !== 'complete') {
          if (st.timedOut) { flags.pending = true; gap(c.index, st.message ?? 'timed out'); continue; } // may still be running (paid) → keep the RUN checkpoint so resume re-polls it
          saver.onFail(pin.inputId, c.index, st.message ?? st.failureReason ?? 'failed'); // genuine server failure → terminal
          gap(c.index, st.message ?? st.failureReason ?? 'failed');
          continue;
        }
        saver.onComplete(pin.inputId, c.index, projectId);
      }
      const tracks = await downloadSeparation(projectId, spaceSeq, (label, ext) => join(tmp, `sep_${pin.inputId}_${c.index}_${label}${ext}`));
      for (const t of tracks) byTrack.get(t.label)?.push({ index: c.index, status: 'OK', path: t.path, name: t.fileName });
    } catch (e) {
      if (e?.httpStatus === 402) throw e; // credit-out → let separationProcess deliver finished parts + surface the resume path
      // One part failed to prepare/upload/submit/download — gap it so finished sibling parts still merge & save; keep state so resume retries.
      flags.pending = true;
      gap(c.index, friendlyError(e));
    }
  }
  return byTrack;
}

async function saveSeparationTracks(pin, byTrack, { out, usedByDir }) {
  const inp = pin.inp ?? pin.ref;
  const dir = out ?? inputSaveDir(inp); // --separate treats --out as a folder (three tracks per input)
  mkdirSync(dir, { recursive: true });
  const stem = String(labelOf(inp)).replace(/\.[^.\\/]+$/, '') || 'output';
  const saved = [];
  let excluded = false;
  for (const t of SEPARATION_TRACKS) {
    const results = byTrack.get(t);
    if (!results.some((r) => r.status === 'OK')) continue;
    const { outputs, report } = await mergeGroups(results);
    if (report) excluded = true;
    for (let i = 0; i < outputs.length; i++) {
      const o = outputs[i];
      const ext = extname(o.name ?? o.path ?? '') || '.wav';
      const name = reserve(dir, `${stem}.${t}${outputs.length > 1 ? `_${i + 1}` : ''}${ext}`, usedByDir);
      copyFileSync(o.path, join(dir, name));
      saved.push(name);
    }
  }
  if (!saved.length) {
    const why = byTrack.get('voice').find((r) => r.reason)?.reason ?? 'no result';
    return `Could not separate: ${labelOf(inp)} — ${why}`;
  }
  return `Done (separation): ${labelOf(inp)} → ${saved.join(', ')}${excluded ? ' (some parts excluded)' : ''}`;
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
    if (p !== last) { last = p; lastChange = Date.now(); if (p > 0) log(`separating... ${p}%`); }
    if (Date.now() - lastChange > MAX_IDLE_MS) return { state: 'failed', timedOut: true, message: 'timed out (no progress)' };
    await sleep(POLL_INTERVAL_MS);
  }
}

// Pure helper exports for testing (when run directly, only main below executes).
export { parseArgs, targetPaths, buildManifest, doneEntry, manifestSaver, finishPool, refOf, resumePath, explicitOutPath, remainingMinutes, guardExistingState, splitConfirmMessage, buildSepManifest, sepSaver };

// The workspace as far as argv alone reveals it, for the events that fire before the space gate.
// --resume and --lipsync-only both carry it in their own payload, so no network call is needed.
function earlySpaceHint(args) {
  if (/^\d+$/.test(String(args.space ?? '').trim())) return args.space; // raw seq; a space NAME needs the gate
  if (args.resume) {
    try { return JSON.parse(readFileSync(args.resume, 'utf8')).spaceSeq; } catch { /* unreadable → no hint */ }
  }
  const ref = String(args.lipsyncOnly ?? '').trim();
  if (ref.startsWith('{')) {
    try { return JSON.parse(ref).space; } catch { /* malformed → no hint */ }
  }
  return null;
}

async function main() {
  let exitCode = 0;
  let updateNotice = null; // daily version check, kicked off in the background and printed after the work finishes
  try {
    preloadKeyEnv(); // pre-inject the key into env before async (at a clean point) → avoid a synchronous powershell call/crash in the main process
    primeTelemetrySpace(); // env pin / previous run — parseArgs itself can emit lang_invalid
    const args = parseArgs(process.argv.slice(2));
    if (!args.help) {
      updateNotice = checkForUpdate().catch(() => null); // non-blocking; never fails the run
      primeTelemetrySpace(earlySpaceHint(args));
      initTelemetry(); // emits first_run once per install
      track('run_started', {
        mode: args.resume ? 'resume' : args.separate ? 'separate' : args.lipsyncOnly ? 'lipsync-only' : args.lipsync ? 'lipsync' : 'dub',
        input_count: args.inputs.length || null,
        target_count: String(args.target).split(',').map((s) => s.trim()).filter(Boolean).length || null,
        has_lipsync: !!(args.lipsync || args.lipsyncOnly),
        source_lang: args.source,
      });
    }
    if (args.help) console.log(USAGE);
    else if (args.resume) await runResume(args.resume);
    else if (args.separate) {
      if (args.lipsync || args.lipsyncOnly) throw new UsageError('Use --separate on its own — it cannot be combined with lip-sync options.');
      if (!args.inputs.length) { console.error(USAGE); exitCode = 1; }
      else await runSeparation(args);
    } else if (args.lipsyncOnly) {
      if (args.inputs.length) throw new UsageError('--lipsync-only takes no input files (the project reference identifies them).');
      if (args.lipsync) throw new UsageError('Use either --lipsync (dub + lip-sync) or --lipsync-only, not both.');
      await runLipsyncOnly(args);
    } else if (!args.inputs.length) {
      console.error(USAGE);
      exitCode = 1;
    } else await runPool(args);
  } catch (e) {
    if (e?.name === 'ExitCode') exitCode = e.code; // message already printed at the throw site
    else if (e?.name === 'UsageError') { console.error(`${e.message}\n${USAGE}`); exitCode = 1; }
    else { track('error', { error_class: errorClass(e) }); console.error(friendlyError(e)); exitCode = 1; }
  } finally {
    await cleanupTempDirs(); // bulk-clean the cut/schedule/merge/download temp folders
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
