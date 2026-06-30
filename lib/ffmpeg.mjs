// ffprobe/ffmpeg wrappers: measure duration/resolution, measure GOP, lossless segment splitting, re-encode fallback.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { platform } from 'node:os';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { makeTempDir } from './tmp.mjs';

const exec = promisify(execFile);

/** @returns {{durationMs?:number, width?:number, height?:number, sizeBytes?:number}} */
export async function probe(path) {
  const args = [
    '-v', 'error',
    '-show_entries', 'format=duration,size',
    '-show_entries', 'stream=width,height,codec_type',
    '-of', 'json',
    path,
  ];
  const { stdout } = await exec('ffprobe', args, { maxBuffer: 1 << 20 });
  const info = JSON.parse(stdout);
  const durSec = Number(info?.format?.duration);
  const sizeBytes = Number(info?.format?.size);
  const v = (info?.streams ?? []).find((s) => s.codec_type === 'video') ?? {};
  return {
    durationMs: Number.isFinite(durSec) ? Math.round(durSec * 1000) : undefined,
    width: v.width,
    height: v.height,
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : undefined,
  };
}

/**
 * Cut the [startMs,endMs) range to create outPath. Re-encode (keeping resolution/fps) for exact boundaries (avoids overlap).
 * When maxBytes is given, cap the bitrate (-maxrate) to keep the piece size at or below it.
 */
export async function cut(path, startMs, endMs, outPath, maxBytes) {
  const ss = (startMs / 1000).toFixed(3);
  const durSec = (endMs - startMs) / 1000;
  // -ss before -i = fast input seek + frame-accurate output via re-encoding (-c copy is keyframe-aligned and causes overlap)
  const args = ['-y', '-ss', ss, '-i', path, '-t', durSec.toFixed(3), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20'];
  if (maxBytes && durSec > 0) {
    // total bitrate = maxBytes*8/dur. Use maxrate as the video cap, excluding the 128k audio.
    // For short ranges the budget gets very large, so bufsize (=2*kbps*1000) exceeds libx264's int32 limit (2.147e9) → clamp the cap.
    // (In that case the size constraint is non-binding, so clamping is harmless — short videos don't approach SIZE_CAP.)
    const vKbps = Math.min(1_000_000, Math.max(100, Math.floor((maxBytes * 8) / 1000 / durSec) - 128));
    args.push('-maxrate', `${vKbps}k`, '-bufsize', `${vKbps * 2}k`);
  }
  args.push('-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outPath);
  await exec('ffmpeg', args, { maxBuffer: 1 << 20 });
  return outPath;
}

// ── GOP measurement ───────────────────────────────────────────
/** Estimate the maximum keyframe interval (GOP) in ms. Scans only the first scanSec (fast). Returns fallbackMs if measurement fails. */
export async function probeGop(path, { scanSec = 180, fallbackMs = 4000 } = {}) {
  try {
    const { stdout } = await exec('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-read_intervals', `%+${scanSec}`,
      '-show_entries', 'packet=pts_time,flags',
      '-of', 'csv=print_section=0',
      path,
    ], { maxBuffer: 32 << 20 });
    const keys = [];
    for (const line of stdout.split(/\r?\n/)) {
      const m = /^([\d.]+),\s*K/.exec(line.trim()); // keyframe packet: flags start with K
      if (m) keys.push(parseFloat(m[1]) * 1000);
    }
    keys.sort((a, b) => a - b);
    let gap = 0;
    for (let i = 1; i < keys.length; i++) gap = Math.max(gap, keys[i] - keys[i - 1]);
    return gap > 0 ? Math.ceil(gap) : fallbackMs;
  } catch {
    return fallbackMs;
  }
}

// ── Re-encode encoder selection (fallback only): libx264 by default, HW auto-detected by OS ──
let _venc;
/** Auto-detect an available HW h264 encoder per OS (verifying it actually opens). Falls back to libx264 if none. Cached once. */
export async function pickVideoEncoder() {
  if (_venc !== undefined) return _venc;
  let enc = 'libx264';
  try {
    const { stdout } = await exec('ffmpeg', ['-hide_banner', '-encoders'], { maxBuffer: 4 << 20 });
    const has = (n) => new RegExp(`\\b${n}\\b`).test(stdout);
    const prefs = platform() === 'darwin' ? ['h264_videotoolbox']
      : platform() === 'win32' ? ['h264_nvenc', 'h264_qsv', 'h264_amf']
        : ['h264_nvenc', 'h264_qsv'];
    for (const cand of prefs) {
      if (has(cand) && (await encoderWorks(cand))) { enc = cand; break; } // included in build ≠ actually usable → runtime check
    }
  } catch { /* detection failed → libx264 */ }
  _venc = enc;
  return enc;
}
// Even if included in the build, it fails at runtime without the driver/HW (e.g. nvenc's nvcuda.dll) → verify with a 0.2s dummy encode.
async function encoderWorks(enc) {
  try {
    await exec('ffmpeg', ['-hide_banner', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=128x128:r=10:d=0.2',
      ...encoderVideoArgs(enc), '-f', 'null', '-'], { maxBuffer: 1 << 20 });
    return true;
  } catch { return false; }
}
/** Per-encoder quality args (for the re-encode fallback). */
export function encoderVideoArgs(enc) {
  switch (enc) {
    case 'h264_nvenc': return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '23'];
    case 'h264_qsv': return ['-c:v', 'h264_qsv', '-global_quality', '23'];
    case 'h264_amf': return ['-c:v', 'h264_amf', '-rc', 'cqp', '-qp_i', '23', '-qp_p', '23'];
    case 'h264_videotoolbox': return ['-c:v', 'h264_videotoolbox', '-q:v', '55'];
    default: return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20'];
  }
}

