// Perso API 어댑터.
//   upload → requestTranslation → getStatus → download
// 에러는 PersoApiError(code/data 포함)로 그대로 던져 상위(스케줄러)가 분기한다.
import { stat } from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import { basename } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { get, post, put, PersoApiError } from './http_client.mjs';
import { AUDIO_EXT } from './config.mjs';

const VT = '/video-translator/api/v1';

// 업로드 시 영상·오디오 어느 엔드포인트로도 받아들여지지 않는 형식 → 변환 제안용.
export class UnsupportedMediaError extends Error {
  constructor(fileName, cause) {
    super(`지원되지 않는 미디어 형식: ${fileName}`);
    this.name = 'UnsupportedMediaError';
    this.fileName = fileName;
    this.cause = cause;
  }
}
// 응답의 파일 경로는 상대경로(perso-storage)일 수 있음 → 미디어 베이스 + 인코딩으로 절대 URL화.
// 미디어 호스트는 환경별로 다를 수 있어 PERSO_MEDIA_BASE로 override (기본 production).
const MEDIA_BASE = (process.env.PERSO_MEDIA_BASE || 'https://portal-media.perso.ai').replace(/\/+$/, '');
const absolutize = (u) => {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return MEDIA_BASE + encodeURI(u.startsWith('/') ? u : `/${u}`);
};

// ── upload ──────────────────────────────────────────────
/** prepared({source,localPath|sourceUrl,originalName}) → { seq:mediaSeq, kind:'video'|'audio' } */
export async function upload(prepared, spaceSeq) {
  if (prepared.source === 'external') {
    const r = await put('/file/api/upload/video/external', {
      body: { space_seq: spaceSeq, url: prepared.sourceUrl },
    });
    return { seq: r.seq, kind: 'video' };
  }
  return uploadLocal(prepared.localPath, prepared.originalName, spaceSeq);
}

async function uploadLocal(localPath, fileName, spaceSeq) {
  const name = fileName || basename(localPath);

  // 1) SAS 토큰 (fileName은 URLSearchParams가 인코딩)
  const sas = await get('/file/api/upload/sas-token', { query: { fileName: name } });
  const blobSasUrl = sas?.blobSasUrl;
  if (!blobSasUrl) throw new Error('업로드 토큰을 받지 못했습니다 — API 키·권한을 확인하세요.');

  // 2) Azure Blob에 직접 PUT (XP-API-KEY 미포함).
  //    파일을 통째로 메모리에 올리지 않고 스트림으로 전송 → 2GiB(readFile 한계) 초과 파일도 안전.
  const { size } = await stat(localPath);
  const blobRes = await fetch(blobSasUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Length': String(size) },
    body: createReadStream(localPath),
    duplex: 'half', // undici: 스트림 본문 전송에 필요
  });
  if (!blobRes.ok) throw new Error(`Azure 업로드 실패 (${blobRes.status})`);

  // 3) 등록 — 확장자로 먼저 판별: 오디오 확장자면 audio 엔드포인트로 바로(불필요한 비디오 시도 생략).
  //    그 외(영상/미상)는 video로 등록하고, 비디오 스트림 없음(F4007)이면 audio로 폴백 → 확장자가 틀려도 안전.
  //    영상·오디오 둘 다 거부되면 미지원 형식(UnsupportedMediaError) → 상위에서 변환 제안.
  const fileUrl = blobSasUrl.split('?')[0];
  const reg = async (k) => {
    const r = await put(`/file/api/upload/${k}`, { body: { spaceSeq, fileUrl, fileName: name } });
    return { seq: r.seq, kind: k };
  };
  // 길이/용량(F4008/F4004)만 그대로 던져 상위가 분할. 그 외 register 거부(401·F4007후 오디오 실패 등)는
  // 미지원 형식으로 본다 — 키가 틀렸으면 위 SAS 토큰에서 이미 실패하므로 여기 401은 인증 문제가 아님.
  const keep = (e) => e instanceof PersoApiError && (e.code === 'F4008' || e.code === 'F4004');

  if (AUDIO_EXT.test(name)) {
    try { return await reg('audio'); }
    catch (e) { if (keep(e)) throw e; throw new UnsupportedMediaError(name, e); }
  }
  try {
    return await reg('video');
  } catch (e) {
    if (keep(e)) throw e;
    if (e instanceof PersoApiError && e.code === 'F4007') { // 비디오 스트림 없음 → 오디오로
      try { return await reg('audio'); }
      catch (e2) { if (keep(e2)) throw e2; throw new UnsupportedMediaError(name, e2); }
    }
    throw new UnsupportedMediaError(name, e); // 영상도 아니고 F4007도 아님 → 형식 문제
  }
}

// ── queue status ────────────────────────────────────────
const _queueInited = new Set(); // space별 큐 초기화 1회만(멱등) — getQueueStatus/requestTranslation이 공유
/** 큐 상태 조회(= 큐 PUT의 응답: usedQueueCount/maxQueueCount). { used, max, available } 또는 실패 시 null. */
export async function getQueueStatus(spaceSeq) {
  try {
    const r = await put(`${VT}/projects/spaces/${spaceSeq}/queue`); // PUT이 init+조회 겸함
    _queueInited.add(spaceSeq);
    const d = r?.data ?? r?.result ?? r ?? {};
    const max = Number(d.maxQueueCount);
    if (!Number.isFinite(max) || max <= 0) return null;
    const used = Number.isFinite(Number(d.usedQueueCount)) ? Number(d.usedQueueCount) : 0;
    return { used, max, available: Math.max(0, max - used) };
  } catch {
    return null;
  }
}

