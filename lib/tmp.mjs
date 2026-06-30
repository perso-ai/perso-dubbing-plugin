// 임시 작업 폴더 추적 — 자르기/스케줄/병합/다운로드가 만든 임시물을 종료 시 일괄 삭제.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const _dirs = new Set();

/** 추적되는 임시 폴더 생성. cleanupTempDirs()로 일괄 삭제된다. */
export async function makeTempDir(prefix = 'dubbing-') {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  _dirs.add(dir);
  return dir;
}

/** 지금까지 만든 임시 폴더 전부 삭제(실패는 무시). */
export async function cleanupTempDirs() {
  for (const dir of _dirs) {
    try { await rm(dir, { recursive: true, force: true }); } catch { /* 무시 */ }
  }
  _dirs.clear();
}
