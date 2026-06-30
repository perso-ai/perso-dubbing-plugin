#!/usr/bin/env node
// 업로드 우선 분할 결정. 인자로 prepare_input JSON(또는 로컬 경로)을 받는다.
//   node scripts/probe_split.mjs '<json>' | "<로컬경로>"   (space는 PERSO_SPACE_SEQ 또는 자동)
import { resolveChunks } from '../lib/split.mjs';
import { resolveSpace } from '../lib/space.mjs';

function parseArg(arg) {
  if (!arg) throw new Error('입력이 없습니다 — prepare_input JSON 또는 로컬 경로를 전달하세요.');
  try {
    const j = JSON.parse(arg);
    if (j && typeof j === 'object') return j;
  } catch {
    /* 경로로 취급 */
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
