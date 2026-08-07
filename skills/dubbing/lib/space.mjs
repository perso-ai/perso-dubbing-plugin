// spaceSeq resolution. Commonly needed by validate, translate, and quota.
import { get } from './http_client.mjs';
import { getProjectDetail } from './api_adapter.mjs';
import { setTelemetryAccount, setTelemetryPlan, hasTelemetryUser } from './telemetry.mjs';

let _cache = null;

export async function listSpaces() {
  if (_cache) return _cache;
  const res = await get('/portal/api/v1/spaces');
  _cache = res?.result ?? [];
  await resolveTelemetryAccount(_cache);
  return _cache;
}

// Telemetry user_id source: the caller's userSeq from the member endpoint. Fetched once per install
// (persisted; skipped on later runs). Fail-silent — telemetry-only, never affects the run.
async function resolveTelemetryAccount(spaces) {
  try {
    if (process.env.PERSO_NO_TELEMETRY || hasTelemetryUser() || !spaces.length) return;
    const s = spaces.find((x) => x.isDefaultSpaceOwned === true) ?? spaces[0];
    const m = (await get(`/portal/api/v1/spaces/${s.spaceSeq}/member`))?.result;
    if (Number(m?.userSeq) > 0) setTelemetryAccount(m.userSeq);
  } catch { /* telemetry only */ }
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
    setTelemetryPlan(s?.tier ?? null, s?.planName ?? null); // also the plan_tier/plan_name user properties
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

/** Locate which of the user's accessible spaces a project lives in, by probing the project detail in
 *  each one — used to auto-locate a project instead of asking the user which workspace to use.
 *  403 (wrong space) and 404 (unknown project) mean "not in this space" and are swallowed; any other
 *  error (network, auth) is a real failure and must not be misread as "not found". */
export async function findSpaceForProject(projectSeq) {
  const spaces = await listSpaces();
  for (const s of spaces) {
    try {
      const detail = await getProjectDetail(projectSeq, s.spaceSeq);
      return { spaceSeq: s.spaceSeq, detail };
    } catch (e) {
      if (e?.name === 'PersoApiError' && (e.httpStatus === 403 || e.httpStatus === 404)) continue;
      throw e;
    }
  }
  return null;
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
