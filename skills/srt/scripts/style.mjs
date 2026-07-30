#!/usr/bin/env node
// /srt styling worker: burn a styled subtitle track into a video (hardsub).
//   inputs: a local video + SRT, OR --project <seq> (fetches the original video + SRT, and word timestamps for karaoke).
//   pick a preset (or override any field) → build ASS → ffmpeg burn-in → one styled .mp4.
//   usage: node scripts/style.mjs "<video>" "<subtitle.srt>" [--preset bold-punch] [--out folder]
//          node scripts/style.mjs --project 392142 --preset karaoke
//          node scripts/style.mjs --list-presets
// Shares the dubbing skill's libraries via ../../dubbing.
import { createWriteStream, existsSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { join, basename, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { preloadKeyEnv } from '../../dubbing/scripts/resolve_key.mjs';
import { ExitCode, UsageError, friendlyError, errorClass, ensureKey } from '../../dubbing/lib/gates.mjs';
import { get } from '../../dubbing/lib/http_client.mjs';
import { findSpaceForProject } from '../../dubbing/lib/space.mjs';
import { downloadAudioScript } from '../../dubbing/lib/api_adapter.mjs';
import { probe } from '../../dubbing/lib/ffmpeg.mjs';
import { persoBaseUrl, VIDEO_EXT, AUDIO_EXT } from '../../dubbing/lib/config.mjs';
import { makeTempDir, cleanupTempDirs } from '../../dubbing/lib/tmp.mjs';
import { track, initTelemetry, setAgentHost, primeTelemetrySpace, setTelemetrySpace } from '../../dubbing/lib/telemetry.mjs';
import { listPresets, findPreset, defaultPresetFor, parseSrt, buildAss, burn, writeAss, fontFamilyName } from '../lib/subtitle_style.mjs';

const notify = (m) => console.log(`[progress] ${m}`);
const log = (m) => console.error('  ' + m);
const MEDIA_BASE = persoBaseUrl('PERSO_MEDIA_BASE', process.env.PERSO_MEDIA_BASE, 'https://portal-media.perso.ai');
const mediaUrl = (rel) => MEDIA_BASE + encodeURI(rel.startsWith('/') ? rel : `/${rel}`);

const USAGE = [
  'Usage: node scripts/style.mjs "<video>" "<subtitle.srt>" [--preset <id>] [overrides] [--out folder]',
  '       node scripts/style.mjs --project <seq> [--preset <id>] [overrides] [--out folder]',
  '       node scripts/style.mjs --list-presets',
  '',
  '  --project <seq>   fetch the original video + SRT (+ word timestamps for karaoke) from a Perso STT project',
  '  --preset <id>     one of the preset ids (see --list-presets); default is chosen by the video ratio',
  '  --lang <code>     label for the output file name (and to record which language was styled)',
  '  --word-timestamps <path>   scriptTimestamps JSON for accurate karaoke word timing',
  '  --out <folder>    where to write the styled .mp4 (default: next to the video)',
  '  Overrides (any preset field): --position <center|lower|bottom|upper> --font <name>',
  '     --font-file <path.ttf|otf>   use a font file that is not installed on the system',
  '     --fontsize <frac|px> --primary <RRGGBB> --outline <RRGGBB> --outline-width <frac|px>',
  '     --box <RRGGBB@opacity|none> --karaoke --no-karaoke --highlight <RRGGBB> --uppercase --bold --no-bold',
  '  A font name that is not installed falls back to the closest system font automatically.',
].join('\n');

const BOOL_FLAGS = { '--karaoke': ['karaoke', true], '--no-karaoke': ['karaoke', false], '--uppercase': ['uppercase', true], '--bold': ['bold', true], '--no-bold': ['bold', false] };
const VALUE_FLAGS = ['project', 'preset', 'lang', 'word-timestamps', 'out', 'position', 'font', 'font-file', 'fontsize', 'primary', 'outline', 'outline-width', 'box', 'highlight', 'host'];

function parseArgs(argv) {
  const a = { inputs: [], overrides: {} };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--help' || t === '-h') a.help = true;
    else if (t === '--list-presets') a.listPresets = true;
    else if (t in BOOL_FLAGS) { const [k, v] = BOOL_FLAGS[t]; a.overrides[k] = v; }
    else if (t.startsWith('--')) {
      const key = t.slice(2);
      if (!VALUE_FLAGS.includes(key)) throw new UsageError(`Unknown option: ${t}`);
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`Missing value for ${t}`);
      a[key] = v;
    } else a.inputs.push(t);
  }
  return a;
}

