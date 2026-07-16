// Perso API adapter.
//   upload → requestTranslation → getStatus → download
// Errors are thrown as-is via PersoApiError (with code/data) so the caller (scheduler) can branch on them.
import { stat } from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import { basename, extname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { get, post, put, PersoApiError } from './http_client.mjs';
import { AUDIO_EXT, persoBaseUrl } from './config.mjs';

const VT = '/video-translator/api/v1';

// Format rejected by both the video and audio upload endpoints → used to suggest conversion.
export class UnsupportedMediaError extends Error {
  constructor(fileName, cause) {
    super(`Unsupported media format: ${fileName}`);
    this.name = 'UnsupportedMediaError';
    this.fileName = fileName;
    this.cause = cause;
  }
}
// A file path in the response may be relative (perso-storage) → turn it into an absolute URL via the media base + encoding.
// The media host can differ per environment, so it can be overridden with PERSO_MEDIA_BASE (defaults to
// production) — perso.ai hosts only, or an injected env could swap the delivered result files.
const MEDIA_BASE = persoBaseUrl('PERSO_MEDIA_BASE', process.env.PERSO_MEDIA_BASE, 'https://portal-media.perso.ai');
const absolutize = (u) => {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return MEDIA_BASE + encodeURI(u.startsWith('/') ? u : `/${u}`);
};

// ── upload ──────────────────────────────────────────────
// Server-measured media length from the register response (durationMs) → whole seconds; null when absent.
const regDurationSec = (r) => {
  const ms = Number(r?.durationMs);
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 1000) : null;
};

/** prepared({source,localPath|sourceUrl,originalName}) → { seq:mediaSeq, kind:'video'|'audio', durationSec:number|null } */
export async function upload(prepared, spaceSeq) {
  if (prepared.source === 'external') {
    const r = await put('/file/api/upload/video/external', {
      body: { space_seq: spaceSeq, url: prepared.sourceUrl },
    });
    return { seq: r.seq, kind: 'video', durationSec: regDurationSec(r) };
  }
  return uploadLocal(prepared.localPath, prepared.originalName, spaceSeq);
}

async function uploadLocal(localPath, fileName, spaceSeq) {
  const name = fileName || basename(localPath);

  // 1) SAS token (fileName is encoded by URLSearchParams)
  const sas = await get('/file/api/upload/sas-token', { query: { fileName: name } });
  const blobSasUrl = sas?.blobSasUrl;
  if (!blobSasUrl) throw new Error('Failed to get an upload token — check your API key and permissions.');

  // 2) PUT directly to Azure Blob (without XP-API-KEY).
  //    Stream the file instead of loading it entirely into memory → safe even for files over 2GiB (the readFile limit).
  const { size } = await stat(localPath);
  const blobRes = await fetch(blobSasUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Length': String(size) },
    body: createReadStream(localPath),
    duplex: 'half', // undici: required for streaming the request body
  });
  if (!blobRes.ok) throw new Error(`Azure upload failed (${blobRes.status})`);

  // 3) Register — decide by extension first: for an audio extension, go straight to the audio endpoint (skip the unnecessary video attempt).
  //    Otherwise (video/unknown), register as video, and if there's no video stream (F4007), fall back to audio → safe even if the extension is wrong.
  //    If both video and audio are rejected, it's an unsupported format (UnsupportedMediaError) → the caller suggests conversion.
  const fileUrl = blobSasUrl.split('?')[0];
  const reg = async (k) => {
    const r = await put(`/file/api/upload/${k}`, { body: { spaceSeq, fileUrl, fileName: name } });
    return { seq: r.seq, kind: k, durationSec: regDurationSec(r) };
  };
  // Only length/size errors (F4008/F4004) are thrown as-is so the caller can split. Other register rejections (401, audio failure after F4007, etc.)
  // are treated as unsupported formats — if the key were wrong it would already have failed at the SAS token above, so a 401 here is not an auth problem.
  const keep = (e) => e instanceof PersoApiError && (e.code === 'F4008' || e.code === 'F4004');

  if (AUDIO_EXT.test(name)) {
    try { return await reg('audio'); }
    catch (e) { if (keep(e)) throw e; throw new UnsupportedMediaError(name, e); }
  }
  try {
    return await reg('video');
  } catch (e) {
    if (keep(e)) throw e;
    if (e instanceof PersoApiError && e.code === 'F4007') { // no video stream → try audio
      try { return await reg('audio'); }
      catch (e2) { if (keep(e2)) throw e2; throw new UnsupportedMediaError(name, e2); }
    }
    throw new UnsupportedMediaError(name, e); // not video and not F4007 → a format problem
  }
}

