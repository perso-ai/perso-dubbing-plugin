#!/usr/bin/env node
// Build-time asset generator (not a runtime path): render a marketing hero GIF for docs — a uniform grid
// of subtitle-style cells, each a caption-band crop on a cinematic frame, cycling a few real subtitle lines
// with a fade/pop-in. Cells are rendered with the SAME ASS pipeline the product burns with (buildAss), so
// styles match real output; only the pop/fade and the cinematic backdrop are showcase flourishes.
//   usage: node scripts/build_preset_gif.mjs   (needs ffmpeg; writes docs/media/subtitle-presets.gif)
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeTempDir, cleanupTempDirs } from '../../dubbing/lib/tmp.mjs';
import { listPresets, buildAss, writeAss } from '../lib/subtitle_style.mjs';

const exec = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '..', '..', 'docs', 'media', 'subtitle-presets.gif');

const DUR = 6.8, FPS = 12, IN = 0.4, OUT_T = 6.5, K_SWEEP = 1.8;
const MONTAGE = '0xECE9E3', M = 10, LB = 28;
const CW = 460, CH = 170, COLS = 4;
const K = 650, FMIN = 24, FMAX = 40; // normalize each style's font into a readable band across cells
const even = (n) => (n % 2 ? n + 1 : n);
const CCW = even(CW + 2 * M), CCH = even(CH + 2 * M + LB);

