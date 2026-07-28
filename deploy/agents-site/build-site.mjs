#!/usr/bin/env node
// Transforms docs/ (GitHub Pages layout, root = Korean) into the static tree served at perso.ai/{lang}/dubbing/agents.
// Leaves the original docs/ untouched — dubbing-plugin.perso.ai (GitHub Pages) stays live until the 301 cutover.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [srcDir, outDir] = process.argv.slice(2);
if (!srcDir || !outDir) {
  console.error('usage: node build-site.mjs <docsDir> <outDir>');
  process.exit(1);
}

const OLD_ORIGIN = 'https://dubbing-plugin.perso.ai';
const ASSET_PREFIX = '/dubbing/agents';
const newPageUrl = (lang) => `https://perso.ai/${lang}/dubbing/agents`;

const LOCALES = [
  { lang: 'ko', src: 'index.html' },
  { lang: 'en', src: 'en/index.html' },
  { lang: 'es', src: 'es/index.html' },
  { lang: 'pt', src: 'pt/index.html' },
];

function transform(html) {
  let out = html;
  // Replace lang-prefixed URLs before the bare root (Korean) — ordering matters here.
  out = out.replaceAll(`${OLD_ORIGIN}/en/`, 'https://perso.ai/dubbing/agents');
  for (const lang of ['es', 'pt']) {
    out = out.replaceAll(`${OLD_ORIGIN}/${lang}/`, newPageUrl(lang));
  }
  out = out.replaceAll(`${OLD_ORIGIN}/`, newPageUrl('ko'));
  // Root-absolute assets get the /dubbing/agents prefix — perso.ai root is owned by another app.
  out = out.replaceAll('"/media/', `"${ASSET_PREFIX}/media/`);
  out = out.replaceAll('url(/fonts/', `url(${ASSET_PREFIX}/fonts/`);
  out = out.replaceAll('"/perso-mark.svg', `"${ASSET_PREFIX}/perso-mark.svg`);
  out = out.replaceAll(
    'function langPath(l){ return l === "ko" ? "/" : "/" + l + "/"; }',
    'function langPath(l){ return l === "ko" ? "/ko/dubbing/agents" : l === "en" ? "/dubbing/agents" : "/" + l + "/dubbing/agents"; }'
  );
  out = out.replaceAll('location.replace("/"+l+"/");', 'location.replace("/"+l+"/dubbing/agents");');
  return out;
}

rmSync(outDir, { recursive: true, force: true });

for (const { lang, src } of LOCALES) {
  const out = transform(readFileSync(path.join(srcDir, src), 'utf8'));
  // Fail the build if any untransformed pattern remains.
  for (const bad of [
    'dubbing-plugin.perso.ai',
    '"/media/',
    'url(/fonts/',
    '"/perso-mark.svg',
    '? "/" : "/" + l + "/"',
    'location.replace("/"+l+"/")',
  ]) {
    if (out.includes(bad)) throw new Error(`${src}: untransformed pattern remains: ${bad}`);
  }
  // Also verify the transformed patterns actually appear — guards against replaceAll silently becoming a no-op if the source format changes.
  for (const mustHave of [
    'function langPath(l){ return l === "ko" ? "/ko/dubbing/agents" : l === "en" ? "/dubbing/agents" : "/" + l + "/dubbing/agents"; }',
    `"${ASSET_PREFIX}/media/`,
    'https://perso.ai/',
  ]) {
    if (!out.includes(mustHave)) throw new Error(`${src}: expected transformed pattern missing: ${mustHave}`);
  }
  mkdirSync(path.join(outDir, lang), { recursive: true });
  writeFileSync(path.join(outDir, lang, 'index.html'), out);
}

for (const asset of ['media', 'fonts']) {
  cpSync(path.join(srcDir, asset), path.join(outDir, 'dubbing/agents', asset), { recursive: true });
}
cpSync(path.join(srcDir, 'perso-mark.svg'), path.join(outDir, 'dubbing/agents/perso-mark.svg'));

console.log(`built ${LOCALES.length} locale pages -> ${outDir}`);
