// Group merge. Accumulates OK/PASSTHROUGH in index order and splits at HARD_FAIL as group boundaries,
// then ffmpeg-concats each run of consecutive successes.
import { writeFile, rm, copyFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureFfmpeg } from '../scripts/check_deps.mjs';
import { makeTempDir } from './tmp.mjs';
import { pickVideoEncoder, encoderVideoArgs } from './ffmpeg.mjs';

const exec = promisify(execFile);

// Internal reason token → user-friendly text (avoids exposing raw codes/conditions)
function friendlyReason(reason) {
  const map = {
    too_long: 'length limit', submit_failed: 'processing error', download_failed: 'download failed',
    no_voice: 'no voice detected (nothing to dub)', elapsed_exceeded: 'timed out', failed: 'processing failed',
  };
  if (map[reason]) return map[reason];
  if (typeof reason === 'string' && /[가-힣]/.test(reason)) return reason; // pass through Korean guidance from the service as-is
  return 'processing failed';
}

/**
 * @param results Map(index→{status,path,reason}) or an array of the same shape
 * @returns {outputs:[{path,indices}], failures:[{index,reason}], report:string|null}
 */
export async function mergeGroups(results, { outDir } = {}) {
  const items = [...(results instanceof Map ? results.values() : results)].sort((a, b) => a.index - b.index);
  const dir = outDir ?? (await makeTempDir('dubbing-merge-'));

  const groups = [];
  const failures = [];
  let cur = [];
  for (const it of items) {
    if (it.status === 'OK' || it.status === 'PASSTHROUGH') {
      cur.push(it);
    } else {
      // HARD_FAIL (generation failed) / DLFAIL (generated, only download failed) → a gap in this output (boundary split)
      failures.push({ index: it.index, reason: it.reason ?? 'unknown' });
      if (cur.length) { groups.push(cur); cur = []; }
    }
  }
  if (cur.length) groups.push(cur);

  const outputs = [];
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const persoName = group.find((i) => i.name)?.name ?? null; // file name provided by Perso (if any)
    const ext = (persoName && extname(persoName)) || '.mp4'; // result container (e.g. .wav for audio dubbing)
    const name = groups.length === 1 ? `output${ext}` : `output_${g + 1}${ext}`;
    const out = join(dir, name);
    await concat(group.map((i) => i.path), out);
    outputs.push({ path: out, indices: group.map((i) => i.index), name: persoName });
  }

  const report = failures.length
    ? failures.map((f) => `Part ${f.index + 1} excluded — ${friendlyReason(f.reason)}`).join('\n')
    : null;

  return { outputs, failures, report };
}

async function concat(paths, outPath) {
  if (paths.length === 1) {
    // single piece (no cutting) → copy as-is without ffmpeg
    await copyFile(paths[0], outPath);
    return outPath;
  }

  ensureFfmpeg(); // multi-merge needs ffmpeg (usually already installed since splitting occurred)
  const listFile = `${outPath}.concat.txt`;
  const list = paths.map((p) => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n');
  await writeFile(listFile, list, 'utf8');

  const base = ['-y', '-f', 'concat', '-safe', '0', '-i', listFile];
  try {
    // when codec/resolution/sample rate match, do a lossless fast merge (-c copy)
    await exec('ffmpeg', [...base, '-c', 'copy', '-movflags', '+faststart', outPath], { maxBuffer: 1 << 20 });
  } catch {
    // on mismatch, fall back to re-encoding (libx264 by default, HW auto-detected by OS)
    const enc = await pickVideoEncoder();
    await exec('ffmpeg', [...base, ...encoderVideoArgs(enc), '-c:a', 'aac', '-movflags', '+faststart', outPath], { maxBuffer: 1 << 20 });
  } finally {
    await rm(listFile, { force: true }).catch(() => {}); // clean up the concat list file immediately
  }
  return outPath;
}