// ── resolve inputs → { video, srt, wordTs, outDir, stem, lang } ──
async function resolveInputs(a, tmp) {
  if (a.project) {
    if (!/^\d+$/.test(a.project)) throw new UsageError(`--project must be a numeric project seq — got "${a.project}"`);
    await ensureKey();
    notify(`Fetching project ${a.project} from Perso…`);
    const loc = await findSpaceForProject(Number(a.project));
    if (!loc) throw new Error(`Project ${a.project} was not found in any of your workspaces.`);
    setTelemetrySpace(loc.spaceSeq);
    const { spaceSeq, detail } = loc;
    const rel = detail?.originalMetaData?.filePath;
    if (!rel) throw new Error('The original video is not available on the server for this project — pass a local video file instead.');
    const video = join(tmp, `original${extname(rel) || '.mp4'}`);
    await streamToFile(mediaUrl(rel), video);
    const srtRes = await downloadAudioScript(Number(a.project), spaceSeq, (name) => join(tmp, basename(name || `subtitle_${a.project}.srt`)));
    let wordTs = null;
    if (a['word-timestamps']) wordTs = a['word-timestamps'];
    else { try { wordTs = await fetchTimestamps(Number(a.project), spaceSeq, tmp); } catch { wordTs = null; } }
    const stem = sanitize(detail?.title) || `project_${a.project}`;
    return { video, srt: srtRes.path, wordTs, outDir: a.out || process.cwd(), stem, lang: a.lang || null };
  }
  // local: split positionals by extension
  const srtArg = a.inputs.find((p) => /\.srt$/i.test(p));
  const vidArg = a.inputs.find((p) => VIDEO_EXT.test(p) || AUDIO_EXT.test(p)) || a.inputs.find((p) => p !== srtArg);
  if (!vidArg || !srtArg) throw new UsageError('Provide a video file and a .srt file (or use --project <seq>).');
  if (!existsSync(vidArg)) throw new Error(`Video not found: ${vidArg}`);
  if (!existsSync(srtArg)) throw new Error(`Subtitle not found: ${srtArg}`);
  return {
    video: resolve(vidArg), srt: resolve(srtArg), wordTs: a['word-timestamps'] || null,
    outDir: a.out || dirname(resolve(vidArg)), stem: basename(vidArg, extname(vidArg)), lang: a.lang || null,
  };
}

async function fetchTimestamps(seq, spaceSeq, tmp) {
  const res = await get(`/video-translator/api/v1/projects/${seq}/spaces/${spaceSeq}/download`, { query: { target: 'scriptTimestamps' } });
  const rel = res?.result?.audioFile?.scriptTimestampsDownloadLink;
  if (!rel) return null;
  const out = join(tmp, `timestamps_${seq}.json`);
  await streamToFile(mediaUrl(rel), out);
  return out;
}

async function streamToFile(url, out) {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`Download failed (${r.status}) for ${url}`);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(out));
  return out;
}

const sanitize = (s) => (s ? String(s).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) : '');

// Build the effective preset by applying overrides on top of a base preset. Height is needed to convert px→frac.
function applyOverrides(base, a, height) {
  const p = { ...base, box: base.box ? { ...base.box } : null };
  const o = a.overrides;
  const toFrac = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) throw new UsageError(`Expected a positive size (fraction of height, or pixels) — got "${v}"`);
    return n < 1 ? n : n / height;
  };
  const hex = (v, f) => { if (!/^[0-9a-fA-F]{6}$/.test(v)) throw new UsageError(`--${f} must be a 6-digit RRGGBB hex — got "${v}"`); return v.toUpperCase(); };
  if (a.position) { if (!['center', 'lower', 'bottom', 'upper'].includes(a.position)) throw new UsageError(`--position must be center|lower|bottom|upper`); p.position = a.position; }
  if (a.font) p.font = a.font;
  if (a.fontsize) p.fontFrac = toFrac(a.fontsize);
  if (a.primary) p.primary = hex(a.primary, 'primary');
  if (a.outline) p.outline = hex(a.outline, 'outline');
  if (a['outline-width']) p.outlineFrac = toFrac(a['outline-width']);
  if (a.highlight) p.highlight = hex(a.highlight, 'highlight');
  if (a.box) {
    if (a.box === 'none') p.box = null;
    else {
      const m = /^([0-9a-fA-F]{6})(@([\d.]+))?$/.exec(a.box);
      const op = m?.[3] ? Number(m[3]) : 0.6;
      if (!m || !Number.isFinite(op) || op <= 0 || op > 1) throw new UsageError('--box must be RRGGBB@opacity (opacity 0-1) or none');
      p.box = { color: m[1].toUpperCase(), opacity: op };
    }
  }
  if ('karaoke' in o) p.karaoke = o.karaoke;
  if ('uppercase' in o) p.uppercase = o.uppercase;
  if ('bold' in o) p.bold = o.bold;
  return p;
}

