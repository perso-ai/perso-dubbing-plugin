#!/usr/bin/env node
// On-demand subtitle preview generator: render every preset with the real ASS pipeline
// onto its swatch and tile them into a user-selected PNG output — short-form (portrait, 4-up) on top,
// long-form (landscape, wide 2-up) on the bottom rows. Both strips share a width so they stack cleanly.
//   usage: node scripts/build_preview.mjs --out <preview.png>
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { makeTempDir, cleanupTempDirs } from '../../dubbing/lib/tmp.mjs';
import { listPresets, buildAss, writeAss } from '../lib/subtitle_style.mjs';

const exec = promisify(execFile);
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--out' || !args[1].toLowerCase().endsWith('.png')) {
  console.error('Usage: node scripts/build_preview.mjs --out <preview.png>');
  process.exit(1);
}
const OUT = resolve(args[1]);
const BG = '0xECE9E3'; // soft warm-light montage background

// Portrait: 330-wide cells, 4 columns. Landscape: 660-wide cells (2×), 2 columns → equal strip width (4×330 = 2×660).
const PORT = { W: 300, H: 534, scale: 'scale=-1:500', cellW: 330, cellH: 596, cols: 4 };
const LAND = { W: 620, H: 349, scale: 'scale=620:-1', cellW: 660, cellH: 452, cols: 2 };

async function renderCell(p, spec, out, cwdDir, idx) {
  const cue = [{ start: 0.2, end: 4.8, textLines: [p.sample] }];
  const assName = `c${idx}.ass`;
  writeAss(buildAss(cue, p, { width: spec.W, height: spec.H }), join(cwdDir, assName));
  const label = p.name.replace(/'/g, '');
  const vf = [
    `ass=${assName}`,
    spec.scale,
    `pad=${spec.cellW}:${spec.cellH}:(ow-iw)/2:24:color=${BG}`,
    `drawtext=font=Arial:text='${label}':x=(w-text_w)/2:y=h-34:fontsize=18:fontcolor=0x222222:box=1:boxcolor=white@0.85:boxborderw=8`,
  ].join(',');
  await exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
    '-i', `color=c=0x${p.swatch}:s=${spec.W}x${spec.H}:r=25:d=5`, '-vf', vf, '-ss', '2.5', '-frames:v', '1', '-update', '1', out],
    { cwd: cwdDir, maxBuffer: 1 << 20 });
}

async function tileStrip(dir, prefix, count, spec, out) {
  const rows = Math.ceil(count / spec.cols);
  await exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '1',
    '-i', join(dir, `${prefix}_%02d.png`), '-frames:v', '1',
    '-vf', `tile=${spec.cols}x${rows}:padding=0:margin=16:color=${BG}`, out], { maxBuffer: 4 << 20 });
  return out;
}

async function main() {
  let filters;
  try {
    ({ stdout: filters } = await exec('ffmpeg', ['-hide_banner', '-filters']));
  } catch {
    throw new Error('Image preview requires ffmpeg on PATH. Use node scripts/style.mjs --list-presets for the text menu.');
  }
  for (const filter of ['ass', 'drawtext']) {
    if (!filters.split('\n').some((line) => line.trim().split(/\s+/)[1] === filter)) {
      throw new Error(`Image preview requires an ffmpeg build with the ${filter} filter. Use node scripts/style.mjs --list-presets for the text menu.`);
    }
  }
  const tmp = await makeTempDir('srt-preview-');
  const shorts = listPresets().filter((p) => p.group === 'shortform');
  const longs = listPresets().filter((p) => p.group === 'longform');

  let i = 0;
  for (let k = 0; k < shorts.length; k++) await renderCell(shorts[k], PORT, join(tmp, `p_${String(k).padStart(2, '0')}.png`), tmp, i++);
  for (let k = 0; k < longs.length; k++) await renderCell(longs[k], LAND, join(tmp, `l_${String(k).padStart(2, '0')}.png`), tmp, i++);

  const shortStrip = await tileStrip(tmp, 'p', shorts.length, PORT, join(tmp, 'short.png'));
  const longStrip = await tileStrip(tmp, 'l', longs.length, LAND, join(tmp, 'long.png'));

  await exec('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', shortStrip, '-i', longStrip,
    '-filter_complex', `[0][1]vstack=inputs=2`, '-frames:v', '1', OUT], { maxBuffer: 8 << 20 });
  console.log(`[style-preview] ${JSON.stringify({path:OUT, shortForm:shorts.length, longForm:longs.length})}`);
}
try {
  await main();
} catch (error) {
  console.error(`[style-preview] ${error.message}`);
  process.exitCode = 1;
} finally {
  await cleanupTempDirs();
}