// ── queue status ────────────────────────────────────────
const _queueInited = new Set(); // initialize the queue once per space (idempotent) — shared by getQueueStatus/requestTranslation
/** Query queue status (= the queue PUT response: usedQueueCount/maxQueueCount). Returns { used, max, available }, or null on failure. */
export async function getQueueStatus(spaceSeq) {
  try {
    const r = await put(`${VT}/projects/spaces/${spaceSeq}/queue`); // PUT does both init and query
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
/** Initialize the queue, then request translation → array of projectIds (startGenerateProjectIdList) */
export async function requestTranslation(spaceSeq, mediaSeq, opts = {}) {
  const {
    source = 'auto',
    target = 'en',
    ttsModel = 'AUDIO_ENGINE_V3',
    numberOfSpeakers = 1,
    speed = 'GREEN',
    title,
    kind = 'video', // 'audio' means isVideoProject=false
  } = opts;

  // Initialize the queue — once per space (not on every chunk → halves the request count, eases rate limiting)
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

// ── audio separation ───────────────────────────────────
/** Request voice/background separation of an uploaded media → array of projectIds (same async project pattern as translate). */
export async function requestAudioSeparation(spaceSeq, mediaSeq, { title, kind = 'video' } = {}) {
  if (!_queueInited.has(spaceSeq)) {
    await put(`${VT}/projects/spaces/${spaceSeq}/queue`).catch(() => {});
    _queueInited.add(spaceSeq);
  }
  const body = { mediaSeq, isVideoProject: kind !== 'audio', ...(title ? { title } : {}) };
  const res = await post(`${VT}/projects/spaces/${spaceSeq}/audio-separation`, { body });
  return res?.result?.startGenerateProjectIdList ?? [];
}

/** Download the separated tracks of a completed separation project. `download?target=` does not serve the
 *  voice/base-background tracks (server gap, verified 2026-07: VT4001/VT5001) — the project detail's
 *  downloadPathInfo does. outPathFor(label, ext) decides where each track is written. */
export async function downloadSeparation(projectSeq, spaceSeq, outPathFor) {
  const p = await get(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}`);
  const d = p?.downloadPathInfo ?? {};
  const tracks = [
    ['voice', d.originalVoicePath],
    ['background', d.originalBackgroundPath],
    ['sub_background', d.originalSubBackgroundPath],
  ].filter(([, rel]) => rel);
  if (!tracks.length) throw new Error('No separated tracks found on the project.');
  const saved = [];
  for (const [label, rel] of tracks) {
    const link = absolutize(rel);
    const fileName = decodeURIComponent(new URL(link).pathname.split('/').pop() || '') || null;
    const outPath = outPathFor(label, extname(fileName ?? '') || '.wav');
    await fetchToFile(link, outPath);
    saved.push({ label, path: outPath, fileName });
  }
  return saved;
}

// ── speech-to-text (subtitle extraction) ───────────────
/** Create an STT project for an uploaded media → array of projectIds (same async project pattern as translate).
 *  One project per requested output language — billing is per project, so N languages = N calls with the same mediaSeq. */
export async function requestStt(spaceSeq, mediaSeq, { title, kind = 'video' } = {}) {
  if (!_queueInited.has(spaceSeq)) {
    await put(`${VT}/projects/spaces/${spaceSeq}/queue`).catch(() => {});
    _queueInited.add(spaceSeq);
  }
  const body = { mediaSeq, isVideoProject: kind !== 'audio', ...(title ? { title } : {}) };
  const res = await post(`${VT}/projects/spaces/${spaceSeq}/stt`, { body });
  return res?.result?.startGenerateProjectIdList ?? [];
}

/** Download the source-language subtitle (SRT) of a completed STT project via download?target=audioScript.
 *  The payload's link field name is not documented — rely on the generic *DownloadLink scan.
 *  outPathFor(serverFileName) decides where the file is written. */
export async function downloadAudioScript(projectSeq, spaceSeq, outPathFor) {
  const info = await get(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}/download-info`);
  const flags = info?.result ?? info;
  if (flags?.hasOriginalSubtitle === false) throw new Error('The subtitle is not ready yet.');
  const res = await get(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}/download`, { query: { target: 'audioScript' } });
  const raw = findDownloadLink(res?.result ?? {});
  if (!raw) throw new Error('Could not find a subtitle download link.');
  const link = absolutize(raw);
  const fileName = decodeURIComponent(new URL(link).pathname.split('/').pop() || '') || null;
  const outPath = outPathFor(fileName ?? `subtitle_${projectSeq}.srt`);
  await fetchToFile(link, outPath);
  return { path: outPath, fileName };
}

// ── requestLipSync ─────────────────────────────────────
/** Request lip-sync generation for a completed translation project → array of new projectIds (a lip-sync run is a separate project). */
export async function requestLipSync(projectSeq, spaceSeq, { speed = 'GREEN', title } = {}) {
  const body = { preferredSpeedType: speed, ...(title ? { title } : {}) }; // title omitted → the parent project's title is used
  const res = await post(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}/lip-sync`, { body });
  return res?.result?.startGenerateProjectIdList ?? [];
}

// ── getStatus ──────────────────────────────────────────
/** Normalize based on progressReason. On failure, classify whether it's silence via engineErrorMessage from /progress. */
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
      message = em?.en || em?.ko || null;
      // Only let 'no voice detected' through (use the original). Decide by the English message only (avoid misclassifying other engine errors).
      noVoice = /no voice|detect any voice/i.test(em?.en ?? '');
    } catch {
      /* ignore failures to fetch the message */
    }
    return { state: 'failed', failureReason: p.failureReason ?? null, noVoice, message, projectSeq };
  }

  // State determination is based on progressReason.
  return { state: 'processing', progress: p.progress ?? 0, progressReason: reason, projectSeq };
}

