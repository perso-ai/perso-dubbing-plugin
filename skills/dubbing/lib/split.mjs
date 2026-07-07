// Upload-first + length/size cap: try uploading the whole file first.
//   - success           → single chunk (already uploaded). ffmpeg/ffprobe not used.
//   - F4008 (length)     → lossless segment split by maxLengthMs
//   - F4004 (size>2GB)   → lossless segment split to a length that fits ~2GB (-c copy → keep original bitrate)
//   Splitting uses the segment muxer (-c copy + -reset_timestamps 1, SEG=cap−GOP−margin). Re-encode fallback only when lossless is impossible.
//   Each split piece is uploaded again → if still over the limit, split recursively. Leaf pieces hold a mediaSeq.
import { stat } from 'node:fs/promises';
import { extname, join, basename } from 'node:path';
import { PersoApiError } from './http_client.mjs';
import { upload } from './api_adapter.mjs';
import { probe, cut, cutCopy, tempDir, probeGop, probeHasVideo, segmentCopy, segmentReencode } from './ffmpeg.mjs';
import { ensureFfmpeg } from '../scripts/check_deps.mjs';

// Safe margin below the upload size limit (API 2GB). Overridable via env.
const SIZE_CAP = Number(process.env.PERSO_SIZE_CAP_BYTES) || Math.floor(1.9 * 1024 ** 3);
const MAX_DEPTH = 4;
const SEG_MARGIN_MS = 2000; // SEG = cap − GOP − margin: a safety buffer to stay below the cap
const MIN_SEG_MS = 3000;    // if SEG is smaller than this (GOP too large relative to the cap), lossless is impossible → re-encode fallback

/** Thrown at depth 0 when a split is required but the user hasn't authorized it yet (no allowSplit).
 *  Carries what the caller needs to build the confirmation prompt: { reason:'length'|'size', limitMs?, actualMs?, actualBytes? }. */
export class SplitConfirmNeeded extends Error {
  constructor(details) { super('split confirmation required'); this.name = 'SplitConfirmNeeded'; this.details = details; }
}

/** @returns {{chunks:Array<{index,source,path?,sourceUrl?,mediaSeq?,startMs?,endMs?}>, notice:string|null}} */
export async function resolveChunks(prepared, spaceSeq, hooks = {}) {
  const log = hooks.log ?? (() => {});
  const notify = hooks.notify ?? (() => {}); // user-facing milestones (split start, etc.)
  const allowSplit = hooks.allowSplit ?? false; // false → stop and ask before the first split (SplitConfirmNeeded)
  if (prepared.source === 'external') {
    return { chunks: [{ index: 0, source: 'external', sourceUrl: prepared.sourceUrl }], notice: null };
  }

  const localPath = prepared.localPath ?? prepared.path;
  const leaves = await uploadOrSplit(localPath, spaceSeq, 0, 0, null, log, notify, allowSplit);
  // carry each leaf's absolute boundaries (startMs/endMs) on the chunk → on resume, re-cut only that segment from the original.
  // when split, number the title _01,_02… → in the Perso project list, distinguish pieces of the same original (a single piece keeps the original name).
  const baseTitle = (prepared.originalName ?? basename(localPath)).replace(/\.[^.]+$/, '');
  const chunks = leaves.map((l, i) => ({
    index: i, source: 'local', path: l.path, mediaSeq: l.mediaSeq, kind: l.kind, startMs: l.startMs, endMs: l.endMs,
    title: leaves.length > 1 ? `${baseTitle}_${String(i + 1).padStart(2, '0')}` : baseTitle,
  }));
  const notice = chunks.length > 1 ? `Auto-split: ${chunks.length} parts (length/size limit)` : null;
  return { chunks, notice };
}

/**
 * Try to upload → on F4008/F4004, split and recurse into each piece. A successful leaf is {path, mediaSeq, startMs, endMs}.
 * startMs/spanMs are absolute positions relative to the original (an unsplit whole leaf has endMs=null).
 * Side optimization: a size overflow can be known in advance via local stat, so split a huge file directly instead of uploading it whole.
 */
