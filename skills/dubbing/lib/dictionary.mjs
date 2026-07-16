// Custom dictionary (glossary): pins how specific terms are translated — brand names, product names, jargon.
//
// The server accepts ONLY a CSV whose first row is the `source,target` header. Any other shape (headerless
// CSV, JSON, TSV) is not rejected: the translate request succeeds, the project completes with zero
// sentences, and nothing is billed. That silent failure is indistinguishable from a normal run until you
// inspect the output, so the file is validated here — before a single credit is at risk.
import { readFileSync, existsSync, statSync } from 'node:fs';

export const DICT_HEADER = 'source,target';
const MAX_BYTES = 1 << 20; // 1 MiB — a glossary is a term list, not a corpus

export class DictionaryError extends Error {
  constructor(msg) { super(msg); this.name = 'DictionaryError'; }
}

/**
 * Validate a glossary CSV and return its entries. Throws DictionaryError with a fixable message.
 * Accepts a UTF-8 BOM and CRLF line endings; ignores blank lines.
 */
export function readDictionary(path) {
  if (!existsSync(path) || !statSync(path).isFile()) throw new DictionaryError(`Dictionary file not found: ${path}`);
  const { size } = statSync(path);
  if (size > MAX_BYTES) throw new DictionaryError(`Dictionary is too large (${size} bytes, max ${MAX_BYTES}).`);

  const lines = readFileSync(path, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) throw new DictionaryError(`Dictionary is empty: ${path}`);

  if (lines[0].replace(/\s/g, '').toLowerCase() !== DICT_HEADER) {
    throw new DictionaryError(
      `Dictionary must be a CSV whose first line is exactly "${DICT_HEADER}" — got "${lines[0]}".\n` +
      `The server silently ignores any other format (the run completes with no output and no charge). Example:\n` +
      `  ${DICT_HEADER}\n  페르소,Perso`,
    );
  }

  const entries = [];
  lines.slice(1).forEach((line, i) => {
    const [source, ...rest] = line.split(',');
    const target = rest.join(',').trim(); // a target may legitimately contain commas
    if (!source?.trim() || !target) throw new DictionaryError(`Dictionary line ${i + 2} needs "source,target" — got "${line}".`);
    entries.push({ source: source.trim(), target });
  });
  if (!entries.length) throw new DictionaryError(`Dictionary has a header but no terms: ${path}`);
  return entries;
}
