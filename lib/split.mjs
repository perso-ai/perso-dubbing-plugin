// 업로드 우선 + 길이/크기 캡: 통째 업로드를 먼저 시도한다.
//   - 성공            → 단일 청크(이미 업로드됨). ffmpeg/ffprobe 미사용.
//   - F4008(길이)      → maxLengthMs로 segment 무손실 분할
//   - F4004(크기>2GB)  → ~2GB에 맞는 길이로 segment 무손실 분할 (-c copy → 원본 비트레이트 유지)
//   분할은 segment 먹서(-c copy + -reset_timestamps 1, SEG=한도−GOP−여유). 무손실 불가 시에만 재인코딩 폴백.
//   분할 조각도 다시 업로드 시도 → 여전히 초과면 재귀 분할. 잎 조각은 mediaSeq를 갖는다.
import { stat } from 'node:fs/promises';
import { extname, join, basename } from 'node:path';
import { PersoApiError } from './http_client.mjs';
import { upload } from './api_adapter.mjs';
import { probe, cut, cutCopy, tempDir, probeGop, probeHasVideo, segmentCopy, segmentReencode } from './ffmpeg.mjs';
import { ensureFfmpeg } from '../scripts/check_deps.mjs';

// 업로드 크기 상한(API 2GB) 미만 안전 마진. env로 override 가능.
const SIZE_CAP = Number(process.env.PERSO_SIZE_CAP_BYTES) || Math.floor(1.9 * 1024 ** 3);
const MAX_DEPTH = 4;
const SEG_MARGIN_MS = 2000; // SEG = 한도 − GOP − 여유(margin): 한도 아래로 두는 안전 버퍼
const MIN_SEG_MS = 3000;    // SEG가 이보다 작으면(GOP가 한도 대비 과대) 무손실 불가 → 재인코딩 폴백

/** @returns {{chunks:Array<{index,source,path?,sourceUrl?,mediaSeq?,startMs?,endMs?}>, notice:string|null}} */
export async function resolveChunks(prepared, spaceSeq, hooks = {}) {
  const log = hooks.log ?? (() => {});
  const notify = hooks.notify ?? (() => {}); // 사용자 노출 마일스톤(분할 시작 등)
  if (prepared.source === 'external') {
    return { chunks: [{ index: 0, source: 'external', sourceUrl: prepared.sourceUrl }], notice: null };
  }

  const localPath = prepared.localPath ?? prepared.path;
  const leaves = await uploadOrSplit(localPath, spaceSeq, 0, 0, null, log, notify);
  // 잎의 절대 경계(startMs/endMs)를 청크에 싣는다 → 이어하기(resume) 때 원본에서 그 구간만 재컷한다.
  // 분할 시 제목에 _01,_02… 넘버링 → Perso 프로젝트 목록에서 동일 원본의 조각임을 구분(단일 조각은 원본명 그대로).
  const baseTitle = (prepared.originalName ?? basename(localPath)).replace(/\.[^.]+$/, '');
  const chunks = leaves.map((l, i) => ({
    index: i, source: 'local', path: l.path, mediaSeq: l.mediaSeq, kind: l.kind, startMs: l.startMs, endMs: l.endMs,
    title: leaves.length > 1 ? `${baseTitle}_${String(i + 1).padStart(2, '0')}` : baseTitle,
  }));
  const notice = chunks.length > 1 ? `자동 분할: ${chunks.length}조각 (길이/크기 한도 대응)` : null;
  return { chunks, notice };
}

/**
 * 업로드 시도 → F4008/F4004면 분할 후 각 조각 재귀. 성공 잎은 {path, mediaSeq, startMs, endMs}.
 * startMs/spanMs는 원본 기준 절대 위치(분할 안 된 통짜 잎은 endMs=null).
 * 곁다리 최적화: 크기 초과는 로컬 stat으로 미리 알 수 있으니, 거대 파일을 통째 업로드하지 않고 바로 분할한다.
 */
