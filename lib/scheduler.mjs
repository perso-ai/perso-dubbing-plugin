// 스케줄러 (C/Q 동시성). 여러 입력의 (조각 × 언어)를 하나의 풀로 모아 한 큐를 채워 동시 처리한다.
//   결과: `${inputId}|${index}|${target}` → { inputId, index, target, status, path?, projectId?, name?, reason? }
//   - OK          : 더빙 결과를 로컬로 내려받은 path
//   - PASSTHROUGH : 무음(분할 조각) → 원본 청크 path 그대로(병합 포함)
//   - DLFAIL      : 생성됨(projectSeq 보유) · 다운로드만 실패 → 이어하기에서 재다운로드(재생성 X)
//   - HARD_FAIL   : 병합 제외(그룹 경계)
import { basename, join } from 'node:path';
import { makeTempDir } from './tmp.mjs';
import { upload, requestTranslation, getStatus, download, getQueueStatus, cancel } from './api_adapter.mjs';
import { PersoApiError } from './http_client.mjs';
import {
  BACKOFF_BASE_MS, BACKOFF_MAX_MS, POLL_INTERVAL_MS,
  MAX_IDLE_MS, MAX_RETRY, QUEUE_WAIT_MS,
} from './config.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 크레딧/사용량 부족은 HTTP 402로 통일 판정(내부 코드명에 의존하지 않음)
const isCreditError = (e) => e instanceof PersoApiError && e.httpStatus === 402;
// 번역 큐 풀(backpressure): 실측상 429 VT4292(FULL_VT_TRANSLATE_QUEUE). VT5034(503)도 보존.
const QUEUE_FULL_CODES = new Set(['VT4292', 'VT5034']);

