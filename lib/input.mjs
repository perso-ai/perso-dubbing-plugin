// 입력 처리: 로컬 경로 검증 / URL 처리.
//  - 로컬 파일      → 존재 확인 후 그대로
//  - 직접 미디어 URL → 로컬 임시파일로 다운로드 후 합류
//  - 플랫폼 URL(YouTube·TikTok·Drive·Vimeo) → API external 흐름으로 위임(다운로드 안 함)
import { stat, readdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join, basename } from 'node:path';
import { makeTempDir } from './tmp.mjs';
import { VIDEO_EXT, AUDIO_EXT } from './config.mjs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const isUrl = (s) => /^https?:\/\//i.test(s);
const PLATFORM_HOSTS = /(?:^|\.)(youtube\.com|youtu\.be|tiktok\.com|drive\.google\.com|vimeo\.com)$/i;
// 폴더 입력은 영상+오디오(미디어)만 추림(출력물·매니페스트 등 비미디어 제외). 단일 파일 입력은 확장자 무관.
const isMedia = (name) => VIDEO_EXT.test(name) || AUDIO_EXT.test(name);

/**
 * 입력(들)을 처리 대상 목록으로 확장한다. 여러 개면 각각 펼쳐 평탄화한다.
 *  - URL/단일 파일 → 1개
 *  - 폴더 → 폴더 안 미디어 파일들(확장자 기준). recursive면 하위 폴더까지.
 *  - 여러 입력(배열) → 각 입력을 위 규칙으로 펼친 뒤 이어 붙임(URL·경로·폴더 혼합 가능).
 */
export async function expandInputs(input, { recursive = false } = {}) {
  const list = (Array.isArray(input) ? input : [input]).map((v) => (v ?? '').trim()).filter(Boolean);
  if (!list.length) throw new Error('입력이 없습니다 — 영상 파일/폴더 경로 또는 URL을 제공하세요.');
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
    throw new Error(`경로를 찾을 수 없습니다: ${value}`);
  }
  if (st.isFile()) return [await prepareInput(value)];
  if (st.isDirectory()) {
    const files = await listVideos(value, recursive);
    if (!files.length) throw new Error(`폴더에 영상 파일이 없습니다: ${value}`);
    return files.map((f) => ({ source: 'local', localPath: f, originalName: basename(f), folderInput: true }));
  }
  throw new Error(`지원하지 않는 입력: ${value}`);
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

/** 입력 문자열을 다음 단계가 쓸 형태로 정규화한다. 입력이 없으면 예외(→ 재질문). */
export async function prepareInput(input) {
  const value = (input ?? '').trim();
  if (!value) throw new Error('입력이 없습니다 — 영상 로컬 경로 또는 URL을 제공하세요.');
  if (!isUrl(value)) return fromLocal(value);

  let host = '';
  try {
    host = new URL(value).hostname;
  } catch {
    throw new Error(`잘못된 URL: ${value}`);
  }
  return PLATFORM_HOSTS.test(host) ? { source: 'external', sourceUrl: value } : fromUrl(value);
}

async function fromLocal(path) {
  let st;
  try {
    st = await stat(path);
  } catch {
    throw new Error(`파일을 찾을 수 없습니다: ${path}`);
  }
  if (!st.isFile()) throw new Error(`파일이 아닙니다: ${path}`);
  return { source: 'local', localPath: path, originalName: basename(path), bytes: st.size };
}

async function fromUrl(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`URL 접근 실패 (${res.status}): ${url}`);
  if (!res.body) throw new Error(`URL 응답 본문 없음: ${url}`);

  const name = urlFileName(url, res.headers.get('content-type'));
  const dir = await makeTempDir('dubbing-');
  const localPath = join(dir, name);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(localPath));

  const st = await stat(localPath);
  if (st.size === 0) throw new Error(`다운로드 결과가 비어 있음: ${url}`);
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
