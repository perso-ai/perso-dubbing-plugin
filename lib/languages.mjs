// 지원 언어 코드 조회.
import { get } from './http_client.mjs';

let _cache = null;

export async function getLanguages() {
  if (_cache) return _cache;
  const res = await get('/video-translator/api/v1/languages');
  // 응답 구조에 유연하게: result[] 또는 languages[] 또는 배열 그대로
  const list = res?.result ?? res?.languages ?? res;
  _cache = Array.isArray(list) ? list : [];
  return _cache;
}