// chunks: 여러 입력의 조각을 한 배열로(각 조각은 inputId로 입력을 구분, index는 입력 내 0-based).
//   분할 안 한 입력은 조각 1개. 같은 (inputId,index)는 언어마다 mediaSeq를 공유(업로드 1회).
export async function runSchedule(chunks, spaceSeq, opts = {}, hooks = {}) {
  const log = hooks.log ?? (() => {});
  const outDir = await makeTempDir('dubbing-out-');

  // 작업 단위 = (입력 × 조각 × 언어). 모든 입력의 모든 조각을 언어마다 펼쳐 한 큐로 채운다.
  const targets = opts.targets ?? [opts.target ?? 'en'];
  const skip = opts.done instanceof Set ? opts.done : new Set(); // 이어하기: 이미 완료된 (inputId|index|target)은 제출 안 함
  const taskKey = (t) => `${t.inputId ?? 0}|${t.index}|${t.target}`;
  const mediaKey = (t) => `${t.inputId ?? 0}|${t.index}`;

  const pending = [];
  for (const c of chunks) for (const target of targets) {
    const t = { ...c, inputId: c.inputId ?? 0, path: c.path ?? c.localPath, target, retries: 0 };
    if (!skip.has(taskKey(t))) pending.push(t);
  }
  const submitted = new Map(); // projectId → task(입력×조각×언어)
  const results = new Map(); // taskKey → result
  const mediaByKey = new Map(); // `${inputId}|${index}` → {seq, kind}: 조각당 업로드 1회, 언어 간 공유
  let stopAll = false;
  let stopReason = null;
  let engineError = null; // 복구 불가 엔진오류 메시지(상위 보고용)
  let backoff = BACKOFF_BASE_MS;
  let lastProgressAt = Date.now(); // 마지막 진전 시각. 절대 경과가 아닌 '무진전' 기준 가드.

  const timeUp = () => Date.now() - lastProgressAt >= MAX_IDLE_MS;
  const setResult = (t, r) => results.set(taskKey(t), { inputId: t.inputId ?? 0, index: t.index, target: t.target, ...r });

  // stop_all이면 신규 제출은 멈추고 진행 중(submitted)만 마저 확정 → 비면 종료(pending은 보존).
  while ((submitted.size || (!stopAll && pending.length)) && !timeUp()) {
    let progressed = false;
    let blocked = false; // 빈 슬롯 없음(외부/선행 작업이 큐 점유)으로 신규 제출 불가

    // ── 제출 ── 큐 상태를 조회해 '빈 슬롯' 만큼만 밀어넣고, 슬롯이 비면 다음 라운드에 추가.
    //            (조회 실패 시 slots=Infinity = 기존처럼 VT4292까지 밀기 = 폴백)
    if (!stopAll && pending.length) {
      const q = await getQueueStatus(spaceSeq);
      let slots = q ? q.available : Infinity;
      if (q) log(`큐 ${q.used}/${q.max} — 빈 슬롯 ${q.available}개`);
      const keep = [];
      let rejected = false;
      for (const chunk of pending) {
        if (stopAll || rejected || slots <= 0) {
          keep.push(chunk);
          if (slots <= 0 || rejected) blocked = true; // 용량 점유로 보류(일시 오류 재시도와 구분)
          continue;
        }
        try {
          if (chunk.mediaSeq === undefined) {
            let m = mediaByKey.get(mediaKey(chunk));
            if (!m) { m = await upload(toPrepared(chunk), spaceSeq); mediaByKey.set(mediaKey(chunk), m); } // 조각당 1회(언어 공유)
            chunk.mediaSeq = m.seq;
            chunk.kind = chunk.kind ?? m.kind;
          }
          const [pid] = await requestTranslation(spaceSeq, chunk.mediaSeq, { ...opts, target: chunk.target, title: chunk.title ?? opts.title, kind: chunk.kind });
          if (pid == null) throw new Error('projectId 없음');
          submitted.set(pid, chunk);
          progressed = true;
          slots -= 1;
          log(`[입력 ${chunk.inputId + 1}] 구간 ${chunk.index + 1}(${chunk.target}) 제출`);
        } catch (e) {
          const code = e instanceof PersoApiError ? e.code : null;
          if (isCreditError(e)) {
            stopAll = true; stopReason = 'credit'; keep.push(chunk);
            log('사용량(크레딧) 부족 — 신규 제출 중단, 진행분만 마무리');
          } else if (QUEUE_FULL_CODES.has(code)) {
            rejected = true; blocked = true; keep.push(chunk); // in-flight는 건드리지 않고 이번 라운드 신규 제출만 멈춤
            log('큐가 가득 참 — 슬롯 빌 때까지 대기 후 재시도');
          } else if (code === 'F4008') {
            // 보통 로컬은 resolveChunks가 미리 분할 → 여기 오는 건 external 등 분할 불가 케이스
            setResult(chunk, { status: 'HARD_FAIL', reason: 'too_long' });
            log(`[입력 ${chunk.inputId + 1}] 구간 ${chunk.index + 1} 처리 불가(길이)`);
          } else if (chunk.retries < MAX_RETRY) {
            chunk.retries++; keep.push(chunk);
            log(`[입력 ${chunk.inputId + 1}] 구간 ${chunk.index + 1} 재시도`);
          } else {
            setResult(chunk, { status: 'HARD_FAIL', reason: 'submit_failed' });
            log(`[입력 ${chunk.inputId + 1}] 구간 ${chunk.index + 1} 처리 실패`);
          }
        }
      }
      pending.length = 0;
      pending.push(...keep);
    }

    // ── 폴링 ──
    if (submitted.size) {
      await sleep(POLL_INTERVAL_MS);
      for (const [pid, chunk] of [...submitted]) {
        if (!submitted.has(pid)) continue; // 형제 cancel 등으로 이미 이번 라운드에 처리됨 → 중복 처리 방지
        let st = null;
        try { st = await getStatus(pid, spaceSeq); } catch { /* 일시 오류 → 다음 라운드 */ }
        if (!st || st.state === 'processing') {
          // 서버가 진척%를 올리는 중이면 '진전'으로 보고 무진전 타이머를 리셋(느린 긴 영상도 죽이지 않음).
          if (st && typeof st.progress === 'number' && st.progress > (chunk._progress ?? -1)) {
            chunk._progress = st.progress;
            progressed = true;
          }
          continue;
        }

        submitted.delete(pid);
        progressed = true;
        const tag = `[입력 ${chunk.inputId + 1}] 구간 ${chunk.index + 1}(${chunk.target})`;
        if (st.state === 'complete') {
          const out = join(outDir, `dub_${chunk.inputId}_${String(chunk.index).padStart(3, '0')}_${chunk.target}.mp4`);
          try {
            const dl = await download(pid, spaceSeq, { kind: chunk.kind, outPath: out });
            setResult(chunk, { status: 'OK', projectId: pid, path: out, name: dl.fileName });
            log(`${tag} 완료`);
          } catch {
            // 생성은 성공(projectSeq 보유) — 다운로드만 실패. 재더빙하지 않고 DLFAIL로 표시해
            // projectSeq를 보존한다 → 이어하기에서 재다운로드(재생성 X).
            setResult(chunk, { status: 'DLFAIL', projectId: pid, reason: 'download_failed' });
            log(`${tag} 생성 완료(다운로드 실패 → 이어하기로 재다운로드)`);
          }
        } else if (st.noVoice) {
          // 음성 미검출. 분할 조각(endMs 보유)이면 원본 통과 → 긴 영상 중 무음 구간을 살리고 나머지는 더빙·병합.
          // 단일(분할 없는 통짜·external) 요청이면 원본과 바이트 동일한 결과를 '완료'로 내보내지 않도록 실패 처리.
          if (chunk.endMs != null) {
            setResult(chunk, { status: 'PASSTHROUGH', projectId: pid, path: chunk.path, reason: 'no_voice' });
            log(`${tag} 통과(음성 없음)`);
          } else {
            setResult(chunk, { status: 'HARD_FAIL', projectId: pid, reason: 'no_voice' });
            log(`${tag} 음성 미검출 — 더빙할 내용이 없습니다`);
          }
        } else if (st.failureReason === 'ENGINE_ERROR') {
          // 엔진 오류(복구 불가) → 재시도 없이 실패. 같은 조각(같은 mediaSeq)은 어느 언어든 동일 → 형제 cancel.
          engineError = st.message ?? engineError ?? '엔진 처리 오류';
          setResult(chunk, { status: 'HARD_FAIL', projectId: pid, reason: st.message ?? 'engine_error' });
          log(`${tag} 처리 불가(엔진 오류): ${st.message ?? ''}`);
          await cancelSiblings(chunk.inputId, chunk.index, pid);
        } else if (chunk.retries < MAX_RETRY) {
          chunk.retries++; pending.push(chunk); // 업로드(mediaSeq) 재사용해 재번역
          log(`${tag} 재시도`);
        } else {
          setResult(chunk, { status: 'HARD_FAIL', projectId: pid, reason: st.message ?? 'failed' });
          log(`${tag} 처리 실패`);
        }
      }
    } else if (pending.length && !stopAll) {
      if (blocked) {
        // 빈 슬롯 없음(외부/선행 작업이 큐 점유) + 우리 in-flight도 없는 순수 대기.
        // 무진전 타이머를 리셋(외부 작업 대기로는 타임아웃하지 않음)하고 5분 후 재확인.
        lastProgressAt = Date.now();
        log('큐에 빈 슬롯이 없어 대기 중 — 5분 후 재확인');
        await sleep(QUEUE_WAIT_MS);
      } else {
        // in-flight 없는데 제출 못 함(일시 오류·VT5034 지속) → 지수 백오프 후 재시도
        await sleep(backoff);
        backoff = Math.min(backoff * 2, BACKOFF_MAX_MS);
      }
    }

    if (progressed) { backoff = BACKOFF_BASE_MS; lastProgressAt = Date.now(); } // 진전 있으면 백오프/무진전 타이머 리셋
  }

  if (timeUp()) failRemaining('elapsed_exceeded');

  return {
    results,
    outDir,
    stopped: stopAll,
    stopReason,
    engineError,
    pendingLeft: pending.map(({ retries, mediaSeq, _progress, ...c }) => c), // stop_all 시 보존(이어하기용). mediaSeq는 제거→재업로드.
  };

  function failRemaining(reason) {
    for (const c of pending) if (!results.has(taskKey(c))) setResult(c, { status: 'HARD_FAIL', reason });
    for (const [pid, c] of submitted) if (!results.has(taskKey(c))) setResult(c, { status: 'HARD_FAIL', projectId: pid, reason });
    submitted.clear();
    pending.length = 0;
  }

  // 엔진 오류난 조각은 어느 언어든 같은 결과 → 진행 중 형제(같은 입력·조각, 다른 언어) 취소 + 대기분 제거.
  async function cancelSiblings(inputId, index, exceptPid) {
    for (const [pid2, t] of [...submitted]) {
      if (t.inputId === inputId && t.index === index && pid2 !== exceptPid) {
        await cancel(pid2, spaceSeq);
        submitted.delete(pid2);
        setResult(t, { status: 'HARD_FAIL', projectId: pid2, reason: 'engine_error' });
        log(`[입력 ${t.inputId + 1}] 구간 ${t.index + 1}(${t.target}) 취소(같은 조각 엔진오류)`);
      }
    }
    for (let i = pending.length - 1; i >= 0; i--) {
      if (pending[i].inputId === inputId && pending[i].index === index) {
        setResult(pending[i], { status: 'HARD_FAIL', reason: 'engine_error' });
        pending.splice(i, 1);
      }
    }
  }
}

function toPrepared(chunk) {
  if (chunk.source === 'external') return { source: 'external', sourceUrl: chunk.sourceUrl };
  return { source: 'local', localPath: chunk.path, originalName: chunk.originalName ?? basename(chunk.path) };
}
