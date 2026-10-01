// TTS voice models for dubbing (--tts-model). The server accepts the current names and the legacy ones
// case-insensitively and reports the current names (languages API supportedTtsModels) — the worker always
// sends the current name, so logs, state files and telemetry never mix the two spellings.

export const DEFAULT_TTS_MODEL = 'ORIOLE';

const ALIASES = {
  oriole: 'ORIOLE', audio_engine_v3: 'ORIOLE',
  nightingale: 'NIGHTINGALE',
  wren: 'WREN', eleven_v2: 'WREN',
  dodo: 'DODO', eleven_v3: 'DODO',
};

/** CLI value → current model name; null when unknown. */
export function normalizeTtsModel(value) {
  return ALIASES[String(value ?? '').trim().toLowerCase()] ?? null;
}

// NIGHTINGALE is sold on Pro and above; lower plans are rejected at submit (403 VT40314). The server has
// no plan rule known for the other models, so they are left to the server.
const NIGHTINGALE_TIERS = ['pro', 'team', 'business', 'enterprise'];

/** Does this plan tier allow the model? An unknown tier never blocks — the server decides. */
export function modelAllowedOnTier(model, tier) {
  if (model !== 'NIGHTINGALE') return true;
  const t = String(tier ?? '').trim().toLowerCase();
  return !t || NIGHTINGALE_TIERS.includes(t);
}

/** Telemetry: the language:model pairs of a dub request ("en:NIGHTINGALE"); null when no model applies. */
export const targetModels = (targets, model) => (model && targets?.length ? targets.map((t) => `${t}:${model}`) : null);

// Lip-sync for NIGHTINGALE is still in preparation — the server rejects it (also later on a finished NIGHTINGALE dub).
export const supportsLipsync = (model) => model !== 'NIGHTINGALE';

// One-line facts per model for worker prompts ([model-plan] / [model-select]). Verifiable facts only.
export const MODEL_NOTE = {
  ORIOLE: '1 credit/s; the default',
  NIGHTINGALE: '3 credits/s during the launch event (regular 6), lip-sync not available yet; Pro plan or higher',
  WREN: '1 credit/s',
  DODO: '1 credit/s',
};
