// HTTP 클라이언트. XP-API-KEY 헤더 부착, 429 rate limit 대기, 에러 코드/데이터 노출.
// 키 원문은 헤더에만 쓰고 어디에도 출력하지 않는다.
import { API_BASE, AUTH_HEADER, BACKOFF_MAX_MS } from './config.mjs';
import { resolveKey } from '../scripts/resolve_key.mjs';
import { CLIENT_USER_AGENT, CLIENT_HOST } from './client_info.mjs';

/** 응답에 실린 code/data를 그대로 들고 다니는 에러 (예: F4008 → data.maxLengthMs, VT4021, A0010). */
export class PersoApiError extends Error {
  constructor(httpStatus, code, message, data) {
    super(message || code || `HTTP ${httpStatus}`);
    this.name = 'PersoApiError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.data = data ?? null;
  }
}

export class MissingKeyError extends Error {
  constructor() {
    super('XP_API_KEY 미설정 — scripts/resolve_key.mjs --check 참고');
    this.name = 'MissingKeyError';
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function toError(httpStatus, body) {
  const code = body?.code || body?.detailCode || body?.status;
  return new PersoApiError(httpStatus, code, body?.message, body?.data);
}

/**
 * Perso API 요청. 성공 시 파싱된 JSON, 실패 시 PersoApiError(code·data 포함)를 던진다.
 * 429/G0005는 X-RateLimit-Reset까지 대기 후 자동 재시도한다.
 */
export async function request(method, path, { body, headers = {}, query } = {}) {
  const key = resolveKey();
  if (!key) throw new MissingKeyError();

  let url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  if (query && Object.keys(query).length) {
    const qs = new URLSearchParams(query).toString();
    url += (url.includes('?') ? '&' : '?') + qs;
  }

  const init = {
    method,
    headers: {
      [AUTH_HEADER]: key,
      'User-Agent': CLIENT_USER_AGENT,
      'X-Perso-Client-Host': CLIENT_HOST,
      ...headers,
    },
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, init);

    if (res.status === 429) {
      const data = await parseBody(res);
      const code = data?.code || data?.detailCode;
      // 큐 풀(VT4292/FULL_VT_TRANSLATE_QUEUE)은 backpressure 신호 → 블라인드 재시도하지 말고 즉시 전달.
      // (스케줄러가 폴링으로 슬롯 빌 때까지 대기 후 재제출한다.)
      if (code === 'VT4292' || code === 'VT5034' || data?.detailCode === 'FULL_VT_TRANSLATE_QUEUE') {
        throw toError(res.status, data);
      }
      // 그 외 일반 레이트리밋 → 지수 백오프 재시도
      const reset = Number(res.headers.get('X-RateLimit-Reset'));
      const waitMs = Number.isFinite(reset) && reset > 0
        ? Math.max(0, reset * 1000 - Date.now())
        : Math.min(BACKOFF_MAX_MS, 2 ** attempt * 1000);
      await sleep(Math.min(Math.max(waitMs, 1000), BACKOFF_MAX_MS));
      continue;
    }

    const data = await parseBody(res);
    if (!res.ok) throw toError(res.status, data);
    return data;
  }
  throw new PersoApiError(429, 'G0005', 'rate limit 재시도 초과');
}

export const get = (path, opts) => request('GET', path, opts);
export const post = (path, opts) => request('POST', path, opts);
export const put = (path, opts) => request('PUT', path, opts);
