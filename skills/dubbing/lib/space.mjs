// spaceSeq resolution. Commonly needed by validate, translate, and quota.
import { get } from './http_client.mjs';

let _cache = null;

export async function listSpaces() {
  if (_cache) return _cache;
  const res = await get('/portal/api/v1/spaces');
  _cache = res?.result ?? [];
  return _cache;
}

/** Spaces where dubbing can run (video_translator; falls back to all), with display names for the user to choose from. */
export async function dubbingSpaces() {
  const spaces = await listSpaces();
  if (!spaces.length) throw new Error('No accessible space.');
  const vt = spaces.filter((s) => s.serviceType === 'video_translator');
  return (vt.length ? vt : spaces).map((s) => ({
    seq: s.spaceSeq,
    name: s.spaceName ?? s.name ?? `space ${s.spaceSeq}`,
    tier: s.tier ?? null,
  }));
}

/** Non-interactive spaceSeq resolution: env pin → the only space. With several spaces the user must choose
 *  (dubbing.mjs asks by name); here we can only fail with guidance. */
export async function resolveSpace() {
  const pinned = Number(process.env.PERSO_SPACE_SEQ);
  if (pinned) return pinned;
  const spaces = await dubbingSpaces();
  if (spaces.length === 1) return spaces[0].seq;
  throw new Error(
    'Several spaces are available — set PERSO_SPACE_SEQ or pass --space <seq>:\n' +
    spaces.map((s) => `  ${s.seq}: ${s.name}`).join('\n'),
  );
}

/** Query plan/quota → { planTier, remainingQuota, resetDateTime }. Returns null on failure. */
export async function getPlanStatus(spaceSeq) {
  try {
    const res = await get(`/video-translator/api/v1/projects/spaces/${spaceSeq}/plan/status`);
    const r = res?.result ?? res ?? {};
    return {
      planTier: r.planTier ?? null,
      remainingQuota: r.remainingQuota?.remainingQuota ?? r.remainingQuota ?? null,
      resetDateTime: r.resetDateTime ?? null,
    };
  } catch {
    return null;
  }
}
