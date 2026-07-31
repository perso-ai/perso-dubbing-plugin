#!/usr/bin/env node
// Single body source: docs/index.html (Korean) holds the canonical body markup + the S i18n table.
// This regenerates the BODY text of each locale file (docs/{en,es,pt}/index.html) by baking S[lang]
// into every [data-i] element, so the served HTML is already in the right language (no JS swap needed
// for the initial render — better for SEO / no-JS). Each locale file's <head> is left untouched
// (titles, meta, og/twitter, canonical, FAQ JSON-LD are already localized there).
//
// Usage:  node deploy/agents-site/sync-locale-bodies.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs');
const SRC = path.join(ROOT, 'index.html');
const LOCALES = ['en', 'es', 'pt'];

// --- extract `var S = {...}` (valid JSON: double-quoted keys/values) via brace-balance respecting strings ---
function extractS(html) {
  const marker = 'var S = ';
  let i = html.indexOf(marker);
  if (i < 0) throw new Error('S object not found');
  i += marker.length;
  while (html[i] !== '{') i++;
  const start = i;
  let depth = 0, inStr = false, esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return JSON.parse(html.slice(start, i + 1)); }
  }
  throw new Error('S object not balanced');
}

// find the matching close tag for `tag`, starting at `from`, counting nested same-name tags
function findClose(html, from, tag) {
  const re = new RegExp(`<(/?)${tag}\\b`, 'g');
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html)) !== null) {
    if (m[1] === '/') { if (--depth === 0) return m.index; }
    else depth++;
  }
  return -1;
}

// replace inner HTML of every [data-i] element with dict[key]
function localizeBody(html, dict, report) {
  const openRe = /<([a-zA-Z][\w-]*)\b([^>]*?)\sdata-i="([^"]+)"([^>]*)>/g;
  let out = '', last = 0, m;
  while ((m = openRe.exec(html)) !== null) {
    const tag = m[1], key = m[3];
    const openEnd = openRe.lastIndex;
    const closeStart = findClose(html, openEnd, tag);
    if (closeStart === -1) { report.skipped.push(`${key} (no close for <${tag}>)`); continue; }
    const val = dict[key];
    if (val === undefined) { report.missing.push(key); continue; }
    out += html.slice(last, openEnd) + val;
    last = closeStart;
    openRe.lastIndex = closeStart;
    report.replaced++;
  }
  out += html.slice(last);
  return out;
}

const S = extractS(readFileSync(SRC, 'utf8'));
const HANGUL = /[가-힣]/;
// Non-[data-i] runtime-localized bits (applyLang swaps these too). Kept small + explicit.
const LANG_NAME = { en: 'English', es: 'Español', pt: 'Português' };
const TERM_ARIA = {
  en: 'Terminal session example',
  es: 'Ejemplo de sesión de terminal',
  pt: 'Exemplo de sessão no terminal',
};

for (const lang of LOCALES) {
  const file = path.join(ROOT, lang, 'index.html');
  const html = readFileSync(file, 'utf8');
  const report = { replaced: 0, missing: [], skipped: [] };
  let out = localizeBody(html, S[lang], report);
  // type-line (terminal demo command) — applyLang sets it from S._type
  out = out.replace(/(<span[^>]*id="type-line"[^>]*>)([^<]*)(<\/span>)/, `$1${S[lang]._type}$3`);
  // language-switcher current-language label — applyLang sets it from LANG_NAME
  out = out.replace(/(id="langname"[^>]*>)([^<]*)(<)/, `$1${LANG_NAME[lang]}$3`);
  // terminal a11y label (static; not runtime-swapped) — translate for the served locale
  out = out.replace('aria-label="터미널 실행 화면 예시"', `aria-label="${TERM_ARIA[lang]}"`);

  // guard: every [data-i] whose key has a translation should now hold that exact value
  let leftoverKO = 0;
  const check = /<([a-zA-Z][\w-]*)\b[^>]*?\sdata-i="([^"]+)"[^>]*>/g;
  let cm;
  while ((cm = check.exec(out)) !== null) {
    const key = cm[2];
    if (S[lang][key] === undefined) continue;
    const cs = findClose(out, check.lastIndex, cm[1]);
    if (cs === -1) continue;
    const inner = out.slice(check.lastIndex, cs);
    if (inner !== S[lang][key]) leftoverKO++;
    check.lastIndex = cs;
  }

  // Korean left in VISIBLE body content (strip <script> i18n tables/code + head, which keep Korean by design)
  const visible = (out.split('</head>')[1] || '').replace(/<script\b[\s\S]*?<\/script>/g, '');
  const koInBody = visible.match(new RegExp(HANGUL, 'g'))?.length || 0;
  console.log(
    `${lang}: replaced ${report.replaced}` +
    (report.missing.length ? `, missing keys ${report.missing.length}` : '') +
    (report.skipped.length ? `, skipped ${report.skipped.length}` : '') +
    `, mismatched ${leftoverKO}, hangul-chars-left-in-body ${koInBody}`
  );
  if (report.skipped.length) console.log(`   skipped: ${report.skipped.join(', ')}`);
  if (leftoverKO > 0) throw new Error(`${lang}: ${leftoverKO} data-i element(s) not localized — aborting`);

  if (!DRY) writeFileSync(file, out);
}
console.log(DRY ? '(dry run — no files written)' : 'locale bodies synced');
