#!/usr/bin/env node
// Plan upgrade & credit purchase — generates a Stripe payment link for the user to open and pay themselves.
// The agent NEVER opens the link or pays on the user's behalf; it only relays it. Routing by current tier:
//   free → checkout (subscribe) · starter/creator → billing (change plan) · pro/business → one-time (credits) · enterprise → contact
import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
import { resolveKey, onboardingHelp, preloadKeyEnv } from './resolve_key.mjs';
import { getPlanStatus, resolveSpace, dubbingSpaces } from '../lib/space.mjs';
import {
  actionForTier, getRecurringPlans, getCreditProduct, upgradeCandidates, findPriceOption,
  currentBillingPeriod, recommendCredits, createCheckoutLink, createBillingLink, createOneTimeLink,
  withCurrencyFallback, isCurrencyMismatch, CREDIT_PER_UNIT, DEFAULT_CURRENCY, CURRENCIES,
} from '../lib/billing.mjs';
import { withUtm, SUBSCRIPTION_URL } from '../lib/messages.mjs';
import { track } from '../lib/telemetry.mjs';

class UsageError extends Error { constructor(m) { super(m); this.name = 'UsageError'; } }
class ExitCode extends Error { constructor(c) { super(`exit ${c}`); this.name = 'ExitCode'; this.code = c; } }

const USAGE = [
  'Usage:',
  '  node scripts/billing.mjs options [--shortfall <credits>] [--space "<space name>"]',
  '  node scripts/billing.mjs link --checkout --plan <tier> --period <monthly|yearly> [--currency usd|krw] [--space "<space name>"]',
  '  node scripts/billing.mjs link --billing  --plan <tier> [--space "<space name>"]',
  '  node scripts/billing.mjs link --credits  --quantity <n> [--space "<space name>"]',
  '',
  'options  detect the current plan, show the fitting purchase flow + choices, and (with --shortfall) a recommendation',
  'link     generate the Stripe payment link for the user\'s confirmed choice (hand it to the user; never pay for them)',
].join('\n');

const HANDOFF = 'Give this link to the user to open in their browser and complete payment. Do NOT open it or pay on their behalf.';
const CONTACT = 'Enterprise plans have no self-serve checkout — ask the user to contact their workspace administrator.';

function parseArgs(argv) {
  const a = { inputs: [] };
  const VALUE = { '--plan': 'plan', '--period': 'period', '--currency': 'currency', '--quantity': 'quantity', '--space': 'space', '--shortfall': 'shortfall' };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--help' || t === '-h') a.help = true;
    else if (t === '--checkout') a.checkout = true;
    else if (t === '--billing') a.billing = true;
    else if (t === '--credits') a.credits = true;
    else if (t in VALUE) {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`Missing value for ${t}`);
      a[VALUE[t]] = v;
    } else if (t.startsWith('--')) throw new UsageError(`Unknown option: ${t}`);
    else a.inputs.push(t);
  }
  return a;
}

// --space accepts a numeric spaceSeq or a space name (matching dubbing.mjs); omitted → the pinned/only space.
async function resolveSpaceSeq(arg) {
  if (arg === undefined) return resolveSpace();
  const n = Number(arg);
  if (Number.isInteger(n) && n > 0) return n;
  const spaces = await dubbingSpaces();
  const hit = spaces.find((s) => s.name === arg) ?? spaces.find((s) => s.name.toLowerCase() === String(arg).toLowerCase());
  if (!hit) throw new UsageError(`No space named "${arg}". Available: ${spaces.map((s) => s.name).join(', ')}`);
  return hit.seq;
}

const money = (o) => (o && o.price != null ? `${String(o.price).trim()} ${String(o.priceUnit).toUpperCase()}` : '');

