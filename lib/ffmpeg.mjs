// ffprobe/ffmpeg 래퍼: 길이·해상도 측정, GOP 측정, segment 무손실 분할, 재인코딩 폴백.
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
 * [startMs,endMs) 구간을 잘라 outPath 생성. 정확한 경계(겹침 방지) 위해 재인코딩(해상도·fps 유지).
 * maxBytes 지정 시 비트레이트 상한(-maxrate)을 걸어 조각 크기를 그 이하로 보장한다.
 */
export async function cut(path, startMs, endMs, outPath, maxBytes) {
  const ss = (startMs / 1000).toFixed(3);
  const durSec = (endMs - startMs) / 1000;
  // -ss before -i = 빠른 입력 탐색 + 재인코딩으로 프레임 정확 출력 (-c copy는 키프레임 단위라 겹침 발생)
  const args = ['-y', '-ss', ss, '-i', path, '-t', durSec.toFixed(3), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20'];
  if (maxBytes && durSec > 0) {
    // 총 비트레이트 = maxBytes*8/dur. 오디오 128k 제외한 영상 상한을 maxrate로.
    // 짧은 구간은 budget이 매우 커져 bufsize(=2*kbps*1000)가 libx264 int32 한도(2.147e9)를 넘으므로 상한 클램프.
    // (그 경우 크기 제약이 비구속적이라 클램프해도 무방 — 짧은 영상은 SIZE_CAP에 근접하지 않음.)
    const vKbps = Math.min(1_000_000, Math.max(100, Math.floor((maxBytes * 8) / 1000 / durSec) - 128));
    args.push('-maxrate', `${vKbps}k`, '-bufsize', `${vKbps * 2}k`);
  }
  args.push('-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outPath);
  await exec('ffmpeg', args, { maxBuffer: 1 << 20 });
  return outPath;
}

// ── GOP 측정 ───────────────────────────────────────────
/** 키프레임 간격(GOP) 최댓값을 ms로 추정. 앞부분 scanSec만 스캔(빠름). 측정 실패 시 fallbackMs. */
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
      const m = /^([\d.]+),\s*K/.exec(line.trim()); // 키프레임 패킷: flags가 K로 시작
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

// ── 재인코딩 인코더 선택(폴백 전용): 기본 libx264, HW는 OS 자동감지 ──
let _venc;
/** 사용 가능한 HW h264 인코더를 OS별로 자동감지(실제 열리는지까지 검증). 없으면 libx264. 1회 캐시. */
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
      if (has(cand) && (await encoderWorks(cand))) { enc = cand; break; } // 빌드 포함≠실사용 → 런타임 확인
    }
  } catch { /* 감지 실패 → libx264 */ }
  _venc = enc;
  return enc;
}
// 빌드에 포함돼도 드라이버/HW가 없으면 런타임 실패(nvenc의 nvcuda.dll 등) → 0.2초 더미 인코드로 검증.
async function encoderWorks(enc) {
  try {
    await exec('ffmpeg', ['-hide_banner', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=128x128:r=10:d=0.2',
      ...encoderVideoArgs(enc), '-f', 'null', '-'], { maxBuffer: 1 << 20 });
    return true;
  } catch { return false; }
}
/** 인코더별 품질 인자(재인코딩 폴백용). */
export function encoderVideoArgs(enc) {
  switch (enc) {
    case 'h264_nvenc': return ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '23'];
    case 'h264_qsv': return ['-c:v', 'h264_qsv', '-global_quality', '23'];
    case 'h264_amf': return ['-c:v', 'h264_amf', '-rc', 'cqp', '-qp_i', '23', '-qp_p', '23'];
    case 'h264_videotoolbox': return ['-c:v', 'h264_videotoolbox', '-q:v', '55'];
    default: return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20'];
  }
}

// ── segment 분할 ───────────────────────────────────────
async function listParts(dir, ext) {
  const names = (await readdir(dir)).filter((n) => /^part_\d+/.test(n) && n.endsWith(ext)).sort();
  return names.map((n) => join(dir, n));
}

/** 실제 비디오 스트림 존재 여부(앨범아트 attached_pic은 제외). 오디오/영상 분할 분기에 사용. */
export async function probeHasVideo(path) {
  try {
    const { stdout } = await exec('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=codec_type:stream_disposition=attached_pic', '-of', 'json', path], { maxBuffer: 1 << 20 });
    const streams = JSON.parse(stdout)?.streams ?? [];
    return streams.some((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  } catch {
    return false;
  }
}

// 오디오 재인코딩 시 컨테이너에 맞는 코덱(.wav→PCM 등) — aac를 wav에 넣어 깨지는 일 방지.
function audioCodecArgs(ext) {
  if (/\.wav$/i.test(ext)) return ['-c:a', 'pcm_s16le'];
  if (/\.mp3$/i.test(ext)) return ['-c:a', 'libmp3lame', '-q:a', '2'];
  if (/\.(ogg|oga)$/i.test(ext)) return ['-c:a', 'libvorbis'];
  if (/\.opus$/i.test(ext)) return ['-c:a', 'libopus'];
  if (/\.flac$/i.test(ext)) return ['-c:a', 'flac'];
  return ['-c:a', 'aac', '-b:a', '192k'];
}

/** segMs 간격으로 무손실(-c copy) 분할. 영상은 키프레임 경계, 오디오(audioOnly)는 프레임 경계에서 컷. */
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

/** segMs 간격 재인코딩 분할(폴백). 영상: 경계 키프레임 강제(HW→libx264). 오디오: 컨테이너 코덱으로 재인코딩. */
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
    _venc = 'libx264'; // HW 인코더 런타임 실패 → 이후로도 libx264
    return runSegmentReencode(path, segMs, ext, maxBytes, 'libx264');
  }
}
async function runSegmentReencode(path, segMs, ext, maxBytes, enc) {
  const dir = await tempDir(); // 시도마다 새 폴더(이전 시도 잔여물과 섞이지 않게)
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

/** [startMs,endMs) 무손실 추출(-c copy). 영상이면 키프레임 경계, 오디오면 프레임 경계(이어하기 재컷용). */
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
