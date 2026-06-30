// Fetch supported language codes.
import { get } from './http_client.mjs';

let _cache = null;

export async function getLanguages() {
  if (_cache) return _cache;
  const res = await get('/video-translator/api/v1/languages');
  // Be flexible about the response shape: result[], languages[], or the array itself
  const list = res?.result ?? res?.languages ?? res;
  _cache = Array.isArray(list) ? list : [];
  return _cache;
}