// ---- options: show the right action + choices + recommendation for the agent to relay ----
async function runOptions(args) {
  const spaceSeq = await resolveSpaceSeq(args.space);
  const plan = await getPlanStatus(spaceSeq);
  if (!plan) throw new Error('Could not read the current plan — please try again.'); // don't mis-route a paid user to "new subscription"
  const tier = plan.planTier ?? null;
  const action = actionForTier(tier);
  const shortfall = args.shortfall != null ? Number(args.shortfall) : null;

  const L = [`Current plan: ${tier ?? 'unknown'} (spaceSeq ${spaceSeq}${plan?.remainingQuota != null ? `, credits left ${plan.remainingQuota}` : ''})`, `Action: ${action}`];

  if (action === 'contact') { L.push(CONTACT); return void console.log(L.join('\n')); }

  if (action === 'checkout') {
    const [mo, yr] = await Promise.all([
      getRecurringPlans(spaceSeq, { billingPeriod: 'monthly', currency: DEFAULT_CURRENCY }),
      getRecurringPlans(spaceSeq, { billingPeriod: 'yearly', currency: DEFAULT_CURRENCY }),
    ]);
    L.push('', `Plans (currency ${DEFAULT_CURRENCY.toUpperCase()} by default; KRW on request):`);
    for (const p of mo.filter((x) => x.tier !== 'enterprise' && x.tier !== 'free')) {
      const m = p.priceOptions[0];
      const y = findPriceOption(yr, p.tier, 'yearly')?.opt;
      L.push(`  ${p.tier}: ${m ? `monthly ${money(m)}` : ''}${y ? `  ·  yearly ${money(y)}` : '  ·  (monthly only)'}`);
    }
    L.push('', 'Ask the user which plan and monthly/yearly. For heavy use suggest the top self-serve tier (pro); for very large volume, Enterprise (contact admin).');
    L.push('Then run:  node scripts/billing.mjs link --checkout --plan <tier> --period <monthly|yearly> [--currency usd|krw]');
    return void console.log(L.join('\n'));
  }

  if (action === 'billing') {
    const [mo, yr] = await Promise.all([
      getRecurringPlans(spaceSeq, { billingPeriod: 'monthly', currency: DEFAULT_CURRENCY }),
      getRecurringPlans(spaceSeq, { billingPeriod: 'yearly', currency: DEFAULT_CURRENCY }),
    ]);
    const period = currentBillingPeriod([...mo, ...yr]) ?? 'monthly';
    const list = period === 'yearly' ? yr : mo;
    const cands = upgradeCandidates(list, tier);
    L.push(`Current billing period: ${period} (a plan change keeps this period)`);
    if (!cands.length) {
      L.push('', 'No higher self-serve plan is available to switch to. For more capacity, contact your administrator (Enterprise).');
      return void console.log(L.join('\n'));
    }
    L.push('', 'Change-plan options:');
    for (const p of cands) L.push(`  ${p.tier}: ${money(p.priceOptions.find((x) => x.billingPeriod === period) ?? p.priceOptions[0])}`);
    L.push('', 'Ask the user which plan. Recommend the top self-serve tier (pro) for large needs; for very large volume, Enterprise (contact admin). Currency auto-matches the subscription.');
    L.push('Then run:  node scripts/billing.mjs link --billing --plan <tier>');
    return void console.log(L.join('\n'));
  }

  // one-time (pro/business)
  const prod = await getCreditProduct(spaceSeq);
  if (!prod?.priceId) throw new Error('Credit product unavailable for this space.');
  L.push('', `Credit pack: ${CREDIT_PER_UNIT} credits per pack · ${money({ price: prod.unitPrice, priceUnit: prod.priceUnit })}/pack (USD)`);
  if (shortfall != null && shortfall > 0) {
    const rec = recommendCredits(shortfall);
    const cost = prod.unitPrice != null ? `, ${(rec.quantity * Number(prod.unitPrice)).toFixed(2)} ${String(prod.priceUnit).toUpperCase()}` : '';
    L.push(`Shortfall ~${shortfall} credits → recommend ${rec.quantity} pack(s) (${rec.credits} credits${cost}).`);
    L.push('If that quantity or amount is very large, suggest contacting the administrator (Enterprise) instead.');
  } else {
    L.push('Ask the user how many packs to buy.');
  }
  L.push('Then run:  node scripts/billing.mjs link --credits --quantity <n>');
  console.log(L.join('\n'));
}

