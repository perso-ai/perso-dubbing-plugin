// spaceSeq resolution. Commonly needed by validate, translate, and quota.
import { get } from './http_client.mjs';

let _cache = null;

export async function listSpaces() {
  if (_cache) return _cache;
  const res = await get('/portal/api/v1/spaces');
  _cache = res?.result ?? [];
  return _cache;
}

/** Determine which spaceSeq to use. env PERSO_SPACE_SEQ takes priority → video_translator only →
 *  prefer non-free + smallest spaceSeq (if all are free, the smallest spaceSeq). */
export async function resolveSpace() {
  const override = process.env.PERSO_SPACE_SEQ;
  if (override) return Number(override);

  const spaces = await listSpaces();
  if (!spaces.length) throw new Error('No accessible space.');

  const vt = spaces.filter((s) => s.serviceType === 'video_translator');
  const pool = vt.length ? vt : spaces;
  const bySeq = [...pool].sort((a, b) => a.spaceSeq - b.spaceSeq); // prefer smallest spaceSeq
  const isFree = (s) => String(s.tier ?? '').toLowerCase() === 'free';
  const nonFree = bySeq.filter((s) => !isFree(s));
  return (nonFree.length ? nonFree : bySeq)[0].spaceSeq; // prefer non-free; if all free, the smallest seq
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
