// Temp working-folder tracking — bulk-deletes temp artifacts created by splitting/scheduling/merging/downloading on exit.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const _dirs = new Set();

/** Creates a tracked temp folder. It is bulk-deleted by cleanupTempDirs(). */
export async function makeTempDir(prefix = 'dubbing-') {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  _dirs.add(dir);
  return dir;
}

/** Deletes all temp folders created so far (failures are ignored). */
export async function cleanupTempDirs() {
  for (const dir of _dirs) {
    try { await rm(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  _dirs.clear();
}