async function uploadOrSplit(localPath, spaceSeq, depth, startMs = 0, spanMs = null, log = () => {}, notify = () => {}, allowSplit = true) {
  if (depth < MAX_DEPTH) {
    const { size } = await stat(localPath);
    if (size > SIZE_CAP) { // size overflow → split before uploading (known locally, so no upload is wasted)
      if (depth === 0 && !allowSplit) throw new SplitConfirmNeeded({ reason: 'size', actualBytes: size });
      log('The file is large, so the video is processed in parts. Cutting and merging takes a little while.');
      return splitAndRecurse(localPath, spaceSeq, depth, startMs, Infinity, log, notify, allowSplit);
    }
  }
  try {
    if (depth === 0) log('Uploading video... (large videos take a while)');
    const { seq: mediaSeq, kind } = await upload({ source: 'local', localPath, originalName: basename(localPath) }, spaceSeq);
    return [{ path: localPath, mediaSeq, kind, startMs, endMs: spanMs == null ? null : startMs + spanMs }];
  } catch (e) {
    const code = e instanceof PersoApiError ? e.code : null;
    if (code !== 'F4008' && code !== 'F4004') throw e; // errors other than length/size are rethrown as-is
    if (depth >= MAX_DEPTH) throw new Error(`Split limit exceeded (depth ${depth}) — cannot upload`);
    if (depth === 0 && !allowSplit) throw await splitConfirmFor(code, e, localPath);
    log('The video exceeds the length/size limit, so it is processed in parts. Cutting and merging takes a little while.');
    const lengthCapMs = code === 'F4008' ? Number(e.data?.maxLengthMs) : Infinity;
    return splitAndRecurse(localPath, spaceSeq, depth, startMs, lengthCapMs, log, notify, allowSplit);
  }
}

// Build the confirmation error for a length (F4008) or size (F4004) rejection, best-effort filling the actual value.
async function splitConfirmFor(code, err, localPath) {
  if (code === 'F4008') {
    let actualMs = null;
    try { ({ durationMs: actualMs } = await probe(localPath)); } catch { /* ffmpeg absent → omit the actual length */ }
    return new SplitConfirmNeeded({ reason: 'length', limitMs: Number(err.data?.maxLengthMs) || null, actualMs });
  }
  let actualBytes = null;
  try { ({ size: actualBytes } = await stat(localPath)); } catch { /* omit the actual size */ }
  return new SplitConfirmNeeded({ reason: 'size', actualBytes });
}

/** Split localPath by the length/size limit and recursively upload each piece. baseStartMs is the absolute offset relative to the original. */
async function splitAndRecurse(localPath, spaceSeq, depth, baseStartMs, lengthCapMs, log = () => {}, notify = () => {}, allowSplit = true) {
  ensureFfmpeg(); // install only when cutting is confirmed
  if (depth === 0) notify('Splitting — the video exceeds the length/size limit, so it is processed in parts.'); // user-facing
  const { durationMs, sizeBytes } = await probe(localPath);
  if (!durationMs) throw new Error('Could not measure the video length.');

  const capMs = computeChunkMs(durationMs, sizeBytes, lengthCapMs); // the smaller of the length/size caps
  const parts = await splitByMaxLen(localPath, durationMs, capMs, SIZE_CAP, log);

  const out = [];
  for (let i = 0; i < parts.length; i++) {
    log(`Uploading piece ${i + 1}/${parts.length}...`);
    const p = parts[i];
    out.push(...(await uploadOrSplit(p.path, spaceSeq, depth + 1, baseStartMs + p.startMs, p.durationMs, log, notify, allowSplit)));
  }
  return out;
}

/** For resume: re-cut the [startMs,endMs) segment from the original at the same boundaries as the split, into a temp file. */
export async function recutChunk(localPath, startMs, endMs) {
  ensureFfmpeg();
  const dir = await tempDir();
  const ext = extname(localPath) || '.mp4';
  const out = join(dir, `recut_${startMs}_${endMs}${ext}`);
  try {
    await cutCopy(localPath, startMs, endMs, out); // lossless first (boundaries are the keyframes from the split)
    const { durationMs } = await probe(out).catch(() => ({}));
    if (durationMs && durationMs > 200) return out;
  } catch { /* fallback ↓ */ }
  await cut(localPath, startMs, endMs, out, SIZE_CAP); // re-encode fallback (frame-accurate)
  return out;
}