// ── cancel ─────────────────────────────────────────────
/** Cancel an in-progress/pending project. Ignore failures (already finished or cannot be canceled). */
export async function cancel(projectSeq, spaceSeq) {
  try {
    await post(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}/cancel`, { body: {} });
    return true;
  } catch {
    return false;
  }
}

// ── download ───────────────────────────────────────────
// Fallback link scan: any string value under a *DownloadLink key (payload field names vary per target).
function findDownloadLink(o) {
  if (!o || typeof o !== 'object') return null;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && /DownloadLink$/.test(k) && v) return v;
    if (v && typeof v === 'object') {
      const hit = findDownloadLink(v);
      if (hit) return hit;
    }
  }
  return null;
}

/** Check download-info → download?target → download link (save to outPath if needed). lipsync:true fetches the lip-sync video. */
export async function download(projectSeq, spaceSeq, { kind = 'video', outPath, lipsync = false } = {}) {
  const isAudio = !lipsync && kind === 'audio';
  const target = lipsync ? 'lipSyncVideo' : isAudio ? 'voiceWithBackgroundAudio' : 'dubbingVideo';
  const info = await get(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}/download-info`);
  const flags = info?.result ?? info;
  if (lipsync) {
    if (flags?.hasLipSyncVideo === false) throw new Error('Lip-sync video is not ready yet.');
  } else if (isAudio) {
    if (flags?.hasTranslatedVoice === false && flags?.hasTranslateAudio === false) {
      throw new Error('Translated audio is not ready yet.');
    }
  } else if (flags?.hasTranslatedVideo === false) {
    throw new Error('Translated video is not ready yet.');
  }

  const res = await get(`${VT}/projects/${projectSeq}/spaces/${spaceSeq}/download`, { query: { target } });
  const r = res?.result ?? {};
  const raw =
    r.videoFile?.videoDownloadLink ??
    r.audioFile?.voiceWithBackgroundAudioDownloadLink ??
    r.zippedFileDownloadLink ??
    findDownloadLink(r);
  if (!raw) throw new Error('Could not find a download link.');
  const link = absolutize(raw);
  const fileName = decodeURIComponent(new URL(link).pathname.split('/').pop() || '') || null;

  if (outPath) await fetchToFile(link, outPath);
  return { link, outPath: outPath ?? null, fileName };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Generation is often already done (projectSeq is valid) and only the transfer fails, so retry the same link a few times (not regeneration).
async function fetchToFile(url, outPath, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok || !res.body) throw new Error(`File download failed (${res.status})`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath));
      return;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(1000 * (i + 1)); // 1s, 2s backoff
    }
  }
  throw lastErr;
}
