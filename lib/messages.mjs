// User-facing guidance message templates.
import { CLIENT_HOST } from './client_info.mjs';

export const SUBSCRIPTION_URL = 'https://portal.perso.ai/en/workspace/space-settings?tab=Subscription';
export const PRICING_URL = 'https://perso.ai/en/workspace/vt?pricing';

// utm_source for analytics — distinguishes the agent host (claude-code→claude, antigravity, codex, cursor / detection failure=unknown).
const UTM_BY_HOST = { 'claude-code': 'claude', antigravity: 'antigravity', codex: 'codex', cursor: 'cursor' };
export const UTM_SOURCE = UTM_BY_HOST[CLIENT_HOST] || CLIENT_HOST || 'unknown';
const withUtm = (url) => url + (url.includes('?') ? '&' : '?') + `utm_source=${UTM_SOURCE}`;

// free/starter have no credit purchase, so only a plan upgrade is suggested.
const LOW_TIERS = new Set(['free', 'starter']);

export const messages = {
  // Out-of-usage guidance. Depending on planTier: free/starter get upgrade-only, others get both upgrade and credits.
  //   { planTier, remainingQuota, remainingNote, resumeHint }
  quotaExceeded: ({ planTier, remainingQuota, remainingNote, resumeHint } = {}) => {
    const isLow = LOW_TIERS.has(String(planTier ?? '').toLowerCase());
    const status =
      `   Current plan: ${planTier ?? 'unknown'} · Credits left: ${remainingQuota ?? '?'}` +
      (remainingNote ? ` · Remaining: ${remainingNote}` : '');
    const lines = [
      'Out of usage/credits — only part of the work completed. The finished items are delivered above.',
      status,
      '',
    ];
    if (isLow) {
      lines.push('To continue, upgrade your plan:', `  → ${withUtm(PRICING_URL)}`);
    } else {
      lines.push('To continue, upgrade your plan or buy more credits (Get credits), then run again:', `  → ${withUtm(SUBSCRIPTION_URL)}`);
    }
    if (resumeHint) lines.push(`  Resume: ${resumeHint}`);
    return lines.join('\n');
  },
};
