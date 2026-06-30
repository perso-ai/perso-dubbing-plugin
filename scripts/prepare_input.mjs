#!/usr/bin/env node
// 입력(로컬 경로 또는 URL) 검증·정규화. 결과 JSON을 stdout으로 출력한다.
//   usage: node scripts/prepare_input.mjs "<로컬경로|URL>"
import { prepareInput } from '../lib/input.mjs';

try {
  const result = await prepareInput(process.argv[2]);
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