async function uploadOrSplit(localPath, spaceSeq, depth, startMs = 0, spanMs = null, log = () => {}, notify = () => {}) {
  if (depth < MAX_DEPTH) {
    const { size } = await stat(localPath);
    if (size > SIZE_CAP) { // 크기 초과 → 업로드 전에 분할
      log('용량이 커서 영상을 나눠서 처리합니다. 자르고 합치는 데 시간이 좀 걸려요.');
      return splitAndRecurse(localPath, spaceSeq, depth, startMs, Infinity, log, notify);
    }
  }
  try {
    if (depth === 0) log('영상 업로드 중... (큰 영상은 시간이 걸려요)');
    const { seq: mediaSeq, kind } = await upload({ source: 'local', localPath, originalName: basename(localPath) }, spaceSeq);
    return [{ path: localPath, mediaSeq, kind, startMs, endMs: spanMs == null ? null : startMs + spanMs }];
  } catch (e) {
    const code = e instanceof PersoApiError ? e.code : null;
    if (code !== 'F4008' && code !== 'F4004') throw e; // 길이/크기 외 에러는 그대로
    if (depth >= MAX_DEPTH) throw new Error(`분할 한계(depth ${depth}) 초과 — 업로드 불가`);
    log('길이/용량 한도를 넘어 영상을 나눠서 처리합니다. 자르고 합치는 데 시간이 좀 걸려요.');
    const lengthCapMs = code === 'F4008' ? Number(e.data?.maxLengthMs) : Infinity;
    return splitAndRecurse(localPath, spaceSeq, depth, startMs, lengthCapMs, log, notify);
  }
}

/** localPath를 길이/크기 한도로 분할하고 각 조각을 재귀 업로드. baseStartMs는 원본 기준 절대 오프셋. */
async function splitAndRecurse(localPath, spaceSeq, depth, baseStartMs, lengthCapMs, log = () => {}, notify = () => {}) {
  ensureFfmpeg(); // 자르기 확정 시점에만 설치
  if (depth === 0) notify('분할 시작 — 길이/용량 한도를 넘어 영상을 나눠서 처리합니다.'); // 사용자 노출
  const { durationMs, sizeBytes } = await probe(localPath);
  if (!durationMs) throw new Error('영상 길이를 측정하지 못했습니다.');

  const capMs = computeChunkMs(durationMs, sizeBytes, lengthCapMs); // 길이/크기 중 작은 한도
  const parts = await splitByMaxLen(localPath, durationMs, capMs, SIZE_CAP, log);

  const out = [];
  for (let i = 0; i < parts.length; i++) {
    log(`조각 ${i + 1}/${parts.length} 업로드 중...`);
    const p = parts[i];
    out.push(...(await uploadOrSplit(p.path, spaceSeq, depth + 1, baseStartMs + p.startMs, p.durationMs, log, notify)));
  }
  return out;
}

/** 이어하기용: 원본에서 [startMs,endMs) 구간을 분할 때와 동일 경계로 다시 잘라 임시파일로 만든다. */
export async function recutChunk(localPath, startMs, endMs) {
  ensureFfmpeg();
  const dir = await tempDir();
  const ext = extname(localPath) || '.mp4';
  const out = join(dir, `recut_${startMs}_${endMs}${ext}`);
  try {
    await cutCopy(localPath, startMs, endMs, out); // 무손실 우선(경계는 분할 때의 키프레임)
    const { durationMs } = await probe(out).catch(() => ({}));
    if (durationMs && durationMs > 200) return out;
  } catch { /* 폴백 ↓ */ }
  await cut(localPath, startMs, endMs, out, SIZE_CAP); // 재인코딩 폴백(프레임 정확)
  return out;
}

/** 길이 캡과 크기 캡 중 작은 값으로 조각 길이(ms) 결정. 해상도·fps와 무관(시간만 자름). */
export function computeChunkMs(durationMs, sizeBytes, lengthCapMs = Infinity, sizeCap = SIZE_CAP) {
  let chunkMs = durationMs;
  if (Number.isFinite(lengthCapMs) && lengthCapMs > 0) chunkMs = Math.min(chunkMs, lengthCapMs);
  if (sizeBytes && sizeBytes > sizeCap) {
    const sizeMs = Math.floor((durationMs * sizeCap) / sizeBytes);
    if (sizeMs > 0) chunkMs = Math.min(chunkMs, sizeMs);
  }
  if (chunkMs >= durationMs) chunkMs = Math.floor(durationMs / 2); // 못 좁히면 절반(무한루프 방지)
  return Math.max(1, chunkMs);
}

