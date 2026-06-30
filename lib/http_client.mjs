// HTTP client. Attaches the XP-API-KEY header, waits on 429 rate limits, exposes error code/data.
// The raw key is used only in the header and is never printed anywhere.
import { API_BASE, AUTH_HEADER, BACKOFF_MAX_MS } from './config.mjs';
import { resolveKey } from '../scripts/resolve_key.mjs';
import { CLIENT_USER_AGENT, CLIENT_HOST } from './client_info.mjs';

/** An error that carries the code/data from the response as-is (e.g. F4008 → data.maxLengthMs, VT4021, A0010). */
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
    super('XP_API_KEY not set — see scripts/resolve_key.mjs --check');
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
 * Perso API request. Returns parsed JSON on success; throws PersoApiError (with code/data) on failure.
 * For 429/G0005, waits until X-RateLimit-Reset and then retries automatically.
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
      // A full queue (VT4292/FULL_VT_TRANSLATE_QUEUE) is a backpressure signal → don't blindly retry; surface it immediately.
      // (The scheduler polls and waits for a free slot, then resubmits.)
      if (code === 'VT4292' || code === 'VT5034' || data?.detailCode === 'FULL_VT_TRANSLATE_QUEUE') {
        throw toError(res.status, data);
      }
      // Other ordinary rate limits → retry with exponential backoff
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
  throw new PersoApiError(429, 'G0005', 'rate limit retries exceeded');
}

export const get = (path, opts) => request('GET', path, opts);
export const post = (path, opts) => request('POST', path, opts);
export const put = (path, opts) => request('PUT', path, opts);
