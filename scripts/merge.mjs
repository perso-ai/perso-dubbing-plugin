#!/usr/bin/env node
// (standalone) results JSON 배열([{index,status,path,reason}])을 받아 그룹 병합.
import { mergeGroups } from '../lib/merge.mjs';

try {
  const results = JSON.parse(process.argv[2] ?? '[]');
  const { outputs, report } = await mergeGroups(results);
  console.log(JSON.stringify({ outputs, report }));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