// ── segment splitting ───────────────────────────────────
async function listParts(dir, ext) {
  const names = (await readdir(dir)).filter((n) => /^part_\d+/.test(n) && n.endsWith(ext)).sort();
  return names.map((n) => join(dir, n));
}

/** Whether a real video stream exists (excluding album-art attached_pic). Used to branch audio/video splitting. */
export async function probeHasVideo(path) {
  try {
    const { stdout } = await exec('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=codec_type:stream_disposition=attached_pic', '-of', 'json', path], { maxBuffer: 1 << 20 });
    const streams = JSON.parse(stdout)?.streams ?? [];
    return streams.some((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  } catch {
    return false;
  }
}

// For audio re-encoding, use a codec matching the container (.wav→PCM, etc.) — avoids breakage from putting aac into wav.
function audioCodecArgs(ext) {
  if (/\.wav$/i.test(ext)) return ['-c:a', 'pcm_s16le'];
  if (/\.mp3$/i.test(ext)) return ['-c:a', 'libmp3lame', '-q:a', '2'];
  if (/\.(ogg|oga)$/i.test(ext)) return ['-c:a', 'libvorbis'];
  if (/\.opus$/i.test(ext)) return ['-c:a', 'libopus'];
  if (/\.flac$/i.test(ext)) return ['-c:a', 'flac'];
  return ['-c:a', 'aac', '-b:a', '192k'];
}

/** Lossless (-c copy) split at segMs intervals. Video cuts at keyframe boundaries, audio (audioOnly) at frame boundaries. */
export async function segmentCopy(path, segMs, ext = '.mp4', { audioOnly = false } = {}) {
  const dir = await tempDir();
  const map = audioOnly ? ['-map', '0:a'] : ['-map', '0:v:0', '-map', '0:a:0?'];
  await exec('ffmpeg', [
    '-y', '-i', path, ...map, '-c', 'copy',
    '-f', 'segment', '-segment_time', (segMs / 1000).toFixed(3),
    '-reset_timestamps', '1',
    join(dir, `part_%03d${ext}`),
  ], { maxBuffer: 1 << 20 });
  return listParts(dir, ext);
}

/** Re-encode split at segMs intervals (fallback). Video: force keyframes at boundaries (HW→libx264). Audio: re-encode with the container codec. */
export async function segmentReencode(path, segMs, ext = '.mp4', maxBytes, { audioOnly = false } = {}) {
  if (audioOnly) {
    const dir = await tempDir();
    await exec('ffmpeg', ['-y', '-i', path, '-map', '0:a', ...audioCodecArgs(ext), '-f', 'segment', '-segment_time', (segMs / 1000).toFixed(3), '-reset_timestamps', '1', join(dir, `part_%03d${ext}`)], { maxBuffer: 1 << 20 });
    return listParts(dir, ext);
  }
  const enc = await pickVideoEncoder();
  try {
    return await runSegmentReencode(path, segMs, ext, maxBytes, enc);
  } catch (e) {
    if (enc === 'libx264') throw e;
    _venc = 'libx264'; // HW encoder failed at runtime → use libx264 from now on
    return runSegmentReencode(path, segMs, ext, maxBytes, 'libx264');
  }
}
async function runSegmentReencode(path, segMs, ext, maxBytes, enc) {
  const dir = await tempDir(); // a fresh folder per attempt (so leftovers from a previous attempt don't mix in)
  const segSec = (segMs / 1000).toFixed(3);
  const args = ['-y', '-i', path, ...encoderVideoArgs(enc), '-force_key_frames', `expr:gte(t,n_forced*${segSec})`];
  if (maxBytes && segMs > 0) {
    const vKbps = Math.min(1_000_000, Math.max(100, Math.floor((maxBytes * 8) / 1000 / (segMs / 1000)) - 128));
    args.push('-maxrate', `${vKbps}k`, '-bufsize', `${vKbps * 2}k`);
  }
  args.push('-c:a', 'aac', '-b:a', '128k', '-f', 'segment', '-segment_time', segSec, '-reset_timestamps', '1', join(dir, `part_%03d${ext}`));
  await exec('ffmpeg', args, { maxBuffer: 1 << 20 });
  return listParts(dir, ext);
}

/** Lossless extraction (-c copy) of [startMs,endMs). Keyframe boundaries for video, frame boundaries for audio (for resume re-cutting). */
export async function cutCopy(path, startMs, endMs, outPath) {
  const ss = (startMs / 1000).toFixed(3);
  const t = ((endMs - startMs) / 1000).toFixed(3);
  const hasVideo = await probeHasVideo(path);
  const map = hasVideo ? ['-map', '0:v:0', '-map', '0:a:0?'] : ['-map', '0:a'];
  const extra = hasVideo ? ['-movflags', '+faststart'] : [];
  await exec('ffmpeg', ['-y', '-ss', ss, '-i', path, '-t', t, ...map, '-c', 'copy', '-reset_timestamps', '1', ...extra, outPath], { maxBuffer: 1 << 20 });
  return outPath;
}

export function tempDir() {
  return makeTempDir('dubbing-split-');
}
