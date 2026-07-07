// Plan-upgrade / credit-purchase helpers. All calls go to the Perso payment service with the same
// XP-API-KEY the rest of the skill uses; the agent only ever receives a Stripe link to hand to the user —
// it must never open or complete payment itself.
import { get, post, PersoApiError } from './http_client.mjs';

export const CURRENCIES = ['usd', 'krw'];
export const DEFAULT_CURRENCY = 'usd'; // international default for new subscriptions; KRW on request
export const ONE_TIME_CURRENCY = 'usd'; // credit packs are always charged in USD
// Credits granted per pack — used only to turn a credit shortfall into a pack quantity.
// Server billing is authoritative.
export const CREDIT_PER_UNIT = 60;
export const RETURN_URL = 'https://perso.ai/en/workspace/vt';
const SUCCESS_PARAMS = 's_seq={spaceSeq}';

// Low → high. Used to find which tiers are an upgrade from the current one.
const TIER_ORDER = ['free', 'starter', 'creator', 'pro', 'business', 'enterprise'];
const tierRank = (t) => TIER_ORDER.indexOf(String(t ?? '').toLowerCase());

/** Which purchase flow fits the current plan tier. */
export function actionForTier(tier) {
  const t = String(tier ?? '').toLowerCase();
  if (t === 'starter' || t === 'creator') return 'billing';   // has a subscription → change plan
  if (t === 'pro' || t === 'business') return 'one-time';      // top self-serve → buy credits
  if (t === 'enterprise') return 'contact';                    // custom → contact admin, no self-serve
  return 'checkout';                                           // free/unknown → new subscription
}

const extractLink = (res) => res?.link ?? res?.result?.link ?? null;

function normalizePlan(tier, p) {
  return {
    tier: p.tier ?? tier,
    planSeq: p.planSeq,
    planName: p.planName,
    isCurrentPlan: !!p.isCurrentPlan,
    isAccessible: p.isAccessible !== false,
    isSwitchable: p.isSwitchable !== false,
    priceOptions: (p.priceOptions ?? []).map((o) => ({
      priceId: o.priceId,
      price: o.price,
      priceUnit: o.priceUnit,
      billingPeriod: o.billingPeriod,
      discountRate: o.discountRate ?? 0,
      isCurrentPlan: !!o.isCurrentPlan,
    })),
  };
}

/** Recurring subscription plans for one billing period + currency, one entry per tier. */
export async function getRecurringPlans(spaceSeq, { billingPeriod, currency }) {
  const res = await get('/payment/api/v1/plan/groups', {
    query: { spaceSeq, productType: 'recurring', billingPeriod, currency },
  });
  const groups = res?.result ?? {};
  const plans = [];
  for (const [tier, arr] of Object.entries(groups)) {
    const p = Array.isArray(arr) ? arr[0] : null;
    if (p) plans.push(normalizePlan(tier, p));
  }
  return plans;
}

/** The one-time credit pack (productType=single, USD). Quantity-priced: unitPrice per pack. */
export async function getCreditProduct(spaceSeq) {
  const res = await get('/payment/api/v1/plan', {
    query: { spaceSeq, productType: 'single', currency: ONE_TIME_CURRENCY },
  });
  const p = (res?.result ?? [])[0] ?? null;
  if (!p) return null;
  const opt = (p.priceOptions ?? [])[0] ?? null;
  return {
    planSeq: p.planSeq,
    planName: p.planName,
    minQuantity: p.purchaseSeatCountMin ?? 1,
    maxQuantity: p.purchaseSeatCountMax ?? -1, // -1 = unlimited
    priceId: opt?.priceId ?? null,
    unitPrice: opt?.price ?? null,
    priceUnit: opt?.priceUnit ?? ONE_TIME_CURRENCY,
    creditPerUnit: CREDIT_PER_UNIT,
  };
}

/** Tiers strictly above `currentTier` that can be switched to (for the plan list to offer). */
export function upgradeCandidates(plans, currentTier) {
  const rank = tierRank(currentTier);
  return plans.filter((p) =>
    tierRank(p.tier) > rank && p.tier !== 'enterprise' && p.isAccessible && p.isSwitchable && !p.isCurrentPlan);
}

/** Find a tier's price option for the exact billing period (null if that tier has no option for it). */
export function findPriceOption(plans, tier, billingPeriod) {
  const plan = plans.find((p) => String(p.tier).toLowerCase() === String(tier).toLowerCase());
  if (!plan) return null;
  const opt = plan.priceOptions.find((o) => o.billingPeriod === billingPeriod);
  return opt ? { planSeq: plan.planSeq, plan, opt } : null;
}

/** The billing period of the current subscription (billing requires the target to match it). */
export function currentBillingPeriod(plans) {
  for (const p of plans) {
    const cur = p.priceOptions.find((o) => o.isCurrentPlan);
    if (cur) return cur.billingPeriod;
  }
  return null;
}

/** Credit packs needed to cover a shortfall (each pack = CREDIT_PER_UNIT credits). */
export function recommendCredits(shortfall) {
  const quantity = Math.max(1, Math.ceil(Number(shortfall) / CREDIT_PER_UNIT));
  return { quantity, credits: quantity * CREDIT_PER_UNIT };
}

// --- link generation (each returns a Stripe URL string) ---

/** Free → new subscription. */
export async function createCheckoutLink({ spaceSeq, priceId, planSeq }) {
  const res = await post('/payment/api/v1/charge/checkout', {
    body: {
      priceId, planSeq, spaceSeq,
      successUrl: RETURN_URL, cancelUrl: RETURN_URL,
      successParams: SUCCESS_PARAMS, isAddSpaceRequest: false, force: false,
    },
  });
  return extractLink(res);
}

/** Existing subscriber → change plan (Stripe billing-portal preview; body is just these three). */
export async function createBillingLink({ spaceSeq, priceId, planSeq }) {
  const res = await post('/payment/api/v1/charge/billing', { body: { priceId, planSeq, spaceSeq } });
  return extractLink(res);
}

/** Subscriber → buy N credit packs (one-time checkout, USD). */
export async function createOneTimeLink({ spaceSeq, priceId, planSeq, quantity }) {
  const res = await post('/payment/api/v1/charge/checkout/one-time', {
    body: {
      priceId, planSeq, quantity, spaceSeq,
      successUrl: RETURN_URL, cancelUrl: RETURN_URL,
      successParams: SUCCESS_PARAMS, isAddSpaceRequest: false, force: false,
    },
  });
  return extractLink(res);
}

/** PAY4052 = Stripe session creation failed — for an existing subscriber this usually means the priceId's
 *  currency (or period) doesn't match the live subscription, so callers try the preferred currency then
 *  fall back to the other. */
export const isCurrencyMismatch = (err) => err instanceof PersoApiError && err.code === 'PAY4052';

/** Run `fn(currency)` for the preferred currency, falling back to the other on a currency mismatch. */
export async function withCurrencyFallback(preferred, fn) {
  const order = preferred === 'krw' ? ['krw', 'usd'] : ['usd', 'krw'];
  let lastErr = null;
  for (const currency of order) {
    try { return { currency, result: await fn(currency) }; }
    catch (e) { if (isCurrencyMismatch(e)) { lastErr = e; continue; } throw e; }
  }
  throw lastErr;
}
