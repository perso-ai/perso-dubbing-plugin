// User-facing guidance message templates.
import { CLIENT_HOST, CLIENT_VERSION } from './client_info.mjs';

export const SUBSCRIPTION_URL = 'https://perso.ai/en/workspace/space-settings?tab=Subscription';
export const PRICING_URL = 'https://perso.ai/en/workspace/vt?pricing';

// The Video-Translator workspace (where every run's project lives) and a direct link to one project.
// Project path by kind: dubbing/lip-sync → detail, STT → stt, audio separation → audio-separation.
export const WORKSPACE_URL = 'https://perso.ai/en/workspace/vt';
const PROJECT_PATH = { dub: 'detail', lipsync: 'detail', stt: 'stt', separation: 'audio-separation' };
export const projectUrl = (seq, kind = 'dub') => `${WORKSPACE_URL}/${PROJECT_PATH[kind] ?? 'detail'}/${seq}`;

// UTM identity — mirrors the API-call identity (User-Agent perso-dubbing/<version> (host=agents)):
// one unified 'agents' channel across all hosts; the skill version is carried in utm_content.
export const UTM_SOURCE = CLIENT_HOST;
export const UTM_PARAMS =
  `utm_source=${UTM_SOURCE}&utm_medium=agent-skill&utm_campaign=perso-dubbing&utm_content=v${CLIENT_VERSION}`;
export const withUtm = (url) => url + (url.includes('?') ? '&' : '?') + UTM_PARAMS;

export const messages = {
  // Out-of-usage guidance. The agent can generate a direct Stripe link via scripts/billing.mjs, which
  // routes by the current plan tier (free → subscribe · starter/creator → change plan · pro/business → credits).
  //   { planTier, remainingQuota, remainingNote, note, billingScript }
  //   billingScript: path of billing.mjs relative to the calling worker's folder (the srt skill passes ../dubbing/…).
  //   The caller prints a [resume-state] marker after this so the agent can continue once credits are topped up.
  quotaExceeded: ({ planTier, remainingQuota, remainingNote, note, billingScript = 'scripts/billing.mjs' } = {}) => {
    const status =
      `   Current plan: ${planTier ?? 'unknown'} · Credits left: ${remainingQuota ?? '?'}` +
      (remainingNote ? ` · Remaining: ${remainingNote}` : '');
    return [
      'Out of usage/credits — only part of the work completed. The finished items are delivered above.',
      status,
      ...(note ? [note] : []),
      '',
      'To finish the rest the user needs to top up, then continue (already-paid work is not re-charged):',
      `  → node ${billingScript} options   (add --shortfall <estimated remaining credits> for a recommendation)`,
      '  Give the returned Stripe link to the user to pay in their browser — never pay on their behalf.',
    ].join('\n');
  },

  // ── Free plan ────────────────────────────────────────────────
  // A free space generates projects normally but the server refuses every result download (VT5003), so a
  // finished run is delivered as a Perso project link. `what` names the deliverable, `note` adds a caveat
  // (e.g. the preview length).
  //   { label, url, what, note }
  freeDelivery: ({ label, url, what = 'result', note = null }) =>
    `Free plan — ${label}: ${what} ready on Perso${note ? ` (${note})` : ''} → ${url} (downloads need a paid plan)`,

  // [free-limit] preview gate: a free space only dubs the first previewMs. Printed before ANY billed
  // submission; the agent relays it and re-runs with --allow-preview on the user's OK. `trimmable` is
  // false for a platform link (imported server-side — the worker cannot cut the first seconds off it).
  //   { tag, previewMs, action, trimmable }
  freePreviewGate: ({ tag, previewMs, action = 'dubbed', trimmable = true } = {}) => {
    const sec = Math.round(previewMs / 1000);
    const label = tag ? `${tag}: ` : '';
    return [
      `[free-limit] ${label}this is longer than ${sec} seconds, and the Free plan dubs only the first ${sec} seconds.`,
      trimmable
        ? `[free-limit] Only those first ${sec} seconds would be ${action}, the rest is left out. Proceed? To confirm, re-run the same command with --allow-preview — or upgrade the plan for the full length.`
        : `[free-limit] A link imported by Perso cannot be trimmed here, so this one cannot be previewed. Use a local file (or a shorter clip) for the first ${sec} seconds, or upgrade the plan for the full length.`,
    ].join('\n');
  },

  // [free-limit] stop: media over the plan's length/size limit. The free plan gets no split offer
  // ([split-confirm]) — there is no proceed flag, only a shorter file or an upgrade.
  //   { tag, reason:'length'|'size', limitMs }
  freeOverLimit: ({ tag, reason = 'length', limitMs = null } = {}) => {
    const label = tag ? `${tag}: ` : '';
    const lim = reason === 'length'
      ? (Number(limitMs) > 0 ? `the Free plan's length limit (${Math.max(1, Math.round(Number(limitMs) / 60000))} min)` : "the Free plan's length limit")
      : 'the 2 GB upload limit';
    return [
      `[free-limit] ${label}this media is over ${lim}, and the Free plan cannot split it into parts.`,
      '[free-limit] Use a shorter (or smaller) file, or upgrade the plan, then try again.',
    ].join('\n');
  },
};
