// Telemetry-only validation. Never change the API error used by retry/billing logic.
const AGENT_HOSTS = new Set(['claude-code', 'codex', 'cursor', 'antigravity', 'gemini', 'agents-dir', 'unknown']);
// Resume files are local user-editable data, not a source of arbitrary analytics text.
// Keep the known categories emitted by the workers; leave resume processing itself unchanged.
const RESUME_REASONS = new Set(['manual', 'quota', 'rejected', 'download']);
const ERROR_TOKENS = new Set([
  'unsupported_format', 'FULL_VT_TRANSLATE_QUEUE', 'VT40314', 'VT40918',
  'ENOENT', 'EACCES', 'EPERM', 'ENOSPC', 'ENOTFOUND', 'ETIMEDOUT',
  'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ABORT_ERR',
]);

export function telemetryAgentHost(value) {
  if (typeof value !== 'string') return null;
  const host = value.trim().toLowerCase();
  return AGENT_HOSTS.has(host) ? host : null;
}

export function telemetryErrorCode(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const code = String(value).trim();
  // Perso's documented short code shape, HTTP statuses and known local error tokens.
  // Free-form server messages, URLs, credentials and structured payloads are omitted.
  return /^(?:[A-Z]{1,3}\d{4}|[1-5]\d{2})$/.test(code) || ERROR_TOKENS.has(code) ? code : null;
}

export function telemetryResumeReason(value) {
  return typeof value === 'string' && RESUME_REASONS.has(value) ? value : null;
}
