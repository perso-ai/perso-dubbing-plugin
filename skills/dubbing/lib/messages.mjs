// User-facing guidance message templates.
import { CLIENT_HOST, CLIENT_VERSION } from './client_info.mjs';

export const SUBSCRIPTION_URL = 'https://portal.perso.ai/en/workspace/space-settings?tab=Subscription';
export const PRICING_URL = 'https://perso.ai/en/workspace/vt?pricing';

// UTM identity — mirrors the API-call identity (User-Agent perso-dubbing/<version> (host=agents)):
// one unified 'agents' channel across all hosts; the skill version is carried in utm_content.
export const UTM_SOURCE = CLIENT_HOST;
export const UTM_PARAMS =
  `utm_source=${UTM_SOURCE}&utm_medium=agent-skill&utm_campaign=perso-dubbing&utm_content=v${CLIENT_VERSION}`;
export const withUtm = (url) => url + (url.includes('?') ? '&' : '?') + UTM_PARAMS;

// free/starter have no credit purchase, so only a plan upgrade is suggested.
const LOW_TIERS = new Set(['free', 'starter']);

export const messages = {
  // Out-of-usage guidance. Depending on planTier: free/starter get upgrade-only, others get both upgrade and credits.
  //   { planTier, remainingQuota, remainingNote, resumeHint, note }
  quotaExceeded: ({ planTier, remainingQuota, remainingNote, resumeHint, note } = {}) => {
    const isLow = LOW_TIERS.has(String(planTier ?? '').toLowerCase());
    const status =
      `   Current plan: ${planTier ?? 'unknown'} · Credits left: ${remainingQuota ?? '?'}` +
      (remainingNote ? ` · Remaining: ${remainingNote}` : '');
    const lines = [
      'Out of usage/credits — only part of the work completed. The finished items are delivered above.',
      status,
      ...(note ? [note] : []),
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
