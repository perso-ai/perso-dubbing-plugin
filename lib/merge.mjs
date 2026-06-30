// 그룹 병합. index 순으로 OK/PASSTHROUGH를 누적하고 HARD_FAIL을 그룹 경계로 분리해
// 연속 성공 구간끼리 ffmpeg concat한다.
import { writeFile, rm, copyFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureFfmpeg } from '../scripts/check_deps.mjs';
import { makeTempDir } from './tmp.mjs';
import { pickVideoEncoder, encoderVideoArgs } from './ffmpeg.mjs';

const exec = promisify(execFile);

// 내부 사유 토큰 → 사용자 친화 문구 (raw 코드/조건 노출 방지)
function friendlyReason(reason) {
  const map = {
    too_long: '길이 제한', submit_failed: '처리 오류', download_failed: '결과 내려받기 실패',
    no_voice: '음성 미검출(더빙할 내용 없음)', elapsed_exceeded: '시간 초과', failed: '처리 실패',
  };
  if (map[reason]) return map[reason];
  if (typeof reason === 'string' && /[가-힣]/.test(reason)) return reason; // 서비스가 준 한글 안내는 그대로
  return '처리 실패';
}

/**
 * @param results Map(index→{status,path,reason}) 또는 동일 형태 배열
 * @returns {outputs:[{path,indices}], failures:[{index,reason}], report:string|null}
 */
export async function mergeGroups(results, { outDir } = {}) {
  const items = [...(results instanceof Map ? results.values() : results)].sort((a, b) => a.index - b.index);
  const dir = outDir ?? (await makeTempDir('dubbing-merge-'));

  const groups = [];
  const failures = [];
  let cur = [];
  for (const it of items) {
    if (it.status === 'OK' || it.status === 'PASSTHROUGH') {
      cur.push(it);
    } else {
      // HARD_FAIL(생성 실패) / DLFAIL(생성됨·다운로드만 실패) → 이번 출력에선 빈자리(경계 분리)
      failures.push({ index: it.index, reason: it.reason ?? 'unknown' });
      if (cur.length) { groups.push(cur); cur = []; }
    }
  }
  if (cur.length) groups.push(cur);

  const outputs = [];
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const persoName = group.find((i) => i.name)?.name ?? null; // Perso가 준 파일명(있으면)
    const ext = (persoName && extname(persoName)) || '.mp4'; // 결과 컨테이너(오디오 더빙이면 .wav 등)
    const name = groups.length === 1 ? `output${ext}` : `output_${g + 1}${ext}`;
    const out = join(dir, name);
    await concat(group.map((i) => i.path), out);
    outputs.push({ path: out, indices: group.map((i) => i.index), name: persoName });
  }

  const report = failures.length
    ? failures.map((f) => `${f.index + 1}번 구간 제외 — ${friendlyReason(f.reason)}`).join('\n')
    : null;

  return { outputs, failures, report };
}

async function concat(paths, outPath) {
  if (paths.length === 1) {
    // 단일 조각(자르기 없음) → ffmpeg 없이 그대로 복사
    await copyFile(paths[0], outPath);
    return outPath;
  }

  ensureFfmpeg(); // 다중 병합엔 ffmpeg 필요(분할이 있었던 경우라 보통 이미 설치됨)
  const listFile = `${outPath}.concat.txt`;
  const list = paths.map((p) => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n');
  await writeFile(listFile, list, 'utf8');

  const base = ['-y', '-f', 'concat', '-safe', '0', '-i', listFile];
  try {
    // 코덱·해상도·샘플레이트 동일 시 무손실 빠른 병합(-c copy)
    await exec('ffmpeg', [...base, '-c', 'copy', '-movflags', '+faststart', outPath], { maxBuffer: 1 << 20 });
  } catch {
    // 불일치 시 재인코딩 폴백(기본 libx264, HW는 OS 자동감지)
    const enc = await pickVideoEncoder();
    await exec('ffmpeg', [...base, ...encoderVideoArgs(enc), '-c:a', 'aac', '-movflags', '+faststart', outPath], { maxBuffer: 1 << 20 });
  } finally {
    await rm(listFile, { force: true }).catch(() => {}); // concat 리스트 파일 즉시 정리
  }
  return outPath;
}
