// 출력·로그용 키 마스킹. 원문은 절대 그대로 찍지 않는다.
export function maskKey(key) {
  if (!key) return '(none)';
  const s = String(key);
  if (s.length <= 8) return '••••';
  return `${s.slice(0, 8)}••••${s.slice(-4)}`;
}
