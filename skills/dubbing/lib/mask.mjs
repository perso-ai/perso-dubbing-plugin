// Key masking for output/logs. The original is never printed as-is.
export function maskKey(key) {
  if (!key) return '(none)';
  const s = String(key);
  if (s.length <= 8) return '••••';
  return `${s.slice(0, 8)}••••${s.slice(-4)}`;
}
