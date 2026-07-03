// Plugin's own constants. Plan info (MaxLen, C/Q, credits) is not kept here; it is discovered from API responses.
import { homedir } from 'node:os';
import { join } from 'node:path';

// API
export const API_BASE = (process.env.PERSO_API_BASE || 'https://api.perso.ai').replace(/\/+$/, '');
export const AUTH_HEADER = 'XP-API-KEY';

// Polling / backoff
export const POLL_INTERVAL_MS = 5_000; // status polling interval (>=5s recommended)
export const BACKOFF_BASE_MS = 5_000; // VT5034 exponential backoff starting value
export const BACKOFF_MAX_MS = 60_000; // backoff upper bound
export const QUEUE_WAIT_MS = Number(process.env.PERSO_QUEUE_WAIT_MS) || 5 * 60_000; // recheck interval when no free slot is available (external/preceding jobs occupy the queue) — default 5 minutes

// Infinite-loop guard (plan-independent · plugin safeguard)
export const MAX_IDLE_MS = 30 * 60_000; // T: limit on no-progress (no submission/completion/progress%↑) (30 min). Not absolute elapsed time.
export const MAX_RETRY = 2; // number of retries for other per-chunk failures

// Media extensions — shared by the folder-input filter + choosing the video/audio endpoint at upload time.
// (Single-file input is accepted regardless of extension, and the upload step makes the final format determination.)
export const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi|m4v|wmv|flv|mpg|mpeg|ts|m2ts|3gp|ogv)$/i;
export const AUDIO_EXT = /\.(mp3|wav|m4a|aac|flac|ogg|oga|opus|wma|aif|aiff|alac)$/i;

// Credentials file
export const CRED_DIR = join(homedir(), '.perso');
export const CRED_FILE = join(CRED_DIR, 'credentials');
