#!/usr/bin/env node
// Upload-first split decision. Takes prepare_input JSON (or a local path) as an argument.
//   node scripts/probe_split.mjs '<json>' | "<local path>"   (space: PERSO_SPACE_SEQ, else the account's only space)
import { resolveChunks } from '../lib/split.mjs';
import { resolveSpace } from '../lib/space.mjs';

function parseArg(arg) {
  if (!arg) throw new Error('No input — pass prepare_input JSON or a local path.');
  try {
    const j = JSON.parse(arg);
    if (j && typeof j === 'object') return j;
  } catch {
    /* treat as a path */
  }
  return { source: 'local', localPath: arg, originalName: arg.split(/[\\/]/).pop() };
}

try {
  const prepared = parseArg(process.argv[2]);
  const spaceSeq = Number(process.env.PERSO_SPACE_SEQ) || (await resolveSpace());
  const result = await resolveChunks(prepared, spaceSeq);
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