const assT = (t) => { const cs = Math.round(t * 100); return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, '0')}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`; };
const assParse = (s) => { const m = s.match(/(\d+):(\d+):(\d+)\.(\d+)/); return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 100; };
const darken = (hex, f) => { const n = parseInt(hex, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f)).reduce((a, v) => a * 256 + v, 0).toString(16).padStart(6, '0'); };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = (s) => s.replace(/'/g, '').replace(/:/g, '\\:');
const POP = '\\fad(200,180)\\fscx88\\fscy88\\t(0,240,\\fscx100\\fscy100)';

// Add showcase animation on top of whatever buildAss produced (plain / neon 2-layer / rainbow per-word).
// Karaoke: fade only at each sentence's first/last word-event (grouped by time gap) and hold the last word —
// so the highlight glides with no per-word blink. Everything else: fade + gentle scale pop per event layer.
function decorate(ass, karaoke) {
  const lines = ass.split('\n');
  if (karaoke) {
    const dia = [];
    lines.forEach((l, i) => { if (/^Dialogue: 0,/.test(l)) dia.push(i); });
    const put = (idx, tag) => { lines[idx] = lines[idx].replace(/(,Base,,0,0,,)/, `$1${tag}`); };
    const tOf = (l) => { const m = l.match(/^Dialogue: \d+,([^,]+),([^,]+),/); return { s: assParse(m[1]), e: assParse(m[2]) }; };
    const groups = [];
    let cur = [];
    for (const idx of dia) {
      if (cur.length && tOf(lines[idx]).s > tOf(lines[cur[cur.length - 1]]).e + 0.05) { groups.push(cur); cur = []; }
      cur.push(idx);
    }
    if (cur.length) groups.push(cur);
    groups.forEach((g, gi) => {
      const lastIdx = g[g.length - 1];
      const holdTo = gi < groups.length - 1 ? tOf(lines[groups[gi + 1][0]]).s : OUT_T;
      lines[lastIdx] = lines[lastIdx].replace(/^(Dialogue: \d+,[^,]+,)([^,]+)(,.*)$/, (m, a, b, c) => `${a}${assT(holdTo)}${c}`);
      if (g.length === 1) put(g[0], '{\\fad(180,200)}');
      else { put(g[0], '{\\fad(180,0)}'); put(lastIdx, '{\\fad(0,200)}'); }
    });
    return lines.join('\n');
  }
  return lines.map((l) => (/^Dialogue: \d+,/.test(l)
    ? l.replace(/(,Base,,0,0,,)(.*)$/, (m, pre, text) => `${pre}{${POP}}${text}`) : l)).join('\n');
}

function normalize(p) {
  const targetPx = clamp(Math.round(p.fontFrac * K), FMIN, FMAX);
  const r = targetPx / CH;
  const ratio = (frac) => (p.fontFrac > 0 ? (frac / p.fontFrac) * r : 0);
  return { ...p, position: 'center', fontFrac: r, outlineFrac: ratio(p.outlineFrac || 0), shadowFrac: ratio(p.shadowFrac || 0) };
}

const FONT = { clean: 'Tahoma', 'soft-card': 'Malgun Gothic' }; // scripts the base font lacks → per-language system font

async function renderCell(p0, samples, outMp4, idx, tmp) {
  const p = FONT[p0.id] ? { ...p0, font: FONT[p0.id] } : p0;
  const span = OUT_T - IN, seg = span / samples.length;
  const cues = p.karaoke
    ? samples.map((t, i) => ({ start: IN + i * seg, end: IN + i * seg + Math.min(K_SWEEP, seg * 0.65), textLines: [t] }))
    : samples.map((t, i) => ({ start: IN + i * seg, end: IN + (i + 1) * seg, textLines: [t] }));
  const assName = `c_${idx}.ass`;
  writeAss(decorate(buildAss(cues, normalize(p), { width: CW, height: CH }), p.karaoke), join(tmp, assName));
  const c0 = darken(p.swatch, 0.5), c1 = darken(p.swatch, 0.16);
  const bg = join(tmp, `bg_${idx}.png`);
  await exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
    '-i', `gradients=s=${CW}x${CH}:c0=0x${c0}:c1=0x${c1}:type=radial:x0=${CW / 2}:y0=${Math.round(CH * 0.42)}:x1=${CW}:y1=${CH}:nb_colors=2`,
    '-vf', 'noise=alls=8,vignette=PI/5', '-frames:v', '1', bg]);
  const vf = [`ass=${assName}`, `pad=${CCW}:${CCH}:${M}:${M}:color=${MONTAGE}`,
    `drawtext=font=Arial:text='${esc(p.name)}':x=(w-text_w)/2:y=${M + CH + 6}:fontsize=15:fontcolor=0x333333`, 'format=yuv420p'].join(',');
  await exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-loop', '1', '-t', String(DUR), '-i', bg,
    '-vf', vf, '-r', String(FPS), outMp4], { cwd: tmp, maxBuffer: 1 << 24 });
}

// Two showcase-only styles the preset schema already covers but that aren't shipped presets (box / mono font).
const EXTRA = [
  { id: 'lower-third', name: 'Lower Third', group: 'longform', font: 'Arial', bold: true, uppercase: true,
    fontFrac: 0.045, outlineFrac: 0, shadowFrac: 0, position: 'center', primary: 'FFFFFF', outline: '000000',
    box: { color: '5A4FF3', opacity: 0.95 }, karaoke: false, swatch: '4a3f7a' },
  { id: 'terminal', name: 'Terminal', group: 'longform', font: 'Consolas', bold: false, uppercase: false,
    fontFrac: 0.05, outlineFrac: 0, shadowFrac: 0.002, position: 'center', primary: '3DF29A', outline: '000000',
    box: { color: '000000', opacity: 0.55 }, karaoke: false, swatch: '2f3b34' },
];

// Each cell cycles a few real subtitle lines (karaoke/keyword: 2, each word-swept; others: 3), language per cell.
const SAMPLES = {
  clean: ['สวัสดี ยินดีต้อนรับ', 'ขอบคุณที่แวะมา', 'ขอให้มีความสุข'],
  'bold-punch': ["c'est parti", 'on y va', 'préparez-vous'],
  karaoke: ['sing along with me now', 'clap your hands now'],
  keyword: ['welcome to the show', 'today is the big day'],
  neon: ['good vibes only', 'turn it up loud', "let's glow tonight"],
  'neon-yellow': ['大家好，欢迎回来', '记得点赞关注', '我们现在开始'],
  'soft-card': ['좋은 하루 보내세요', '오늘도 화이팅', '행복한 하루 되세요'],
  rainbow: ['have a colorful day', 'taste the rainbow', 'bright and bold'],
  'lower-bar': ['de volta à nossa história', 'segundo o relatório', 'veja os detalhes'],
  streaming: ['¡qué bueno verte aquí!', 'gracias por venir', 'empecemos ya'],
  'lower-third': ['glad you are here', 'live from the studio', 'breaking news'],
  terminal: ['> hello world, ready?', '$ run subtitles.mjs', '> done · exit 0'],
};
const ORDER = ['clean', 'bold-punch', 'karaoke', 'keyword', 'neon', 'neon-yellow', 'soft-card', 'rainbow', 'lower-bar', 'streaming', 'lower-third', 'terminal'];

async function main() {
  const tmp = await makeTempDir('preset-gif-');
  const all = [...listPresets(), ...EXTRA];
  const byId = (id) => all.find((p) => p.id === id);
  const inputs = [];
  for (let i = 0; i < ORDER.length; i++) {
    const f = join(tmp, `cell_${i}.mp4`);
    await renderCell(byId(ORDER[i]), SAMPLES[ORDER[i]], f, i, tmp);
    inputs.push(f);
  }

  const rows = Math.ceil(ORDER.length / COLS);
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  for (const f of inputs) args.push('-i', f);
  const parts = [];
  for (let r = 0; r < rows; r++) parts.push(`${Array.from({ length: COLS }, (_, c) => `[${r * COLS + c}:v]`).join('')}hstack=inputs=${COLS}[row${r}]`);
  parts.push(`${Array.from({ length: rows }, (_, r) => `[row${r}]`).join('')}vstack=inputs=${rows}[out]`);
  const grid = join(tmp, 'grid.mp4');
  args.push('-filter_complex', parts.join(';'), '-map', '[out]', '-r', String(FPS), grid);
  await exec('ffmpeg', args, { maxBuffer: 1 << 26 });

  const W = 960, pal = join(tmp, 'pal.png');
  await exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', grid,
    '-vf', `fps=${FPS},scale=${W}:-2:flags=lanczos,palettegen=stats_mode=diff`, pal]);
  await exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', grid, '-i', pal,
    '-lavfi', `fps=${FPS},scale=${W}:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`, OUT]);
  console.log(`wrote ${OUT} (${ORDER.length} styles)`);
  await cleanupTempDirs();
}
await main();
