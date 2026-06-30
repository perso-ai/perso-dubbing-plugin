#!/usr/bin/env node
// Validate and normalize the input (local path or URL). Prints the result JSON to stdout.
//   usage: node scripts/prepare_input.mjs "<local path|URL>"
import { prepareInput } from '../lib/input.mjs';

try {
  const result = await prepareInput(process.argv[2]);
  console.log(JSON.stringify(result));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
