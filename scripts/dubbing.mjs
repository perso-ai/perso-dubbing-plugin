#!/usr/bin/env node
// /dubbing entry orchestrator.
//   key gate → input(s) → per-input split → global pool scheduler (all inputs×parts×languages in one queue) → per-input/per-language merge → notice.
//   usage: node scripts/dubbing.mjs "<local|URL|folder>" ["<another input>" ...] [--source auto] [--target en,ja] [--space N] [--out path|folder]
//          node scripts/dubbing.mjs --resume "<statefile>"
import { writeFileSync, readFileSync, copyFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join, basename, dirname, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveKey, onboardingHelp, preloadKeyEnv } from './resolve_key.mjs';
import { expandInputs, prepareInput } from '../lib/input.mjs';
import { resolveSpace, getPlanStatus } from '../lib/space.mjs';
import { resolveChunks, recutChunk } from '../lib/split.mjs';
import { runSchedule } from '../lib/scheduler.mjs';
import { download } from '../lib/api_adapter.mjs';
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

function parseArgs(argv) {
  const a = { source: 'auto', target: 'en', inputs: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--resume') a.resume = argv[++i];
    else if (t === '--source') a.source = argv[++i];
    else if (t === '--target') a.target = argv[++i];
    else if (t === '--space') a.space = Number(argv[++i]);
    else if (t === '--out') a.out = argv[++i];
    else if (t === '--recursive') a.recursive = true;
    else a.inputs.push(t); // positional args (multiple): URL/path/folder may be mixed
  }
  return a;
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
function explicitOutPath(argOut, target, multiLang) {
  return multiLang ? argOut.replace(/(\.[^.]+)?$/, `.${target}$1`) : argOut;
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
    return outputs.length === 1 ? [file] : outputs.map((_, i) => file.replace(/(\.[^.]+)?$/, `_${i + 1}$1`));
  }
  const dir = (out && multiInput) ? out : inputSaveDir(inp);
  mkdirSync(dir, { recursive: true });
  const names = [];
  if (!isSplit && outputs.length === 1 && outputs[0].name) {
    names.push(reserve(dir, basename(outputs[0].name), usedByDir)); // keep the Perso name as-is (includes timestamp)
  } else {
    const ext = extname(outputs[0]?.name || outputs[0]?.path || '') || '.mp4';
    const stem = String(labelOf(inp)).replace(/\.[^.]+$/, '') || 'output';
    outputs.forEach((_, i) => {
      const base = `${stem}.dubbed.${target}${outputs.length > 1 ? `_${i + 1}` : ''}${ext}`;
      names.push(reserve(dir, base, usedByDir));
    });
  }
  return names.map((n) => join(dir, n));
}

// Lightweight manifest (v4) holding the chunk plan (boundaries) + only the completion status per (input|part|language).
function buildManifest(ctx, perInput, results, prevDone = {}) {
  const done = { ...prevDone };
  for (const r of results) {
    const k = `${r.inputId}|${r.index}|${r.target}`;
    if (r.status === 'OK') done[k] = { status: 'OK', projectSeq: r.projectId };
    else if (r.status === 'PASSTHROUGH') done[k] = { status: 'PASSTHROUGH' };
    else if (r.status === 'DLFAIL') done[k] = { status: 'OK', projectSeq: r.projectId }; // generated → preserve projectSeq for re-download
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
      const mergeable = tRes.filter((r) => r.status === 'OK' || r.status === 'PASSTHROUGH').length;
      if (mergeable > 1) notify(`Merging — ${labelOf(pin.inp)}${multiLang ? ` (${target})` : ''}`);
      const { outputs, report } = await mergeGroups(tRes);
      let saved = [];
      if (outputs.length) {
        const paths = targetPaths(outputs, { inp: pin.inp, target, isSplit, multiInput: ctx.multiInput, multiLang, out: ctx.out, usedByDir });
        outputs.forEach((o, i) => copyFileSync(o.path, paths[i]));
        await rm(dirname(outputs[0].path), { recursive: true, force: true }).catch(() => {}); // clean up merge temp folder
        saved = paths;
      }
      const tlab = multiLang ? `${labelOf(pin.inp)} (${target})` : labelOf(pin.inp);
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
      console.log(`\nSome parts were generated but failed to download (not a re-dub). Resume to re-download:\n  node scripts/dubbing.mjs --resume "${ctx.file}"`);
    }
  } else {
    try { unlinkSync(ctx.file); } catch { /* done → clean up resume state-file (ignore if absent) */ }
  }
}

