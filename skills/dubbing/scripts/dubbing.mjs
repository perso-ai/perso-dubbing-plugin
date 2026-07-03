#!/usr/bin/env node
// /dubbing entry orchestrator.
//   key gate → input(s) → per-input split → global pool scheduler (all inputs×parts×languages in one queue) → per-input/per-language merge → notice.
//   usage: node scripts/dubbing.mjs "<local|URL|folder>" ["<another input>" ...] [--source auto] [--target en,ja] [--space "space name"] [--out path|folder]
//          node scripts/dubbing.mjs --resume "<statefile>"
import { writeFileSync, readFileSync, copyFileSync, mkdirSync, readdirSync, unlinkSync, renameSync, realpathSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, basename, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { resolveKey, onboardingHelp, preloadKeyEnv } from './resolve_key.mjs';
import { expandInputs, prepareInput } from '../lib/input.mjs';
import { dubbingSpaces, getPlanStatus } from '../lib/space.mjs';
import { getLanguages } from '../lib/languages.mjs';
import { resolveChunks, recutChunk } from '../lib/split.mjs';
import { runSchedule } from '../lib/scheduler.mjs';
import { download, getStatus } from '../lib/api_adapter.mjs';
import { mergeGroups } from '../lib/merge.mjs';
import { messages } from '../lib/messages.mjs';
import { cleanupTempDirs, makeTempDir } from '../lib/tmp.mjs';

const log = (m) => console.error('  ' + m); // background verbose log (stderr)
// Milestones exposed to the user (stdout). The agent relays these [progress] lines to chat per the SKILL rules.
const notify = (m) => console.log(`[progress] ${m}`);

// Convert API errors into user-friendly text (avoid exposing raw codes/messages)
function isAuthError(e) {
  return e?.name === 'PersoApiError' && (e.httpStatus === 401 || ['A0009', 'A0010', 'A0011'].includes(e.code ?? ''));
}
function friendlyError(e) {
  if (e?.name === 'MissingKeyError' || isAuthError(e)) {
    return 'API key is missing or invalid (it may be expired or mistyped). Re-register it and try again.\n\n' + onboardingHelp();
  }
  if (e?.name === 'PersoApiError') return 'Something went wrong while processing. Please try again in a moment.';
  return e?.message ?? 'Unknown error';
}

// Key gate with self-healing: when no key is registered, hand off to `resolve_key.mjs --watch` in a child
// process (creates the key file, opens it in the editor, encrypts on save, deletes the file) and continue
// once registered. Runs in a child because Windows DPAPI work (powershell) must not run in this main process.
// PERSO_NO_WATCH=1 restores the old fail-fast behavior (headless/CI).
async function ensureKey() {
  if (resolveKey()) return;
  if (process.env.PERSO_NO_WATCH) {
    console.error(onboardingHelp());
    throw new ExitCode(2);
  }
  notify('No API key registered — a key file will open; paste just your Perso API key and save it. (Get one: https://developers.perso.ai/api-keys)');
  const watcher = fileURLToPath(new URL('./resolve_key.mjs', import.meta.url));
  const code = await new Promise((res) => {
    const child = spawn(process.execPath, [watcher, '--watch'], { stdio: 'inherit' });
    child.on('close', res);
    child.on('error', () => res(1));
  });
  preloadKeyEnv();
  if (code !== 0 || !resolveKey()) {
    console.error(onboardingHelp());
    throw new ExitCode(2);
  }
  notify('API key registered — continuing.');
}

// Space gate: which workspace to dub in. The user only ever sees space NAME + PLAN (never the seq):
// --space accepts a space name (or a raw seq for scripts); PERSO_SPACE_SEQ pins it; a single space is used
// as-is. With several spaces the user chooses — interactively on a TTY; otherwise (agent/background) the
// name+plan options are printed as [space-select] lines and the run exits with code 3 → re-run with
// --space "<space name>".
async function ensureSpace(args) {
  const wanted = args.space != null ? String(args.space).trim() : '';
  if (/^\d+$/.test(wanted)) return Number(wanted); // raw seq — power users/scripts; not shown to end users
  const pinned = Number(process.env.PERSO_SPACE_SEQ);
  if (!wanted && pinned) return pinned;

  const spaces = await dubbingSpaces();
  // Options shown to the user carry "name | (plan) | remaining credits" — never the internal seq.
  // Credits are fetched only when a list is actually displayed (one plan-status call per option).
  const enrich = (list) => Promise.all(list.map(async (s) => ({ ...s, credits: (await getPlanStatus(s.seq))?.remainingQuota ?? null })));
  const label = (s) => [s.name, s.tier ? `(${s.tier})` : '(-)', s.credits != null ? `${s.credits} credits left` : 'credits unknown'].join(' | ');
  const brief = (s) => `${s.name}${s.tier ? ` (${s.tier})` : ''}`;

  if (wanted) {
    const hits = spaces.filter((s) => s.name.toLowerCase() === wanted.toLowerCase());
    if (hits.length === 1) { console.log(`Space: ${brief(hits[0])}`); return hits[0].seq; }
    if (hits.length > 1) {
      console.log(`[space-select] Several spaces share the name "${wanted}" — rename one in Perso, or pin PERSO_SPACE_SEQ:`);
      for (const s of await enrich(hits)) console.log(`  PERSO_SPACE_SEQ=${s.seq}  →  ${label(s)}`);
      throw new ExitCode(3);
    }
    console.log(`[space-select] No space named "${wanted}". Ask the user to pick one of these:`);
    for (const s of await enrich(spaces)) console.log(`  - ${label(s)}`);
    throw new ExitCode(3);
  }

  if (spaces.length === 1) return spaces[0].seq;
  const options = await enrich(spaces);
  if (process.stdin.isTTY && process.stdout.isTTY) {
    console.log('Several spaces are available. Which one should this dubbing run in?');
    options.forEach((s, i) => console.log(`  ${i + 1}) ${label(s)}`));
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Select (number or name): ')).trim();
    rl.close();
    const chosen = options[Number(answer) - 1] ?? options.find((s) => s.name.toLowerCase() === answer.toLowerCase());
    if (!chosen) { console.error('Invalid selection — run again.'); throw new ExitCode(1); }
    console.log(`Space: ${brief(chosen)}`);
    return chosen.seq;
  }
  console.log('[space-select] Several spaces are available — show the user ONLY these options (name | plan | credits left), ask which one to dub in, then re-run the same command with --space "<space name>":');
  for (const s of options) console.log(`  - ${label(s)}`);
  throw new ExitCode(3);
}

const USAGE = [
  'Usage: node scripts/dubbing.mjs "<file|folder|URL>" ["<another input>" ...] [--source auto] [--target en,ja] [--space "space name"] [--out path|folder] [--recursive]',
  '       node scripts/dubbing.mjs --resume "<state-file>"',
].join('\n');

class UsageError extends Error {
  constructor(msg) { super(msg); this.name = 'UsageError'; }
}

// Signals "stop with this exit code" after the message was already printed. Thrown instead of calling
// process.exit() directly: a hard exit while fetch sockets are tearing down hits a Windows libuv assert
// (async.c) and corrupts the exit code — main() sets process.exitCode and lets the loop drain instead.
class ExitCode extends Error {
  constructor(code) { super(`exit ${code}`); this.name = 'ExitCode'; this.code = code; }
}

function parseArgs(argv) {
  const a = { source: 'auto', target: 'en', inputs: [] };
  const VALUE_FLAGS = { '--resume': 'resume', '--source': 'source', '--target': 'target', '--space': 'space', '--out': 'out' };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--help' || t === '-h') a.help = true;
    else if (t === '--recursive') a.recursive = true;
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
      console.error(`Unsupported target language code: "${t}"\nSupported: ${codes.join(', ')}`);
      throw new ExitCode(1);
    }
    return hit;
  });
  let src = source;
  if (source && source !== 'auto') {
    const hit = canon.get(source.toLowerCase());
    if (!hit) {
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
//  3) otherwise (split merge, etc.) → <originalName>.dubbed.<language>.<ext> (_2,_3… if multiple).
//  Save folder: --out (folder if multi-input) > next to the input original > current folder.
function targetPaths(outputs, ctx) {
  const { inp, target, isSplit, multiInput, multiLang, out, usedByDir } = ctx;
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
      const base = `${stem}.dubbed.${target}${outputs.length > 1 ? `_${i + 1}` : ''}${ext}`;
      names.push(reserve(dir, base, usedByDir));
    });
  }
  return names.map((n) => join(dir, n));
}

