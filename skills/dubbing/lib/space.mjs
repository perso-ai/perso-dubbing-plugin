// spaceSeq resolution. Commonly needed by validate, translate, and quota.
import { get } from './http_client.mjs';

let _cache = null;

export async function listSpaces() {
  if (_cache) return _cache;
  const res = await get('/portal/api/v1/spaces');
  _cache = res?.result ?? [];
  return _cache;
}

/** Spaces where dubbing can run, with display names for the user to choose from.
 *  Tier 1: capability field on the spaces payload, when the server provides one.
 *  Tier 2: probe the dubbing-scoped plan/status endpoint — spaces without dubbing access fail it.
 *  Fallback: every space (a transient probe failure must not hide real workspaces). */
export async function dubbingSpaces() {
  const spaces = await listSpaces();
  if (!spaces.length) throw new Error('No accessible space.');
  let vt = spaces.filter((s) => s.useVideoTranslatorEdit === true || s.serviceType === 'video_translator');
  if (!vt.length) {
    const probed = await Promise.all(spaces.map(async (s) => ((await getPlanStatus(s.spaceSeq)) ? s : null)));
    vt = probed.filter(Boolean);
  }
  return (vt.length ? vt : spaces).map((s) => ({
    seq: s.spaceSeq,
    name: s.spaceName ?? s.name ?? `space ${s.spaceSeq}`,
    tier: s.tier ?? null,
    planName: s.planName ?? null,
  }));
}

/** Telemetry props { plan_tier, plan_name } of a space, from the (cached) spaces list — plan/status has
 *  no name field. Fail-silent: null fields on any failure (track() drops nulls). */
export async function spacePlanProps(spaceSeq) {
  try {
    const s = (await listSpaces()).find((x) => x.spaceSeq === Number(spaceSeq));
    return { plan_tier: s?.tier ?? null, plan_name: s?.planName ?? null };
  } catch { return { plan_tier: null, plan_name: null }; }
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
