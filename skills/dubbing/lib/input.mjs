// Input handling: local path validation / URL processing.
//  - Local file       → use as-is after existence check
//  - Direct media URL → download to a local temp file, then merge into the flow
//  - Platform URL (YouTube·TikTok·Drive·Vimeo) → delegate to the API external flow (no download)
import { stat, readdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join, basename } from 'node:path';
import { makeTempDir } from './tmp.mjs';
import { VIDEO_EXT, AUDIO_EXT } from './config.mjs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const isUrl = (s) => /^https?:\/\//i.test(s);
const PLATFORM_HOSTS = /(?:^|\.)(youtube\.com|youtu\.be|tiktok\.com|drive\.google\.com|vimeo\.com)$/i;
// Folder input picks only video+audio (media) files (excludes non-media such as outputs/manifests). Single-file input ignores the extension.
const isMedia = (name) => VIDEO_EXT.test(name) || AUDIO_EXT.test(name);

/**
 * Expands the input(s) into a list of processing targets. If there are several, each is expanded and flattened.
 *  - URL/single file → 1 item
 *  - Folder → media files inside the folder (by extension). If recursive, includes subfolders too.
 *  - Multiple inputs (array) → expand each input by the rules above, then concatenate (URLs, paths, and folders can be mixed).
 */
export async function expandInputs(input, { recursive = false } = {}) {
  const list = (Array.isArray(input) ? input : [input]).map((v) => (v ?? '').trim()).filter(Boolean);
  if (!list.length) throw new Error('No input — provide a video file/folder path or a URL.');
  const out = [];
  for (const value of list) out.push(...(await expandOne(value, recursive)));
  return out;
}

async function expandOne(value, recursive) {
  if (isUrl(value)) return [await prepareInput(value)];

  let st;
  try {
    st = await stat(value);
  } catch {
    throw new Error(`Path not found: ${value}`);
  }
  if (st.isFile()) return [await prepareInput(value)];
  if (st.isDirectory()) {
    const files = await listVideos(value, recursive);
    if (!files.length) throw new Error(`No media files in folder: ${value}`);
    return files.map((f) => ({ source: 'local', localPath: f, originalName: basename(f), folderInput: true }));
  }
  throw new Error(`Unsupported input: ${value}`);
}

async function listVideos(dir, recursive) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (recursive) out.push(...(await listVideos(full, true)));
    } else if (isMedia(e.name)) {
      out.push(full);
    }
  }
  return out.sort();
}

/** Normalizes the input string into the form the next step expects. Throws if there is no input (→ re-prompt). */
export async function prepareInput(input) {
  const value = (input ?? '').trim();
  if (!value) throw new Error('No input — provide a local video path or a URL.');
  if (!isUrl(value)) return fromLocal(value);

  let host = '';
  try {
    host = new URL(value).hostname;
  } catch {
    throw new Error(`Invalid URL: ${value}`);
  }
  return PLATFORM_HOSTS.test(host) ? { source: 'external', sourceUrl: value } : fromUrl(value);
}

async function fromLocal(path) {
  let st;
  try {
    st = await stat(path);
  } catch {
    throw new Error(`File not found: ${path}`);
  }
  if (!st.isFile()) throw new Error(`Not a file: ${path}`);
  return { source: 'local', localPath: path, originalName: basename(path), bytes: st.size };
}

async function fromUrl(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to access URL (${res.status}): ${url}`);
  if (!res.body) throw new Error(`URL response has no body: ${url}`);

  const name = urlFileName(url, res.headers.get('content-type'));
  const dir = await makeTempDir('dubbing-');
  const localPath = join(dir, name);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(localPath));

  const st = await stat(localPath);
  if (st.size === 0) throw new Error(`Downloaded result is empty: ${url}`);
  return { source: 'url', sourceUrl: url, localPath, originalName: name, bytes: st.size };
}

function urlFileName(url, contentType) {
  try {
    const base = basename(new URL(url).pathname);
    if (base && /\.[a-z0-9]{2,4}$/i.test(base)) return base;
  } catch {
    /* fall through */
  }
  const ext = /mp4/i.test(contentType ?? '')
    ? '.mp4'
    : /webm/i.test(contentType ?? '')
      ? '.webm'
      : /quicktime/i.test(contentType ?? '')
        ? '.mov'
        : '.mp4';
  return `input${ext}`;
}
