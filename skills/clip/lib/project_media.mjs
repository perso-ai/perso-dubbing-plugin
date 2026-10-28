// Project media is downloaded as data, never as executable code.
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { get } from '../../dubbing/lib/http_client.mjs';
import { persoBaseUrl } from '../../dubbing/lib/config.mjs';
const MEDIA_BASE = persoBaseUrl('PERSO_MEDIA_BASE', process.env.PERSO_MEDIA_BASE, 'https://portal-media.perso.ai');
export const mediaUrl = (rel) => MEDIA_BASE + encodeURI(rel.startsWith('/') ? rel : `/${rel}`);

export async function streamToFile(url, out) {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`Download failed (${r.status})`);
  const type = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type.startsWith('text/') || /(?:json|javascript|xml|html)/.test(type)) {
    await r.body.cancel();
    throw new Error('The project download returned a document instead of media.');
  }
  await pipeline(Readable.fromWeb(r.body), createWriteStream(out));
  return out;
}
export async function fetchTimestamps(seq, spaceSeq) {
  const res = await get(`/video-translator/api/v1/projects/${seq}/spaces/${spaceSeq}/download`, { query: { target: 'scriptTimestamps' } });
  const rel = res?.result?.audioFile?.scriptTimestampsDownloadLink;
  if (!rel) throw new Error('This project has no word timestamps yet — clipping needs a completed STT project.');
  const r = await fetch(mediaUrl(rel));
  if (!r.ok) throw new Error(`Could not fetch script timestamps (${r.status}).`);
  return r.json();
}
export async function fetchSummary(seq, spaceSeq) {
  try {
    const res = await get(`/video-translator/api/v1/projects/${seq}/spaces/${spaceSeq}/summary`);
    return { sections: JSON.parse(res?.result?.sections || '[]') };
  } catch { return { sections: [] }; }
}