// Persistable completion entry for one result — what resume needs to skip/re-download. null = nothing worth keeping.
function doneEntry(r) {
  if (r.status === 'OK' || r.status === 'DLFAIL') return { status: 'OK', projectSeq: r.projectId }; // DLFAIL: generated → re-download on resume
  if (r.status === 'PASSTHROUGH') return { status: 'PASSTHROUGH' };
  return null;
}

// Lightweight manifest (v4) holding the chunk plan (boundaries) + only the completion status per (input|part|language).
function buildManifest(ctx, perInput, results, prevDone = {}) {
  const done = { ...prevDone };
  for (const r of results) {
    const e = doneEntry(r);
    if (e) done[`${r.inputId}|${r.index}|${r.target}`] = e;
  }
  return {
    version: 4, spaceSeq: ctx.spaceSeq, opts: { source: ctx.source }, targets: ctx.targets, out: ctx.out ?? null,
    inputs: perInput.map((p) => ({
      inputId: p.inputId, ref: p.ref,
      chunks: p.chunks.map((c) => ({
        index: c.index, source: c.source, sourceUrl: c.sourceUrl ?? null,
        startMs: c.startMs ?? null, endMs: c.endMs ?? null, title: c.title ?? null, kind: c.kind ?? null,
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
    const e = doneEntry(r);
    if (e) { done[`${r.inputId}|${r.index}|${r.target}`] = e; writeNow(); }
  };
  return { writeNow, onResult };
}

// Sum of remaining (unprocessed) chunk durations → minutes (rounded up). null if only boundary-less chunks exist.
function remainingMinutes(chunks) {
  const ms = (chunks || []).reduce(
    (s, c) => s + (Number.isFinite(c?.startMs) && Number.isFinite(c?.endMs) ? c.endMs - c.startMs : 0),
    0,
  );
  return ms > 0 ? Math.ceil(ms / 60000) : null;
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
      if (mergeable.length > 1) notify(`Merging — ${labelOf(pin.inp)}${multiLang ? ` (${target})` : ''}`);
      const { outputs, report } = await mergeGroups(tRes);
      let saved = [];
      if (outputs.length) {
        const paths = targetPaths(outputs, { inp: pin.inp, target, isSplit, multiInput: ctx.multiInput, multiLang, out: ctx.out, usedByDir });
        outputs.forEach((o, i) => copyFileSync(o.path, paths[i]));
        await rm(dirname(outputs[0].path), { recursive: true, force: true }).catch(() => {}); // clean up merge temp folder
        saved = paths;
      }
      if (saved.length) {
        lines.push(`Done: ${tlab} → ${saved.map((p) => basename(p)).join(', ')}${report ? ' (some parts excluded)' : ''}`);
        okCount++;
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
    if (ctx.multiInput && ctx.out) mkdirSync(ctx.out, { recursive: true });
    writeFileSync(ctx.file, JSON.stringify(buildManifest(ctx, perInput, allResults, ctx.prevDone ?? {})), 'utf8');
    if (stopped) {
      const plan = await getPlanStatus(ctx.spaceSeq);
      const min = remainingMinutes(ctx.sched.pendingLeft);
      console.log('\n' + messages.quotaExceeded({
        planTier: plan?.planTier,
        remainingQuota: plan?.remainingQuota,
        remainingNote: min != null ? `~${min} min` : null,
        resumeHint: `node scripts/dubbing.mjs --resume "${ctx.file}"`,
      }));
    } else {
      console.log(`\nSome parts are still finishing on the server or could not be downloaded — resume later to fetch them (no re-dub, no extra credits):\n  node scripts/dubbing.mjs --resume "${ctx.file}"`);
    }
  } else {
    try { unlinkSync(ctx.file); } catch { /* done → clean up resume state-file (ignore if absent) */ }
  }
}

// New run: schedule all inputs as a single pool. Per-input split/upload happens once (secures mediaSeq) → reused per language.
async function runPool(args) {
  await ensureKey();
  const wantedTargets = String(args.target).split(',').map((t) => t.trim()).filter(Boolean); // --target en,ja,ko
  if (!wantedTargets.length) throw new UsageError('No target language specified (--target en,ja,...)');
  const { targets, source } = await validateLanguages(wantedTargets, args.source); // typo-fail before asking anything
  const spaceSeq = await ensureSpace(args); // ask before any download/upload work (cheap to re-run with --space)
  const inputs = await expandInputs(args.inputs, { recursive: args.recursive });
  const multiInput = inputs.length > 1;
  const file = resumePath({ out: args.out, inputs, multiInput });
  const ctx = { spaceSeq, source, targets, out: args.out, multiInput, file, prevDone: {} };

  // Per-input split/upload → tag every part with inputId into a single pool.
  const pool = [];
  const perInput = [];
  const saver = manifestSaver(ctx, perInput);
  for (let id = 0; id < inputs.length; id++) {
    const inp = inputs[id];
    const tag = multiInput ? `[${id + 1}/${inputs.length}] ${labelOf(inp)}` : labelOf(inp);
    let chunks;
    try {
      ({ chunks } = await resolveChunks(inp, spaceSeq, { log, notify }));
    } catch (e) {
      if (isAuthError(e)) { console.log(`\n${friendlyError(e)}`); return; } // key issues abort everything
      if (e?.name === 'UnsupportedMediaError') { notify(skipMsg(labelOf(inp), e)); continue; } // unsupported → skip
      console.log(`${tag} — split/upload failed: ${friendlyError(e)}`); continue;
    }
    if (chunks.length > 1) notify(`Split complete — ${labelOf(inp)} (${chunks.length} parts)`);
    for (const c of chunks) pool.push({ ...c, inputId: id });
    perInput.push({ inputId: id, inp, ref: refOf(inp), chunks });
    saver.writeNow(); // the chunk plan (boundaries) survives a crash from this point on
  }
  if (!pool.length) { notify('No inputs to process.'); return; }

  notify(`Translating${targets.length > 1 ? ` (${targets.join(', ')})` : ''}`);
  // Fill all inputs×parts×languages into one queue for concurrent processing. Submit as many as there are empty slots and add more every 5 minutes.
  const sched = await runSchedule(pool, spaceSeq, { source, targets }, { log, onResult: saver.onResult });

  await finishPool([...sched.results.values()], perInput, { ...ctx, sched });
}

// Resume: completed parts (OK) are re-downloaded from the server via projectSeq; the rest (PASSTHROUGH/unprocessed) are re-cut from the original and processed → merged.
async function runResume(file) {
  await ensureKey();
  const m = JSON.parse(readFileSync(file, 'utf8'));
  if (m.version !== 4) throw new Error('Unsupported state-file format — run again from the original.');
  const targets = m.targets ?? [m.opts?.target ?? 'en'];
  const multiInput = (m.inputs?.length ?? 0) > 1;
  const ctx = { spaceSeq: m.spaceSeq, source: m.opts?.source ?? 'auto', targets, out: m.out, multiInput, file, prevDone: m.done ?? {} };
  const outDir = await makeTempDir('dubbing-resume-');
  const matCache = new Map(); // `${inputId}|${index}` → re-cut path (once per part, shared across languages)

  const downloaded = [];
  const skip = new Set();
  const pool = [];
  const perInput = [];
  const saver = manifestSaver(ctx, perInput, m.done ?? {});

  for (const pin of m.inputs) {
    const inputStr = pin.ref.source === 'local' ? pin.ref.localPath : pin.ref.sourceUrl;
    let prepared;
    try {
      prepared = await prepareInput(inputStr); // re-check local / re-download URL
    } catch (e) {
      console.log(`Input not found, skipping: ${pin.ref.originalName ?? inputStr} (${e.message})`);
      continue;
    }
    const inp = { ...prepared, originalName: prepared.originalName ?? pin.ref.originalName };
    const localPath = prepared.localPath ?? prepared.path ?? null;
    const materialize = async (c) => {
      if (c.source === 'external') return null; // external cannot be re-cut → resubmit as-is
      if (!localPath) throw new Error('Original not found — cannot resume.');
      if (c.endMs == null) return localPath; // if whole (not split), the original
      const mk = `${pin.inputId}|${c.index}`;
      if (!matCache.has(mk)) matCache.set(mk, await recutChunk(localPath, c.startMs, c.endMs));
      return matCache.get(mk);
    };

    // Completed parts ((inputId|index|target) OK/PASSTHROUGH) use re-download/original; the rest are resubmission targets (excluded from skip).
    for (const c of pin.chunks) {
      for (const target of targets) {
        const k = `${pin.inputId}|${c.index}|${target}`;
        const d = m.done?.[k];
        if (d?.status === 'OK') {
          const out = join(outDir, `dub_${pin.inputId}_${String(c.index).padStart(3, '0')}_${target}.mp4`);
          try {
            const dl = await download(d.projectSeq, m.spaceSeq, { kind: c.kind, outPath: out });
            downloaded.push({ inputId: pin.inputId, index: c.index, target, status: 'OK', path: out, projectId: d.projectSeq, name: dl.fileName });
            log(`[input ${pin.inputId + 1}] part ${c.index + 1}(${target}) re-downloaded`);
            skip.add(k);
          } catch {
            // Not downloadable (yet). Only a confirmed server-side failure gets re-dubbed; otherwise keep the
            // projectSeq and let a later resume fetch it — never re-spend credits on a job that may still finish.
            let failedOnServer = false;
            try { failedOnServer = (await getStatus(d.projectSeq, m.spaceSeq)).state === 'failed'; } catch { /* unknown → keep waiting */ }
            if (failedOnServer) {
              log(`[input ${pin.inputId + 1}] part ${c.index + 1}(${target}) failed on the server — will re-dub`);
            } else {
              downloaded.push({ inputId: pin.inputId, index: c.index, target, status: 'DLFAIL', projectId: d.projectSeq, reason: 'download_failed' });
              log(`[input ${pin.inputId + 1}] part ${c.index + 1}(${target}) not ready/download failed — resume again later (no re-dub)`);
              skip.add(k);
            }
          }
        } else if (d?.status === 'PASSTHROUGH') {
          downloaded.push({ inputId: pin.inputId, index: c.index, target, status: 'PASSTHROUGH', path: await materialize(c) });
          skip.add(k);
        }
      }
    }

    // Re-cut only parts that have at least one incomplete language and add them to the pool (languages are filtered out via skip).
    for (const c of pin.chunks) {
      if (!targets.some((t) => !skip.has(`${pin.inputId}|${c.index}|${t}`))) continue;
      if (c.source === 'external') pool.push({ inputId: pin.inputId, index: c.index, source: 'external', sourceUrl: c.sourceUrl, kind: c.kind });
      else {
        const path = await materialize(c);
        pool.push({ inputId: pin.inputId, index: c.index, source: 'local', path, startMs: c.startMs, endMs: c.endMs, originalName: basename(path), title: c.title, kind: c.kind });
      }
    }
    perInput.push({ inputId: pin.inputId, inp, ref: pin.ref, chunks: pin.chunks });
  }

  if (pool.length) notify('Translating (resume)');
  const sched = pool.length
    ? await runSchedule(pool, m.spaceSeq, { source: m.opts?.source ?? 'auto', targets, done: skip }, { log, onResult: saver.onResult })
    : { results: new Map(), stopped: false, pendingLeft: [] };

  await finishPool([...downloaded, ...sched.results.values()], perInput, { ...ctx, sched });
}

// Pure helper exports for testing (when run directly, only main below executes).
export { parseArgs, targetPaths, buildManifest, doneEntry, manifestSaver, finishPool, refOf, resumePath, explicitOutPath, remainingMinutes };

async function main() {
  let exitCode = 0;
  try {
    preloadKeyEnv(); // pre-inject the key into env before async (at a clean point) → avoid a synchronous powershell call/crash in the main process
    const args = parseArgs(process.argv.slice(2));
    if (args.help) console.log(USAGE);
    else if (args.resume) await runResume(args.resume);
    else if (!args.inputs.length) {
      console.error(USAGE);
      exitCode = 1;
    } else await runPool(args);
  } catch (e) {
    if (e?.name === 'ExitCode') exitCode = e.code; // message already printed at the throw site
    else if (e?.name === 'UsageError') { console.error(`${e.message}\n${USAGE}`); exitCode = 1; }
    else { console.error(friendlyError(e)); exitCode = 1; }
  } finally {
    await cleanupTempDirs(); // bulk-clean the cut/schedule/merge/download temp folders
  }
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