// ---- link: generate the Stripe URL for the confirmed choice ----
async function runLink(args) {
  const spaceSeq = await resolveSpaceSeq(args.space);
  const fromTier = (await getPlanStatus(spaceSeq).catch(() => null))?.planTier ?? null; // for billing_link_created telemetry
  const modes = [args.checkout && 'checkout', args.billing && 'billing', args.credits && 'credits'].filter(Boolean);
  if (modes.length !== 1) throw new UsageError('Pass exactly one of --checkout, --billing, --credits.');
  const mode = modes[0];

  if (mode === 'checkout') {
    if (!args.plan || !args.period) throw new UsageError('--checkout needs --plan <tier> and --period <monthly|yearly>.');
    const currency = (args.currency || DEFAULT_CURRENCY).toLowerCase();
    if (!CURRENCIES.includes(currency)) throw new UsageError(`--currency must be one of: ${CURRENCIES.join(', ')}`);
    const plans = await getRecurringPlans(spaceSeq, { billingPeriod: args.period, currency });
    const sel = findPriceOption(plans, args.plan, args.period);
    if (!sel?.opt?.priceId) throw new UsageError(`No ${args.plan} plan for ${args.period}/${currency} (starter has no yearly). Check the tier and period.`);
    return printLink(await createCheckoutLink({ spaceSeq, priceId: sel.opt.priceId, planSeq: sel.planSeq }), `${args.plan} ${args.period} (${currency.toUpperCase()})`, { link_type: 'checkout', from_tier: fromTier, upgrade_plan: args.plan });
  }

  if (mode === 'billing') {
    if (!args.plan) throw new UsageError('--billing needs --plan <tier>.');
    // Period is locked to the current subscription and the currency must match it — try the preferred
    // currency, then fall back to the other (PAY4052).
    const preferred = (args.currency || DEFAULT_CURRENCY).toLowerCase();
    if (!CURRENCIES.includes(preferred)) throw new UsageError(`--currency must be one of: ${CURRENCIES.join(', ')}`);
    let currency, link;
    try {
      ({ currency, result: link } = await withCurrencyFallback(preferred, async (cur) => {
        const [mo, yr] = await Promise.all([
          getRecurringPlans(spaceSeq, { billingPeriod: 'monthly', currency: cur }),
          getRecurringPlans(spaceSeq, { billingPeriod: 'yearly', currency: cur }),
        ]);
        const period = currentBillingPeriod([...mo, ...yr]) ?? 'monthly';
        const sel = findPriceOption(period === 'yearly' ? yr : mo, args.plan, period);
        if (!sel?.opt?.priceId) throw new UsageError(`No ${args.plan} plan found for the current period (${period}).`);
        return createBillingLink({ spaceSeq, priceId: sel.opt.priceId, planSeq: sel.planSeq });
      }));
    } catch (e) {
      // Stripe could not create a billing-portal session for this subscription (currency the API can't
      // satisfy, or a subscription that needs attention). Fall back to the self-serve portal instead of
      // surfacing the raw server error.
      if (!isCurrencyMismatch(e)) throw e;
      console.log('Could not generate a direct plan-change link for this subscription automatically.');
      console.log(`Ask the user to change their plan in the Perso portal: ${withUtm(SUBSCRIPTION_URL)}`);
      return;
    }
    return printLink(link, `change to ${args.plan} (${currency.toUpperCase()})`, { link_type: 'billing', from_tier: fromTier, upgrade_plan: args.plan, currency_fallback: currency !== preferred });
  }

  // credits
  const quantity = Number(args.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) throw new UsageError('--credits needs --quantity <positive integer>.');
  const prod = await getCreditProduct(spaceSeq);
  if (!prod?.priceId) throw new Error('Credit product unavailable for this space.');
  printLink(await createOneTimeLink({ spaceSeq, priceId: prod.priceId, planSeq: prod.planSeq, quantity }), `${quantity} credit pack(s) = ${quantity * CREDIT_PER_UNIT} credits`, { link_type: 'onetime', from_tier: fromTier, credit_amount: quantity * CREDIT_PER_UNIT });
}

function printLink(link, what, meta = {}) {
  if (!link) throw new Error('The payment service did not return a link. Please try again.');
  track('billing_link_created', meta);
  console.log(`Payment link (${what}):`);
  console.log(`  ${link}`);
  console.log(HANDOFF);
}

async function main() {
  let exitCode = 0;
  try {
    preloadKeyEnv();
    const args = parseArgs(process.argv.slice(2));
    const cmd = args.inputs[0];
    if (args.help || !cmd) console.log(USAGE);
    else if (!resolveKey()) { console.error(onboardingHelp()); exitCode = 2; }
    else if (cmd === 'options') await runOptions(args);
    else if (cmd === 'link') await runLink(args);
    else throw new UsageError(`Unknown command: ${cmd}`);
  } catch (e) {
    if (e?.name === 'ExitCode') exitCode = e.code;
    else if (e?.name === 'UsageError') { console.error(`${e.message}\n\n${USAGE}`); exitCode = 1; }
    else if (e?.name === 'MissingKeyError') { console.error(onboardingHelp()); exitCode = 2; }
    else { console.error(e?.message ?? 'Unknown error'); exitCode = 1; }
  }
  process.exitCode = exitCode;
  setTimeout(() => process.exit(exitCode), 5000).unref();
}

const isMain = (() => {
  if (!process.argv[1]) return false;
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) main();

export { parseArgs };