// New run: schedule all inputs as a single pool. Per-input split/upload happens once (secures mediaSeq) → reused per language.
async function runPool(args) {
  if (!resolveKey()) {
    console.error(onboardingHelp());
    process.exit(2);
  }
  const inputs = await expandInputs(args.inputs, { recursive: args.recursive });
  const spaceSeq = args.space ?? (await resolveSpace());
  const targets = String(args.target).split(',').map((t) => t.trim()).filter(Boolean); // --target en,ja,ko
  const multiInput = inputs.length > 1;

  // Per-input split/upload → tag every part with inputId into a single pool.
  const pool = [];
  const perInput = [];
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
  }
  if (!pool.length) { notify('No inputs to process.'); return; }

  notify(`Translating${targets.length > 1 ? ` (${targets.join(', ')})` : ''}`);
  // Fill all inputs×parts×languages into one queue for concurrent processing. Submit as many as there are empty slots and add more every 5 minutes.
  const sched = await runSchedule(pool, spaceSeq, { source: args.source, targets }, { log });

  const file = resumePath({ out: args.out, inputs, multiInput });
  await finishPool([...sched.results.values()], perInput, {
    spaceSeq, source: args.source, targets, out: args.out, multiInput, sched, file, prevDone: {},
  });
}

// Resume: completed parts (OK) are re-downloaded from the server via projectSeq; the rest (PASSTHROUGH/unprocessed) are re-cut from the original and processed → merged.
async function runResume(file) {
  if (!resolveKey()) {
    console.error(onboardingHelp());
    process.exit(2);
  }
  const m = JSON.parse(readFileSync(file, 'utf8'));
  if (m.version !== 4) throw new Error('Unsupported state-file format — run again from the original.');
  const targets = m.targets ?? [m.opts?.target ?? 'en'];
  const multiInput = (m.inputs?.length ?? 0) > 1;
  const outDir = await makeTempDir('dubbing-resume-');
  const matCache = new Map(); // `${inputId}|${index}` → re-cut path (once per part, shared across languages)

  const downloaded = [];
  const skip = new Set();
  const pool = [];
  const perInput = [];

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
          } catch {
            downloaded.push({ inputId: pin.inputId, index: c.index, target, status: 'DLFAIL', projectId: d.projectSeq, reason: 'download_failed' });
            log(`[input ${pin.inputId + 1}] part ${c.index + 1}(${target}) re-download failed — no re-dub`);
          }
          skip.add(k);
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
    ? await runSchedule(pool, m.spaceSeq, { source: m.opts?.source ?? 'auto', targets, done: skip }, { log })
    : { results: new Map(), stopped: false, pendingLeft: [] };

  await finishPool([...downloaded, ...sched.results.values()], perInput, {
    spaceSeq: m.spaceSeq, source: m.opts?.source ?? 'auto', targets, out: m.out, multiInput, sched, file, prevDone: m.done ?? {},
  });
}

// Pure helper exports for testing (when run directly, only main below executes).
export { parseArgs, targetPaths, buildManifest, finishPool, refOf, resumePath, explicitOutPath, remainingMinutes };

async function main() {
  let exitCode = 0;
  try {
    preloadKeyEnv(); // pre-inject the key into env before async (at a clean point) → avoid a synchronous powershell call/crash in the main process
    const args = parseArgs(process.argv.slice(2));
    if (args.resume) await runResume(args.resume);
    else if (!args.inputs.length) {
      console.error('Usage: node scripts/dubbing.mjs "<file|folder|URL>" ["<another input>" ...] [--source auto] [--target en,ja] [--space N] [--out path|folder] [--recursive]');
      exitCode = 1;
    } else await runPool(args);
  } catch (e) {
    console.error(friendlyError(e));
    exitCode = 1;
  } finally {
    await cleanupTempDirs(); // bulk-clean the cut/schedule/merge/download temp folders
  }
  process.exit(exitCode);
}

// main only when run directly (CLI). When imported (tests), expose helpers only and do not execute.
const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invoked) await main();
