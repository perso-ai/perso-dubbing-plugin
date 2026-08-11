#!/usr/bin/env node
// Print supported language codes, including regional variants (one line per usable --target token).
import { getLanguages, languageIndex } from '../lib/languages.mjs';

const index = languageIndex(await getLanguages());
const lines = [];
for (const entries of index.byCode.values()) {
  const hasVariants = entries.length > 1; // "default" only means something where there is a choice
  for (const e of entries) lines.push(`  ${e.token.padEnd(8)}${e.name}${hasVariants && !e.tag ? '  [default]' : ''}`);
}

console.log(`languages: ${lines.length}`);
console.log(lines.join('\n'));