async function run(a) {
  const tmp = await makeTempDir('srt-style-');
  const inp = await resolveInputs(a, tmp);
  let { width, height, durationMs, rotation } = await probe(inp.video);
  if (!width || !height) throw new Error('Could not read the video dimensions.');
  // ffmpeg autorotates on decode — a ±90 display-matrix means the burn canvas is swapped vs coded dims.
  if (Math.abs(rotation) % 180 === 90) [width, height] = [height, width];

  const base = a.preset ? (findPreset(a.preset) || (() => { throw new UsageError(`Unknown preset "${a.preset}". Run --list-presets.`); })()) : defaultPresetFor(width, height);
  const preset = applyOverrides(base, a, height);

  // Loose font file (not installed): stage it in a fonts subdir next to the .ass and point the style at its real family name.
  let fontsDir = null;
  if (a['font-file']) {
    if (!existsSync(a['font-file'])) throw new Error(`Font file not found: ${a['font-file']}`);
    mkdirSync(join(tmp, 'fonts'), { recursive: true });
    copyFileSync(a['font-file'], join(tmp, 'fonts', basename(a['font-file'])));
    fontsDir = 'fonts';
    const family = fontFamilyName(a['font-file']);
    if (family) preset.font = family;
    else if (!a.font) throw new UsageError(`Could not read the family name from "${basename(a['font-file'])}" — pass --font "<family name>" together with --font-file.`);
  }

  const cues = parseSrt(readFileSync(inp.srt, 'utf8'));
  if (!cues.length) throw new Error('The subtitle file has no readable cues.');

  let wordTs = null;
  if (preset.karaoke) {
    if (a['word-timestamps'] && !existsSync(a['word-timestamps'])) throw new UsageError(`--word-timestamps file not found: ${a['word-timestamps']}`);
    if (inp.wordTs && existsSync(inp.wordTs)) wordTs = JSON.parse(readFileSync(inp.wordTs, 'utf8'));
    if (!wordTs) notify('No per-word timings for this subtitle — applying Karaoke with estimated timing (it may drift slightly).');
  }

  notify(`Applying ${preset.name} style…`);
  const ass = writeAss(buildAss(cues, preset, { width, height, wordTimestamps: wordTs }), join(tmp, 'style.ass'));

  const secs = durationMs ? Math.round(durationMs / 1000) : null;
  notify(`Burning subtitles into the video${secs ? ` (~${secs}s of footage)` : ''}…`);
  // Absolute outDir (burn runs ffmpeg with cwd=tmp, so relative paths would resolve there), created up front;
  // pick a _2/_3… suffix instead of silently overwriting an earlier run's output.
  const outDir = resolve(inp.outDir);
  mkdirSync(outDir, { recursive: true });
  const stem = `${inp.stem}_${preset.id}${inp.lang ? `_${inp.lang}` : ''}`;
  let outPath = join(outDir, `${stem}.mp4`);
  for (let n = 2; existsSync(outPath); n++) outPath = join(outDir, `${stem}_${n}.mp4`);
  await burn(inp.video, ass, outPath, { fontsDir });

  track('style_completed', {
    preset: preset.id, karaoke: !!preset.karaoke, karaoke_measured: !!wordTs,
    source: a.project ? 'project' : 'local', cue_count: cues.length,
    orientation: height > width ? 'portrait' : 'landscape', lang: inp.lang,
  });
  console.log(`[styled-output] ${JSON.stringify({ preset: preset.id, name: preset.name, lang: inp.lang, path: outPath })}`);
  notify(`Done — styled video saved: ${outPath}`);
}

function printMenu() {
  const g = (grp) => listPresets().filter((p) => p.group === grp);
  console.log('Subtitle style presets:\n');
  console.log('  Short-form (9:16): ' + g('shortform').map((p) => `${p.name} (${p.id})`).join(', '));
  console.log('  Long-form (16:9):  ' + g('longform').map((p) => `${p.name} (${p.id})`).join(', '));
  console.log('\nUse: --preset <id>, or override any field (see --help). Pick by ratio if unset.');
}

async function main() {
  let exitCode = 0;
  try {
    primeTelemetrySpace();
    const a = parseArgs(process.argv.slice(2));
    if (a.project) preloadKeyEnv(); // API mode only — local video+srt burns offline (no key material touched)
    if (a.host) setAgentHost(a.host);
    if (a.help) { console.log(USAGE); return; }
    if (a.listPresets) { printMenu(); return; }
    initTelemetry();
    track('run_started', { mode: 'style', source: a.project ? 'project' : 'local' });
    await run(a);
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

export { parseArgs, applyOverrides };
