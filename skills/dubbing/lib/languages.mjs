// Fetch supported languages and resolve regional variants (en-GB, pt-PT, es-ES) against that list.
// The list has one row per selectable language: languageTag "default" is the umbrella row of a code,
// any other tag is a regional variant of the same code.
import { get } from './http_client.mjs';

let _cache = null;
let _index = null;

export async function getLanguages() {
  if (_cache) return _cache;
  const res = await get('/video-translator/api/v1/languages');
  // Be flexible about the response shape: result[], languages[], or the array itself
  const list = res?.result ?? res?.languages ?? res;
  _cache = Array.isArray(list) ? list : [];
  return _cache;
}

// Spellings of the default rows that users write because the display name names a region
// ("English (US)" → en-US). They resolve to the bare code — the server treats a blank tag as the default.
const DEFAULT_ALIASES = { 'en-us': 'en', 'pt-br': 'pt', 'es-mx': 'es' };

const lower = (s) => String(s ?? '').trim().toLowerCase();
const baseName = (n) => String(n ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim(); // "English (US)" → "English"
const regionName = (n) => (String(n ?? '').match(/\(([^)]*)\)\s*$/)?.[1] ?? '').trim(); // "English (UK)" → "UK"

// One list row → the token the CLI accepts: the bare code on a default row, the BCP-47 tag on a variant row.
// tag stays null for default rows (omitted at submit time = server default).
function toEntry(row) {
  if (typeof row === 'string') return { token: row, code: row, tag: null, name: row };
  const code = row?.code ?? row?.languageCode;
  if (!code) return null;
  const raw = row.languageTag;
  const tag = !raw || raw === 'default' ? null : String(raw);
  return { token: tag ?? String(code), code: String(code), tag, name: row.name ?? String(code) };
}

/** Index the language list: case-insensitive token lookup + the entries of each code (default row first). */
export function languageIndex(rows) {
  const byToken = new Map();
  const byCode = new Map();
  for (const row of rows ?? []) {
    const e = toEntry(row);
    if (!e) continue;
    if (!byToken.has(lower(e.token))) byToken.set(lower(e.token), e);
    const list = byCode.get(lower(e.code)) ?? [];
    if (e.tag) list.push(e); else list.unshift(e);
    byCode.set(lower(e.code), list);
  }
  for (const [alias, code] of Object.entries(DEFAULT_ALIASES)) {
    const def = (byCode.get(code) ?? []).find((e) => !e.tag);
    if (def && !byToken.has(alias)) byToken.set(alias, def); // never shadow a real token
  }
  return { byToken, byCode, size: byToken.size };
}

/** Cached index. An empty index means the fetch failed (or the list is empty) and is not cached — callers skip validation. */
export async function getLanguageIndex() {
  if (_index) return _index;
  const idx = languageIndex(await getLanguages().catch(() => []));
  if (idx.size) _index = idx;
  return idx;
}

/** token ("en", "EN-gb", "pt-BR") → its list entry with the list's own casing; null when unknown. */
export function resolveLanguage(index, token) {
  return index?.byToken?.get(lower(token)) ?? null;
}

/** Options of the language a rejected token belongs to: `English options: en (English (US), default), en-GB (English (UK))`.
 *  null when the code itself is unknown — the caller prints the full supported list instead. */
export function languageOptions(index, token) {
  const entries = index?.byCode?.get(lower(token).split('-')[0]);
  if (!entries?.length) return null;
  const name = baseName(entries[0].name);
  if (entries.length === 1) return `${name} has no regional variants — use "${entries[0].token}".`;
  const opts = entries.map((e) => `${e.token} (${e.name}${e.tag ? '' : ', default'})`).join(', ');
  return `${name} options: ${opts}`;
}

/** Every supported code on one line, each code once with its variants folded in: `en (en-GB for UK), ko, …`. */
export function supportedSummary(index) {
  const out = [];
  for (const entries of index?.byCode?.values() ?? []) {
    const variants = entries.filter((e) => e.tag).map((e) => `${e.token} for ${regionName(e.name) || e.name}`);
    out.push(variants.length ? `${entries[0].code} (${variants.join(', ')})` : entries[0].code);
  }
  return out.join(', ');
}

/** Submit shape for one target token: { languageCode, languageTag? } — languageTag omitted = the code's default row.
 *  If the list is unavailable, split on the first '-' and let the server validate the tag. */
export async function targetLanguageFields(token) {
  const hit = resolveLanguage(await getLanguageIndex(), token);
  if (hit) return hit.tag ? { languageCode: hit.code, languageTag: hit.tag } : { languageCode: hit.code };
  const t = String(token ?? '').trim();
  const dash = t.indexOf('-');
  return dash > 0 ? { languageCode: t.slice(0, dash), languageTag: t } : { languageCode: t };
}
