// TTS voice models for dubbing (--tts-model). The server accepts the current names and the legacy ones
// case-insensitively and reports the current names (languages API supportedTtsModels) — the worker always
// sends the current name, so logs, state files and telemetry never mix the two spellings.
//
// No --tts-model → no ttsModel in the request: the server applies its own default (LINNET_4, or ORIOLE where
// a language lacks LINNET_4), so a change of default on the server needs no plugin release.

// Telemetry value for a run that left the model to the server.
export const DEFAULT_MODEL_LABEL = 'DEFAULT';

// Server rule for a request without ttsModel: the first of these the target language supports.
export const SERVER_DEFAULT_CANDIDATES = ['LINNET_4', 'ORIOLE'];

const ALIASES = {
  oriole: 'ORIOLE', audio_engine_v3: 'ORIOLE',
  nightingale: 'NIGHTINGALE',
  wren: 'WREN', eleven_v2: 'WREN',
  linnet_3: 'LINNET_3', linnet3: 'LINNET_3', dodo: 'LINNET_3', eleven_v3: 'LINNET_3',
  linnet_4: 'LINNET_4', linnet4: 'LINNET_4',
  finch: 'FINCH',
};

/** CLI value → current model name; null when unknown. */
export function normalizeTtsModel(value) {
  return ALIASES[String(value ?? '').trim().toLowerCase()] ?? null;
}

// Plans each model is refused on (server PlanFeatureType deny-list; submit fails with 403 VT40314).
// Models not listed are allowed on every plan.
const DENIED_TIERS = {
  NIGHTINGALE: ['free', 'starter', 'creator'],
  FINCH: ['free', 'starter', 'creator'],
};

/** Does this plan tier allow the model? No model or an unknown tier never blocks — the server decides. */
export function modelAllowedOnTier(model, tier) {
  const t = String(tier ?? '').trim().toLowerCase();
  return !model || !t || !(DENIED_TIERS[model] ?? []).includes(t);
}

/** Telemetry: the language:model pairs of a dub request ("en:NIGHTINGALE", "en:DEFAULT" when left to the server). */
export const targetModels = (targets, model) => (targets?.length ? targets.map((t) => `${t}:${model ?? DEFAULT_MODEL_LABEL}`) : null);

// Lip-sync for NIGHTINGALE is still in preparation — the server rejects it (also later on a finished NIGHTINGALE dub).
export const supportsLipsync = (model) => model !== 'NIGHTINGALE';

// Dubbing credits per second (server QuotaCalculationStrategy, before any server-side promo ratio).
// k4: whether the 4K ×3 surcharge applies (pro/business/enterprise).
export const DUB_RATE = {
  NIGHTINGALE: { perSec: 6, k4: false },
  FINCH: { perSec: 0.2, k4: true },
};
export const dubRate = (model) => DUB_RATE[model] ?? { perSec: 1, k4: true };

// One-line facts per model for worker prompts ([model-plan] / [model-select]). Verifiable facts only.
export const MODEL_NOTE = {
  LINNET_4: '1 credit/s; the server default',
  ORIOLE: '1 credit/s',
  LINNET_3: '1 credit/s',
  WREN: '1 credit/s',
  FINCH: '0.2 credit/s; Pro plan or higher',
  NIGHTINGALE: '3 credits/s during the launch event (regular 6), lip-sync not available yet; Pro plan or higher',
};