/**
 * capMs 한도에 맞춰 segment 무손실 분할(-c copy). SEG = capMs − GOP − 여유 로 잡아
 * 키프레임 경계에서 잘려도 각 조각이 한도를 넘지 않게 한다. 무손실 불가/초과 시에만 재인코딩 폴백.
 * @returns {Array<{index,path,startMs,durationMs}>}
 */
export async function splitByMaxLen(path, durationMs, capMs, maxBytes, log = () => {}) {
  const ext = extname(path) || '.mp4';
  const audioOnly = !(await probeHasVideo(path)); // 오디오 파일은 비디오 스트림이 없음
  let paths = null;

  if (audioOnly) {
    // 오디오: 키프레임/GOP 무관(프레임 단위로 어디서나 컷) → SEG = 한도 − 여유. -c copy 무손실(컨테이너 맞춤 코덱 폴백).
    const segMs = Math.max(MIN_SEG_MS, capMs - SEG_MARGIN_MS);
    log(`무손실 분할 중... (오디오, 조각 ≈${Math.round(segMs / 1000)}s)`);
    try {
      paths = await segmentCopy(path, segMs, ext, { audioOnly: true });
      if (await anyOverCap(paths, capMs)) paths = null;
    } catch {
      paths = null;
    }
    if (!paths || !paths.length) {
      log('오디오 재인코딩 분할(폴백)');
      paths = await segmentReencode(path, segMs, ext, maxBytes, { audioOnly: true });
    }
  } else {
    // 영상: 키프레임 경계에서만 컷 → SEG = 한도 − GOP − 여유.
    const gopMs = await probeGop(path);
    const margin = Math.max(SEG_MARGIN_MS, gopMs); // GOP 과소측정 대비 여유
    const segMs = capMs - gopMs - margin;
    if (segMs >= MIN_SEG_MS) {
      log(`무손실 분할 중... (GOP ≈${Math.round(gopMs)}ms, 조각 ≈${Math.round(segMs / 1000)}s)`);
      try {
        paths = await segmentCopy(path, segMs, ext);
        if (await anyOverCap(paths, capMs)) { log('일부 조각이 한도 초과 → 재인코딩 분할로 재시도'); paths = null; }
      } catch {
        paths = null; // -c copy 실패(컨테이너/코덱) → 폴백
      }
    }
    if (!paths || !paths.length) {
      const reSeg = Math.max(MIN_SEG_MS, capMs - margin); // 재인코딩은 경계에 키프레임 강제 → GOP 무관
      log(`재인코딩 분할(폴백) 중... (조각 ≈${Math.round(reSeg / 1000)}s)`);
      paths = await segmentReencode(path, reSeg, ext, maxBytes);
    }
  }

  // 각 조각 실제 길이 측정 → 원본 기준 startMs(누적) + durationMs (이어하기 재컷 경계로 사용)
  const chunks = [];
  let acc = 0;
  for (let i = 0; i < paths.length; i++) {
    const { durationMs: d } = await probe(paths[i]).catch(() => ({}));
    const dur = d ?? Math.max(1, Math.min(capMs, durationMs - acc));
    chunks.push({ index: i, path: paths[i], startMs: acc, durationMs: dur });
    acc += dur;
  }
  return chunks;
}

/** 조각 중 하나라도 capMs를 넘으면 true(무손실 키프레임컷이 한도를 넘긴 드문 경우 탐지). */
async function anyOverCap(paths, capMs) {
  for (const p of paths) {
    const { durationMs } = await probe(p).catch(() => ({}));
    if (durationMs && durationMs > capMs) return true;
  }
  return false;
}