// ── requestTranslation ─────────────────────────────────
/** 큐 초기화 후 번역 요청 → projectId 배열(startGenerateProjectIdList) */
export async function requestTranslation(spaceSeq, mediaSeq, opts = {}) {
  const {
    source = 'auto',
    target = 'en',
    ttsModel = 'AUDIO_ENGINE_V3',
    numberOfSpeakers = 1,
    speed = 'GREEN',
    title,
    kind = 'video', // 'audio'면 isVideoProject=false
  } = opts;

  // 큐 초기화 — space당 1회만(매 청크 호출 X → 요청량 절반, 레이트리밋 완화)
  if (!_queueInited.has(spaceSeq)) {
    await put(`${VT}/projects/spaces/${spaceSeq}/queue`).catch(() => {});
    _queueInited.add(spaceSeq);
  }

  const body = {
    mediaSeq,
    isVideoProject: kind !== 'audio',
    sourceLanguageCode: source,
    targetLanguages: [{ languageCode: target, ttsModel }],
    numberOfSpeakers,
    preferredSpeedType: speed,
    ...(title ? { title } : {}),
  };
  const res = await post(`${VT}/projects/spaces/${spaceSeq}/translate`, { body });
  return res?.result?.startGenerateProjectIdList ?? [];
}

// ── getStatus ──────────────────────────────────────────
/** progressReason 기준 정규화. 실패면 /progress의 engineErrorMessage로 무음 여부 분류. */
export async function getStatus(projectSeq, spaceSeq) {
  const p = await get(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}`);
  const reason = p.progressReason;

  if (reason === 'Completed') {
    return { state: 'complete', progress: p.progress ?? 100, projectSeq };
  }

  if (reason === 'Failed') {
    let message = null;
    let noVoice = false;
    try {
      const pr = await get(`${VT}/projects/${projectSeq}/space/${spaceSeq}/progress`);
      const em = pr?.result?.engineErrorMessage?.errorMessage;
      message = em?.ko || em?.en || null;
      // '음성 미검출'만 통과(원본 사용). 영문 메시지로만 판정(그 외 엔진오류 오분류 방지).
      noVoice = /no voice|detect any voice/i.test(em?.en ?? '');
    } catch {
      /* 메시지 조회 실패는 무시 */
    }
    return { state: 'failed', failureReason: p.failureReason ?? null, noVoice, message, projectSeq };
  }

  // 상태 판정은 progressReason 기준.
  return { state: 'processing', progress: p.progress ?? 0, progressReason: reason, projectSeq };
}

// ── cancel ─────────────────────────────────────────────
/** 진행/대기 중인 프로젝트 취소. 실패해도 무시(이미 끝났거나 취소 불가). */
export async function cancel(projectSeq, spaceSeq) {
  try {
    await post(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}/cancel`, { body: {} });
    return true;
  } catch {
    return false;
  }
}

// ── download ───────────────────────────────────────────
/** download-info 확인 → download?target → 다운로드 링크(필요 시 outPath로 저장). */
export async function download(projectSeq, spaceSeq, { kind = 'video', outPath } = {}) {
  const isAudio = kind === 'audio';
  const target = isAudio ? 'voiceWithBackgroundAudio' : 'dubbingVideo'; // 오디오 더빙 결과 타깃
  const info = await get(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}/download-info`);
  const flags = info?.result ?? info;
  if (isAudio) {
    if (flags?.hasTranslatedVoice === false && flags?.hasTranslateAudio === false) {
      throw new Error('번역 오디오가 아직 준비되지 않았습니다.');
    }
  } else if (flags?.hasTranslatedVideo === false) {
    throw new Error('번역 영상이 아직 준비되지 않았습니다.');
  }

  const res = await get(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}/download`, { query: { target } });
  const r = res?.result ?? {};
  const raw =
    r.videoFile?.videoDownloadLink ??
    r.audioFile?.voiceWithBackgroundAudioDownloadLink ??
    r.zippedFileDownloadLink ??
    null;
  if (!raw) throw new Error('다운로드 링크를 찾지 못했습니다.');
  const link = absolutize(raw);
  const fileName = decodeURIComponent(new URL(link).pathname.split('/').pop() || '') || null;

  if (outPath) await fetchToFile(link, outPath);
  return { link, outPath: outPath ?? null, fileName };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 생성은 끝났고(projectSeq 유효) 전송만 실패하는 경우가 많아 같은 링크로 몇 번 재시도한다(재생성 아님).
async function fetchToFile(url, outPath, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok || !res.body) throw new Error(`파일 다운로드 실패 (${res.status})`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath));
      return;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(1000 * (i + 1)); // 1s, 2s 백오프
    }
  }
  throw lastErr;
}
