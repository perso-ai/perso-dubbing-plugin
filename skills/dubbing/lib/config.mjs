// Plugin's own constants. Plan info (MaxLen, C/Q, credits) is not kept here; it is discovered from API responses.
import { homedir } from 'node:os';
import { join } from 'node:path';

// API
// PERSO_API_BASE / PERSO_MEDIA_BASE come from env, which a hostile repo config can plant for the agent —
// and every API call sends the key in a header to whatever host API_BASE names. Only https perso.ai hosts.
export function persoBaseUrl(name, raw, fallback) {
  const v = (raw ?? '').trim();
  if (!v) return fallback;
  let u = null;
  try { u = new URL(v); } catch { /* rejected below */ }
  const host = u?.hostname ?? '';
  if (u?.protocol !== 'https:' || (host !== 'perso.ai' && !host.endsWith('.perso.ai'))) {
    throw new Error(`${name} must be an https:// URL on a perso.ai host (e.g. ${fallback}) — got "${v}"`);
  }
  return v.replace(/\/+$/, '');
}
export const API_BASE = persoBaseUrl('PERSO_API_BASE', process.env.PERSO_API_BASE, 'https://api.perso.ai');
export const AUTH_HEADER = 'XP-API-KEY';

// Polling / backoff
export const POLL_INTERVAL_MS = 5_000; // status polling interval (>=5s recommended)
export const BACKOFF_BASE_MS = 5_000; // VT5034 exponential backoff starting value
export const BACKOFF_MAX_MS = 60_000; // backoff upper bound
export const QUEUE_WAIT_MS = Number(process.env.PERSO_QUEUE_WAIT_MS) || 5 * 60_000; // recheck interval when no free slot is available (external/preceding jobs occupy the queue) — default 5 minutes

// Infinite-loop guard (plan-independent · plugin safeguard)
export const MAX_IDLE_MS = 30 * 60_000; // T: limit on no-progress (no submission/completion/progress%↑) (30 min). Not absolute elapsed time.
export const MAX_RETRY = 2; // number of retries for other per-chunk failures

// Lip-sync jobs run far longer than dubbing → poll less often and allow a longer no-progress window.
export const LIPSYNC_POLL_INTERVAL_MS = 30_000;
export const LIPSYNC_IDLE_PER_DURATION = 15; // no-progress allowance = video duration × this (when the duration is known)
export const LIPSYNC_IDLE_MS = Number(process.env.PERSO_LIPSYNC_IDLE_MS) || 3 * 60 * 60_000; // fallback allowance when the duration is unknown

// Credit pre-check estimate (per second of video). The server's billing is authoritative — these only power an upfront warning.
export const CREDIT_RATE_DUB = 1;
export const CREDIT_RATE_LIPSYNC = 2;
export const CREDIT_RATE_SEPARATION = 0.5;
// 4K+ sources are billed ×3 for dubbing/lip-sync on pro/business/enterprise plans only.
export const UHD_CREDIT_MULT = 3;
export const UHD_BILLED_TIERS = ['pro', 'business', 'enterprise'];

// Media extensions — shared by the folder-input filter + choosing the video/audio endpoint at upload time.
// (Single-file input is accepted regardless of extension, and the upload step makes the final format determination.)
export const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi|m4v|wmv|flv|mpg|mpeg|ts|m2ts|3gp|ogv)$/i;
export const AUDIO_EXT = /\.(mp3|wav|m4a|aac|flac|ogg|oga|opus|wma|aif|aiff|alac)$/i;

// Credentials file
export const CRED_DIR = join(homedir(), '.perso');
export const CRED_FILE = join(CRED_DIR, 'credentials');