/** Determine the piece length (ms) as the smaller of the length cap and size cap. Independent of resolution·fps (cuts by time only). */
export function computeChunkMs(durationMs, sizeBytes, lengthCapMs = Infinity, sizeCap = SIZE_CAP) {
  let chunkMs = durationMs;
  if (Number.isFinite(lengthCapMs) && lengthCapMs > 0) chunkMs = Math.min(chunkMs, lengthCapMs);
  if (sizeBytes && sizeBytes > sizeCap) {
    const sizeMs = Math.floor((durationMs * sizeCap) / sizeBytes);
    if (sizeMs > 0) chunkMs = Math.min(chunkMs, sizeMs);
  }
  if (chunkMs >= durationMs) chunkMs = Math.floor(durationMs / 2); // if it can't be narrowed, halve it (avoid infinite loop)
  return Math.max(1, chunkMs);
}

/**
 * Lossless segment split (-c copy) to fit the capMs limit. Set SEG = capMs − GOP − margin so that
 * even when cut at keyframe boundaries, no piece exceeds the limit. Re-encode fallback only when lossless is impossible/exceeded.
 * @returns {Array<{index,path,startMs,durationMs}>}
 */
export async function splitByMaxLen(path, durationMs, capMs, maxBytes, log = () => {}) {
  const ext = extname(path) || '.mp4';
  const audioOnly = !(await probeHasVideo(path)); // an audio file has no video stream
  let paths = null;

  if (audioOnly) {
    // audio: keyframe/GOP-independent (can cut anywhere per frame) → SEG = cap − margin. -c copy lossless (container-matched codec fallback).
    const segMs = Math.max(MIN_SEG_MS, capMs - SEG_MARGIN_MS);
    log(`Lossless split in progress... (audio, piece ≈${Math.round(segMs / 1000)}s)`);
    try {
      paths = await segmentCopy(path, segMs, ext, { audioOnly: true });
      if (await anyOverCap(paths, capMs)) paths = null;
    } catch {
      paths = null;
    }
    if (!paths || !paths.length) {
      log('Audio re-encode split (fallback)');
      paths = await segmentReencode(path, segMs, ext, maxBytes, { audioOnly: true });
    }
  } else {
    // video: cut only at keyframe boundaries → SEG = cap − GOP − margin.
    const gopMs = await probeGop(path);
    const margin = Math.max(SEG_MARGIN_MS, gopMs); // margin against GOP under-measurement
    const segMs = capMs - gopMs - margin;
    if (segMs >= MIN_SEG_MS) {
      log(`Lossless split in progress... (GOP ≈${Math.round(gopMs)}ms, piece ≈${Math.round(segMs / 1000)}s)`);
      try {
        paths = await segmentCopy(path, segMs, ext);
        if (await anyOverCap(paths, capMs)) { log('Some pieces exceed the limit → retrying with re-encode split'); paths = null; }
      } catch {
        paths = null; // -c copy failed (container/codec) → fallback
      }
    }
    if (!paths || !paths.length) {
      const reSeg = Math.max(MIN_SEG_MS, capMs - margin); // re-encode forces a keyframe at the boundary → GOP-independent
      log(`Re-encode split (fallback) in progress... (piece ≈${Math.round(reSeg / 1000)}s)`);
      paths = await segmentReencode(path, reSeg, ext, maxBytes);
    }
  }

  // measure each piece's actual length → startMs (cumulative) relative to the original + durationMs (used as resume re-cut boundaries)
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

/** True if any piece exceeds capMs (detects the rare case where a lossless keyframe cut overshot the limit). */
async function anyOverCap(paths, capMs) {
  for (const p of paths) {
    const { durationMs } = await probe(p).catch(() => ({}));
    if (durationMs && durationMs > capMs) return true;
  }
  return false;
}
