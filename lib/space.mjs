// spaceSeq 해석. validate·translate·quota에 공통으로 필요.
import { get } from './http_client.mjs';

let _cache = null;

export async function listSpaces() {
  if (_cache) return _cache;
  const res = await get('/portal/api/v1/spaces');
  _cache = res?.result ?? [];
  return _cache;
}

/** 사용할 spaceSeq 결정. env PERSO_SPACE_SEQ 우선 → video_translator만 →
 *  free가 아닌 것 우선 + 가장 작은 spaceSeq(전부 free면 가장 작은 spaceSeq). */
export async function resolveSpace() {
  const override = process.env.PERSO_SPACE_SEQ;
  if (override) return Number(override);

  const spaces = await listSpaces();
  if (!spaces.length) throw new Error('접근 가능한 space가 없습니다.');

  const vt = spaces.filter((s) => s.serviceType === 'video_translator');
  const pool = vt.length ? vt : spaces;
  const bySeq = [...pool].sort((a, b) => a.spaceSeq - b.spaceSeq); // 가장 작은 spaceSeq 우선
  const isFree = (s) => String(s.tier ?? '').toLowerCase() === 'free';
  const nonFree = bySeq.filter((s) => !isFree(s));
  return (nonFree.length ? nonFree : bySeq)[0].spaceSeq; // non-free 우선, 전부 free면 가장 작은 seq
}

/** 플랜/쿼터 조회 → { planTier, remainingQuota, resetDateTime }. 실패하면 null. */
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
