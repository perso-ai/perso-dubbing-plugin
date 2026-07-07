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

export const messages = {
  // Out-of-usage guidance. The agent can generate a direct Stripe link via scripts/billing.mjs, which
  // routes by the current plan tier (free → subscribe · starter/creator → change plan · pro/business → credits).
  //   { planTier, remainingQuota, remainingNote, resumeHint, note }
  quotaExceeded: ({ planTier, remainingQuota, remainingNote, resumeHint, note } = {}) => {
    const status =
      `   Current plan: ${planTier ?? 'unknown'} · Credits left: ${remainingQuota ?? '?'}` +
      (remainingNote ? ` · Remaining: ${remainingNote}` : '');
    return [
      'Out of usage/credits — only part of the work completed. The finished items are delivered above.',
      status,
      ...(note ? [note] : []),
      '',
      'To continue you can generate a payment link (routes by plan: subscribe / change plan / buy credits):',
      '  → node scripts/billing.mjs options   (add --shortfall <estimated remaining credits> for a recommendation)',
      '  Then give the returned Stripe link to the user to complete payment in their browser — never pay on their behalf.',
      ...(resumeHint ? [`  Resume after topping up: ${resumeHint}`] : []),
    ].join('\n');
  },
};
