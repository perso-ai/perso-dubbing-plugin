// 사용자 안내 메시지 템플릿.
import { CLIENT_HOST } from './client_info.mjs';

export const SUBSCRIPTION_URL = 'https://portal.perso.ai/en/workspace/space-settings?tab=Subscription';
export const PRICING_URL = 'https://perso.ai/en/workspace/vt?pricing';

// 통계용 utm_source — 에이전트 호스트 구분(claude-code→claude, antigravity, codex, cursor / 감지 실패=unknown).
const UTM_BY_HOST = { 'claude-code': 'claude', antigravity: 'antigravity', codex: 'codex', cursor: 'cursor' };
export const UTM_SOURCE = UTM_BY_HOST[CLIENT_HOST] || CLIENT_HOST || 'unknown';
const withUtm = (url) => url + (url.includes('?') ? '&' : '?') + `utm_source=${UTM_SOURCE}`;

// free/starter는 크레딧 구매가 없어 플랜 업그레이드만 안내한다.
const LOW_TIERS = new Set(['free', 'starter']);

export const messages = {
  // 사용량 부족 안내. planTier에 따라 free/starter는 업그레이드만, 그 외는 업그레이드/크레딧 둘 다 안내.
  //   { planTier, remainingQuota, remainingNote, resumeHint }
  quotaExceeded: ({ planTier, remainingQuota, remainingNote, resumeHint } = {}) => {
    const isLow = LOW_TIERS.has(String(planTier ?? '').toLowerCase());
    const status =
      `   현재 플랜: ${planTier ?? '알 수 없음'} · 남은 크레딧: ${remainingQuota ?? '?'}` +
      (remainingNote ? ` · 남은 작업: ${remainingNote}` : '');
    const lines = [
      '사용량/크레딧이 부족해 일부만 완료했습니다. 완료분은 위에 전달했습니다.',
      status,
      '',
    ];
    if (isLow) {
      lines.push('계속하려면 플랜을 업그레이드하세요:', `  → ${withUtm(PRICING_URL)}`);
    } else {
      lines.push('계속하려면 플랜 업그레이드(Upgrade plan) 또는 추가 크레딧 구매(Get credits) 후 진행하세요:', `  → ${withUtm(SUBSCRIPTION_URL)}`);
    }
    if (resumeHint) lines.push(`  이어하기: ${resumeHint}`);
    return lines.join('\n');
  },
};
