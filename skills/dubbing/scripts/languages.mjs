#!/usr/bin/env node
// Print supported language codes.
import { getLanguages } from '../lib/languages.mjs';

const langs = await getLanguages();
const codes = langs
  .map((l) => (typeof l === 'string' ? l : l.code ?? l.languageCode))
  .filter(Boolean);

console.log(`languages: ${codes.length}`);
console.log(codes.join(', '));
