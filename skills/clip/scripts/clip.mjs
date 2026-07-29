#!/usr/bin/env node
// /clip worker: cut a long STT project into short clips. Subtitles are NOT burned here — that is the srt
// skill's job (scripts/style.mjs). This worker only cuts + reframes, and on request writes the sidecar
// subtitle files a later styling pass needs.
//   Phase 1 (plan):  node scripts/clip.mjs --project <seq> --plan
//     → prints the section map + full sentence transcript (order numbers + times) for clip selection.
//   Phase 2 (cut):   node scripts/clip.mjs --project <seq> --clips '<json>' [--out folder]
//     → json is [{ "title", "start_order", "end_order" }]; cuts each range, reframes 16:9→9:16, writes a
//       manifest (clips.json) recording every clip + the transcript slice needed for subtitles later.
//   Phase 3 (sidecars, only if the user wants subtitles): node scripts/clip.mjs --sidecars <clips.json> [--karaoke]
//     → writes <clip>.srt (and <clip>.timestamps.json ONLY with --karaoke) next to each clip, for style.mjs.
// Shares the dubbing skill's libraries via ../../dubbing.
import { createWriteStream, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, extname, resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { preloadKeyEnv } from '../../dubbing/scripts/resolve_key.mjs';
import { UsageError, friendlyError, errorClass, ensureKey } from '../../dubbing/lib/gates.mjs';
import { get } from '../../dubbing/lib/http_client.mjs';
import { findSpaceForProject } from '../../dubbing/lib/space.mjs';
import { probe, pickVideoEncoder, encoderVideoArgs } from '../../dubbing/lib/ffmpeg.mjs';
import { persoBaseUrl } from '../../dubbing/lib/config.mjs';
import { makeTempDir, cleanupTempDirs } from '../../dubbing/lib/tmp.mjs';
import { track, initTelemetry, setAgentHost, primeTelemetrySpace, setTelemetrySpace } from '../../dubbing/lib/telemetry.mjs';
import { orderMap, clipRange, reframe, clipCues, clipTimestamps, sanitize } from '../lib/clipper.mjs';

const exec = promisify(execFile);
const notify = (m) => console.log(`[progress] ${m}`);
const MEDIA_BASE = persoBaseUrl('PERSO_MEDIA_BASE', process.env.PERSO_MEDIA_BASE, 'https://portal-media.perso.ai');
const mediaUrl = (rel) => MEDIA_BASE + encodeURI(rel.startsWith('/') ? rel : `/${rel}`);
const CLIP_MIN = 30, CLIP_MAX = 90;

const USAGE = [
  'Usage: node scripts/clip.mjs --project <seq> --plan',
  '       node scripts/clip.mjs --project <seq> --clips \'[{"title":"..","start_order":N,"end_order":M}]\' [--out folder]',
  '       node scripts/clip.mjs --video "<file>" --ranges "2:00-3:00,5:10-5:40" [--titles "a,b"] [--out folder]',
  '       node scripts/clip.mjs --sidecars <clips.json> [--karaoke]',
  '',
  '  --plan            print the summary + transcript for clip selection',
  '  --clips <json|@file>   clip specs: array of { title, start_order, end_order } → cuts + writes clips.json',
  '  --video <file> --ranges <t-t,...>   local cut by explicit timecodes (no STT, no key); times are',
  '                    mm:ss / hh:mm:ss / seconds. --titles names them (comma-separated).',
  '  --out <folder>    where to write the clips (default: current folder)',
  '  --sidecars <clips.json>   write <clip>.srt for each clip (for the srt skill to style); add --karaoke',
  '                    to also write <clip>.timestamps.json (measured word timing — karaoke only)',
  `  --min/--max <sec> target length band for the warning (default ${CLIP_MIN}-${CLIP_MAX})`,
].join('\n');

const VALUE_FLAGS = ['project', 'clips', 'video', 'ranges', 'titles', 'out', 'sidecars', 'min', 'max', 'host'];
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--help' || t === '-h') a.help = true;
    else if (t === '--plan') a.plan = true;
    else if (t === '--karaoke') a.karaoke = true;
    else if (t.startsWith('--')) {
      const k = t.slice(2);
      if (!VALUE_FLAGS.includes(k)) throw new UsageError(`Unknown option: ${t}`);
      const v = argv[++i];
      if (v === undefined) throw new UsageError(`Missing value for ${t}`);
      a[k] = v;
    } else throw new UsageError(`Unexpected argument: ${t}`);
  }
  if (a.sidecars) return a; // offline (no project/key)
  if (a.video) { if (!a.ranges) throw new UsageError('--video needs --ranges "start-end,..." (e.g. "2:00-3:00").'); return a; } // offline
  if (!a.project || !/^\d+$/.test(a.project)) throw new UsageError('--project <seq> is required (numeric project id).');
  if (!a.plan && !a.clips) throw new UsageError('Pass --plan to inspect, --clips <json> to cut, or --sidecars <clips.json>.');
  return a;
}

