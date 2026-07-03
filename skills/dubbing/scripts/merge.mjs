#!/usr/bin/env node
// (standalone) Takes a results JSON array ([{index,status,path,reason}]) and merges groups.
import { mergeGroups } from '../lib/merge.mjs';

try {
  const results = JSON.parse(process.argv[2] ?? '[]');
  const { outputs, report } = await mergeGroups(results);
  console.log(JSON.stringify({ outputs, report }));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