// mm:ss / hh:mm:ss / seconds → seconds.
function parseTime(s) {
  s = String(s).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const parts = s.split(':').map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) throw new UsageError(`Bad time "${s}" — use mm:ss, hh:mm:ss, or seconds.`);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}
function parseRanges(raw) {
  const out = String(raw).split(',').map((r) => r.trim()).filter(Boolean).map((r) => {
    const m = r.split('-');
    if (m.length !== 2) throw new UsageError(`Bad range "${r}" — use start-end (e.g. 2:00-3:00).`);
    return { start: parseTime(m[0]), end: parseTime(m[1]) };
  });
  if (!out.length) throw new UsageError('--ranges is empty.');
  return out;
}

async function streamToFile(url, out) {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`Download failed (${r.status})`);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(out));
  return out;
}
async function fetchTimestamps(seq, spaceSeq) {
  const res = await get(`/video-translator/api/v1/projects/${seq}/spaces/${spaceSeq}/download`, { query: { target: 'scriptTimestamps' } });
  const rel = res?.result?.audioFile?.scriptTimestampsDownloadLink;
  if (!rel) throw new Error('This project has no word timestamps yet — clipping needs a completed STT project.');
  const r = await fetch(mediaUrl(rel));
  if (!r.ok) throw new Error(`Could not fetch script timestamps (${r.status}).`);
  return r.json();
}
async function fetchSummary(seq, spaceSeq) {
  try {
    const res = await get(`/video-translator/api/v1/projects/${seq}/spaces/${spaceSeq}/summary`);
    return { sections: JSON.parse(res?.result?.sections || '[]') };
  } catch { return { sections: [] }; }
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const srtTime = (t) => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), ms = Math.round((t % 1) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`; };
const mapToObj = (map) => Object.fromEntries([...map].map(([k, v]) => [k, v]));
const objToMap = (obj) => new Map(Object.entries(obj).map(([k, v]) => [Number(k), v]));

async function runPlan(a, loc) {
  const { spaceSeq, detail } = loc;
  const [ts, summary] = await Promise.all([fetchTimestamps(Number(a.project), spaceSeq), fetchSummary(Number(a.project), spaceSeq)]);
  const map = orderMap(ts);
  const orders = [...map.keys()].sort((x, y) => x - y);
  const durSec = detail?.durationMs ? Math.round(detail.durationMs / 1000) : null;
  const orient = (detail?.originalMetaData?.width ?? 0) > (detail?.originalMetaData?.height ?? 0) ? 'landscape' : 'portrait';
  console.log(`[clip-plan] ${JSON.stringify({ project: Number(a.project), durationSec: durSec, orientation: orient, sentences: orders.length, band: `${a.min || CLIP_MIN}-${a.max || CLIP_MAX}s` })}`);
  if (summary.sections.length) {
    console.log('\nSection map (topics — use as a guide, then tighten to a hook):');
    for (const s of summary.sections) { const o = s.sentence_orders || []; console.log(`  "${s.title}"  orders ${o[0]}-${o[o.length - 1]}  (${fmt((s.start_ms || 0) / 1000)})`); }
  }
  console.log('\nTranscript (order [start-end] text):');
  for (const o of orders) { const s = map.get(o); console.log(`  ${o} [${fmt(s.start)}-${fmt(s.end)}] ${s.text}`); }
  console.log('\nNext: choose clips (30-90s, hook-first, whole moment, sentence boundaries) and run --clips with [{title,start_order,end_order}].');
}

function parseClips(raw) {
  const text = raw.startsWith('@') ? readFileSync(raw.slice(1), 'utf8') : raw;
  let arr; try { arr = JSON.parse(text); } catch { throw new UsageError('--clips must be JSON: [{"title":"..","start_order":N,"end_order":M}]'); }
  if (!Array.isArray(arr) || !arr.length) throw new UsageError('--clips is empty.');
  return arr.map((c, i) => {
    const s = Number(c.start_order), e = Number(c.end_order);
    if (!Number.isInteger(s) || !Number.isInteger(e) || e < s) throw new UsageError(`Clip ${i + 1}: start_order/end_order must be integers with end >= start.`);
    return { title: String(c.title || `clip_${i + 1}`), start: s, end: e };
  });
}

async function runClips(a, loc) {
  const { spaceSeq, detail } = loc;
  const clips = parseClips(a.clips);
  const rel = detail?.originalMetaData?.filePath;
  if (!rel) throw new Error('The original video is not available on the server for this project.');
  const dl = await makeTempDir('clip-src-');
  notify(`Fetching project ${a.project}…`);
  const video = await streamToFile(mediaUrl(rel), join(dl, `src${extname(rel) || '.mp4'}`));
  const map = orderMap(await fetchTimestamps(Number(a.project), spaceSeq));
  let { width, height, rotation } = await probe(video);
  if (Math.abs(rotation) % 180 === 90) [width, height] = [height, width];
  const rf = reframe(width, height);
  const outDir = resolve(a.out || process.cwd());
  mkdirSync(outDir, { recursive: true });
  const used = { min: Number(a.min) || CLIP_MIN, max: Number(a.max) || CLIP_MAX };
  const enc = await pickVideoEncoder();

  const done = [];
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const range = clipRange(map, clip.start, clip.end);
    if (!range) { notify(`Skipped "${clip.title}" — orders ${clip.start}-${clip.end} not found.`); continue; }
    const dur = range.end - range.start;
    const band = dur < used.min ? ' (shorter than target)' : dur > used.max ? ' (longer than target)' : '';
    const name = `${String(i + 1).padStart(2, '0')}_${sanitize(clip.title) || 'clip'}.mp4`;
    const outPath = join(outDir, name);
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-ss', range.start.toFixed(3), '-t', dur.toFixed(3), '-i', video];
    if (rf.filter) args.push('-vf', rf.filter);
    args.push(...encoderVideoArgs(enc), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outPath);
    notify(`Clip ${i + 1}: "${clip.title}" — ${fmt(range.start)}→${fmt(range.end)} (${Math.round(dur)}s${band})`);
    await exec('ffmpeg', args, { maxBuffer: 1 << 20 });
    done.push({ path: outPath, title: clip.title, start_order: clip.start, end_order: clip.end, start: range.start, end: range.end, seconds: Math.round(dur) });
  }
  const manifest = join(outDir, 'clips.json');
  writeFileSync(manifest, JSON.stringify({ project: Number(a.project), reframed: !!rf.filter, clips: done, transcript: mapToObj(map) }, null, 2));
  track('clips_completed', { clip_count: done.length, reframed: !!rf.filter });
  console.log(`[clips-output] ${JSON.stringify({ count: done.length, outDir, manifest, clips: done.map(({ path, title, seconds }) => ({ path, title, seconds })) })}`);
  notify(`Done — ${done.length} clip${done.length === 1 ? '' : 's'} saved to ${outDir}. To add subtitles, generate sidecars then style with the srt skill.`);
}

function runSidecars(a) {
  const m = JSON.parse(readFileSync(a.sidecars, 'utf8'));
  const map = objToMap(m.transcript || {});
  const out = [];
  for (const c of m.clips || []) {
    if (!existsSync(c.path)) { notify(`Skipped ${basename(c.path)} — clip file missing.`); continue; }
    const base = c.path.replace(/\.mp4$/i, '');
    const cues = clipCues(map, c.start_order, c.end_order, c.start);
    const srt = cues.map((q, i) => `${i + 1}\n${srtTime(q.start)} --> ${srtTime(q.end)}\n${q.textLines.join('\n')}`).join('\n\n') + '\n';
    writeFileSync(`${base}.srt`, srt, 'utf8');
    const files = { srt: `${base}.srt` };
    if (a.karaoke) { writeFileSync(`${base}.timestamps.json`, JSON.stringify(clipTimestamps(map, c.start_order, c.end_order, c.start)), 'utf8'); files.timestamps = `${base}.timestamps.json`; }
    out.push({ clip: c.path, ...files });
  }
  console.log(`[clip-sidecars] ${JSON.stringify({ karaoke: !!a.karaoke, files: out })}`);
  notify(`Sidecars written for ${out.length} clip${out.length === 1 ? '' : 's'}. Style each with the srt skill: node ../srt/scripts/style.mjs "<clip>.mp4" "<clip>.srt" --preset <id>${a.karaoke ? ' --word-timestamps "<clip>.timestamps.json"' : ''}`);
}

// Local cut: no STT, no key — just ffmpeg-cut a local video at explicit timecodes and reframe.
async function runLocalCut(a) {
  const video = resolve(a.video);
  if (!existsSync(video)) throw new Error(`Video not found: ${a.video}`);
  const ranges = parseRanges(a.ranges);
  const titles = a.titles ? a.titles.split(',').map((s) => s.trim()) : [];
  let { width, height, rotation } = await probe(video);
  if (Math.abs(rotation) % 180 === 90) [width, height] = [height, width];
  const rf = reframe(width, height);
  const outDir = resolve(a.out || process.cwd());
  mkdirSync(outDir, { recursive: true });
  const enc = await pickVideoEncoder();

  const done = [];
  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i];
    const dur = end - start;
    if (!(dur > 0)) { notify(`Skipped range ${i + 1} — end must be after start.`); continue; }
    const title = titles[i] || `clip_${i + 1}`;
    const outPath = join(outDir, `${String(i + 1).padStart(2, '0')}_${sanitize(title) || 'clip'}.mp4`);
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-ss', start.toFixed(3), '-t', dur.toFixed(3), '-i', video];
    if (rf.filter) args.push('-vf', rf.filter);
    args.push(...encoderVideoArgs(enc), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outPath);
    notify(`Clip ${i + 1}: ${fmt(start)}→${fmt(end)} (${Math.round(dur)}s)`);
    await exec('ffmpeg', args, { maxBuffer: 1 << 20 });
    done.push({ path: outPath, title, start, end, seconds: Math.round(dur) });
  }
  track('clips_completed', { clip_count: done.length, reframed: !!rf.filter, source: 'local' });
  console.log(`[clips-output] ${JSON.stringify({ count: done.length, outDir, clips: done.map(({ path, title, seconds }) => ({ path, title, seconds })) })}`);
  notify(`Done — ${done.length} clip${done.length === 1 ? '' : 's'} saved to ${outDir}.`);
}

async function main() {
  let exitCode = 0;
  try {
    preloadKeyEnv();
    primeTelemetrySpace();
    const a = parseArgs(process.argv.slice(2));
    if (a.host) setAgentHost(a.host);
    if (a.help) { console.log(USAGE); return; }
    if (a.sidecars) { initTelemetry(); track('run_started', { mode: 'clip-sidecars' }); runSidecars(a); return; }
    if (a.video) { initTelemetry(); track('run_started', { mode: 'clip-local' }); await runLocalCut(a); return; }
    await ensureKey();
    initTelemetry();
    track('run_started', { mode: a.plan ? 'clip-plan' : 'clip-cut' });
    const loc = await findSpaceForProject(Number(a.project));
    if (!loc) throw new Error(`Project ${a.project} was not found in any of your workspaces.`);
    setTelemetrySpace(loc.spaceSeq);
    if (a.plan) await runPlan(a, loc);
    else await runClips(a, loc);
  } catch (e) {
    if (e?.name === 'ExitCode') exitCode = e.code;
    else if (e?.name === 'UsageError') { console.error(`${e.message}\n${USAGE}`); exitCode = 1; }
    else { track('error', { error_class: errorClass(e) }); console.error(friendlyError(e)); exitCode = 1; }
  } finally {
    await cleanupTempDirs();
  }
  process.exitCode = exitCode;
  setTimeout(() => process.exit(exitCode), 5000).unref();
}

const isMain = (() => {
  if (!process.argv[1]) return false;
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) await main();

export { parseArgs, parseClips };
