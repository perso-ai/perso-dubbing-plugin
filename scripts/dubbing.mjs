#!/usr/bin/env node
// /dubbing 진입 오케스트레이터.
//   키 게이트 → 입력(들) → 입력별 분할 → 전역 풀 스케줄러(모든 입력×조각×언어를 한 큐로) → 입력·언어별 병합 → 안내.
//   usage: node scripts/dubbing.mjs "<로컬|URL|폴더>" ["<또 다른 입력>" ...] [--source auto] [--target en,ja] [--space N] [--out 경로|폴더]
//          node scripts/dubbing.mjs --resume "<statefile>"
import { writeFileSync, readFileSync, copyFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join, basename, dirname, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveKey, onboardingHelp, preloadKeyEnv } from './resolve_key.mjs';
import { expandInputs, prepareInput } from '../lib/input.mjs';
import { resolveSpace, getPlanStatus } from '../lib/space.mjs';
import { resolveChunks, recutChunk } from '../lib/split.mjs';
import { runSchedule } from '../lib/scheduler.mjs';
import { download } from '../lib/api_adapter.mjs';
import { mergeGroups } from '../lib/merge.mjs';
import { messages } from '../lib/messages.mjs';
import { cleanupTempDirs, makeTempDir } from '../lib/tmp.mjs';

const log = (m) => console.error('  ' + m); // 백그라운드 상세 로그(stderr)
// 사용자에게 노출할 마일스톤(stdout). 에이전트는 SKILL 규칙에 따라 이 [진행] 줄을 채팅으로 전달한다.
const notify = (m) => console.log(`[진행] ${m}`);

// API 에러를 사용자 친화 문구로 (raw 코드/메시지 노출 방지)
function isAuthError(e) {
  return e?.name === 'PersoApiError' && (e.httpStatus === 401 || ['A0009', 'A0010', 'A0011'].includes(e.code ?? ''));
}
function friendlyError(e) {
  if (e?.name === 'MissingKeyError' || isAuthError(e)) {
    return 'API 키가 없거나 유효하지 않습니다(만료·오타 가능). 재등록 후 다시 시도하세요.\n\n' + onboardingHelp();
  }
  if (e?.name === 'PersoApiError') return '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  return e?.message ?? '알 수 없는 오류';
}

function parseArgs(argv) {
  const a = { source: 'auto', target: 'en', inputs: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--resume') a.resume = argv[++i];
    else if (t === '--source') a.source = argv[++i];
    else if (t === '--target') a.target = argv[++i];
    else if (t === '--space') a.space = Number(argv[++i]);
    else if (t === '--out') a.out = argv[++i];
    else if (t === '--recursive') a.recursive = true;
    else a.inputs.push(t); // 위치인자(여러 개): URL·경로·폴더 혼합 가능
  }
  return a;
}

const labelOf = (inp) => inp?.originalName ?? inp?.sourceUrl ?? '입력';
const refOf = (inp) => (inp.source === 'local'
  ? { source: 'local', localPath: inp.localPath, originalName: inp.originalName }
  : { source: inp.source, sourceUrl: inp.sourceUrl, originalName: inp.originalName ?? null });
// 미지원 형식 건너뜀 안내 문구(사유가 있으면 덧붙임).
const skipMsg = (name, e) => `지원하지 않아 건너뜁니다: ${name}${e?.cause?.message ? ` (${e.cause.message})` : ''}`;

// 저장 디렉터리(비휘발): 로컬 원본 옆, URL/외부/미상이면 현재 폴더.
function inputSaveDir(inp) {
  if (inp?.source === 'local' && inp.localPath) return dirname(inp.localPath);
  return process.cwd();
}

// 이어하기 상태파일 위치 — 영상 데이터는 저장하지 않고(가벼움) 비휘발 위치에 둔다(temp 청소에도 생존).
//   --out 있으면 그 옆/안, 없으면 단일 로컬 원본 옆, 그 외 현재 폴더.
function resumePath({ out, inputs, multiInput }) {
  if (out) return multiInput ? join(out, '.dubresume.json') : out + '.dubresume.json';
  const only = inputs.length === 1 ? inputs[0] : null;
  if (only?.source === 'local' && only.localPath) return only.localPath + '.dubresume.json';
  return join(process.cwd(), 'dubbing-resume.json');
}

// --out 단일입력: 다국어면 언어 접미사 추가(단일 언어는 그대로).
function explicitOutPath(argOut, target, multiLang) {
  return multiLang ? argOut.replace(/(\.[^.]+)?$/, `.${target}$1`) : argOut;
}

// 출력 파일명이 이미 쓰였으면 확장자 앞에 _2,_3… 접미사를 붙여 충돌을 피한다(used에 등록까지).
function uniqueName(fname, used) {
  if (!used.has(fname)) { used.add(fname); return fname; }
  const dot = fname.lastIndexOf('.');
  const stem = dot > 0 ? fname.slice(0, dot) : fname;
  const ext = dot > 0 ? fname.slice(dot) : '';
  let n = 2, cand;
  do { cand = `${stem}_${n}${ext}`; n++; } while (used.has(cand));
  used.add(cand);
  return cand;
}
// 디렉터리별 사용중 이름 집합(기존 파일 + 이번 런)을 추적해 충돌 회피.
function reserve(dir, name, usedByDir) {
  let s = usedByDir.get(dir);
  if (!s) { let init = []; try { init = readdirSync(dir); } catch { /* 새 폴더 */ } s = new Set(init); usedByDir.set(dir, s); }
  return uniqueName(name, s);
}

// (입력 × 언어) 한 묶음의 최종 저장 경로 결정 + (필요 시) 디렉터리 생성.
//  1) 단일 입력 + --out → 그 파일(다국어면 _언어, 출력 여럿이면 _2,_3…).  [사용자 명시 우선]
//  2) 분할 없는 단일 결과 + Perso 파일명 → Perso 이름 그대로(언어·시각 포함 → rename 불필요).
//  3) 그 외(분할 병합 등) → <원본명>.dubbed.<언어>.<ext> (여러 개면 _2,_3…).
//  저장 폴더: --out(다중입력이면 폴더) > 입력 원본 옆 > 현재 폴더.
function targetPaths(outputs, ctx) {
  const { inp, target, isSplit, multiInput, multiLang, out, usedByDir } = ctx;
  if (out && !multiInput) {
    const file = explicitOutPath(out, target, multiLang);
    mkdirSync(dirname(file), { recursive: true });
    return outputs.length === 1 ? [file] : outputs.map((_, i) => file.replace(/(\.[^.]+)?$/, `_${i + 1}$1`));
  }
  const dir = (out && multiInput) ? out : inputSaveDir(inp);
  mkdirSync(dir, { recursive: true });
  const names = [];
  if (!isSplit && outputs.length === 1 && outputs[0].name) {
    names.push(reserve(dir, basename(outputs[0].name), usedByDir)); // Perso명 그대로(시각 포함)
  } else {
    const ext = extname(outputs[0]?.name || outputs[0]?.path || '') || '.mp4';
    const stem = String(labelOf(inp)).replace(/\.[^.]+$/, '') || 'output';
    outputs.forEach((_, i) => {
      const base = `${stem}.dubbed.${target}${outputs.length > 1 ? `_${i + 1}` : ''}${ext}`;
      names.push(reserve(dir, base, usedByDir));
    });
  }
  return names.map((n) => join(dir, n));
}

// 청크 계획(경계) + (입력|조각|언어)별 완료 상태만 담은 가벼운 manifest(v4).
function buildManifest(ctx, perInput, results, prevDone = {}) {
  const done = { ...prevDone };
  for (const r of results) {
    const k = `${r.inputId}|${r.index}|${r.target}`;
    if (r.status === 'OK') done[k] = { status: 'OK', projectSeq: r.projectId };
    else if (r.status === 'PASSTHROUGH') done[k] = { status: 'PASSTHROUGH' };
    else if (r.status === 'DLFAIL') done[k] = { status: 'OK', projectSeq: r.projectId }; // 생성됨 → 재다운로드용 projectSeq 보존
  }
  return {
    version: 4, spaceSeq: ctx.spaceSeq, opts: { source: ctx.source }, targets: ctx.targets, out: ctx.out ?? null,
    inputs: perInput.map((p) => ({
      inputId: p.inputId, ref: p.ref,
      chunks: p.chunks.map((c) => ({
        index: c.index, source: c.source, sourceUrl: c.sourceUrl ?? null,
        startMs: c.startMs ?? null, endMs: c.endMs ?? null, title: c.title ?? null, kind: c.kind ?? null,
      })),
    })),
    done,
  };
}

// 남은(미처리) 청크 길이 합 → 분(올림). 경계 없는 청크만 있으면 null.
function remainingMinutes(chunks) {
  const ms = (chunks || []).reduce(
    (s, c) => s + (Number.isFinite(c?.startMs) && Number.isFinite(c?.endMs) ? c.endMs - c.startMs : 0),
    0,
  );
  return ms > 0 ? Math.ceil(ms / 60000) : null;
}

// 전역 풀 결과를 입력별·언어별로 묶어 병합·저장하고, 미완(크레딧/다운로드 실패)이면 manifest로 이어하기 보존.
//   ctx: { spaceSeq, source, targets, out, multiInput, sched, file, prevDone }
async function finishPool(allResults, perInput, ctx) {
  const usedByDir = new Map();
  const multiLang = ctx.targets.length > 1;
  let okCount = 0, failCount = 0;
  const lines = [];

  for (const pin of perInput) {
    const inRes = allResults.filter((r) => r.inputId === pin.inputId);
    const isSplit = pin.chunks.length > 1;
    for (const target of ctx.targets) {
      const tRes = inRes.filter((r) => r.target === target);
      if (!tRes.length) continue; // 전부 취소/결과 없음
      const mergeable = tRes.filter((r) => r.status === 'OK' || r.status === 'PASSTHROUGH').length;
      if (mergeable > 1) notify(`병합 시작 — ${labelOf(pin.inp)}${multiLang ? ` (${target})` : ''}`);
      const { outputs, report } = await mergeGroups(tRes);
      let saved = [];
      if (outputs.length) {
        const paths = targetPaths(outputs, { inp: pin.inp, target, isSplit, multiInput: ctx.multiInput, multiLang, out: ctx.out, usedByDir });
        outputs.forEach((o, i) => copyFileSync(o.path, paths[i]));
        await rm(dirname(outputs[0].path), { recursive: true, force: true }).catch(() => {}); // 병합 임시폴더 정리
        saved = paths;
      }
      const tlab = multiLang ? `${labelOf(pin.inp)} (${target})` : labelOf(pin.inp);
      if (saved.length) {
        lines.push(`완료: ${tlab} → ${saved.map((p) => basename(p)).join(', ')}${report ? ' (일부 구간 제외)' : ''}`);
        okCount++;
      } else {
        lines.push(`더빙하지 못했습니다: ${tlab} — ${report ?? '결과 없음'}`);
        failCount++;
      }
    }
  }
  if (lines.length) console.log(lines.join('\n'));
  if (perInput.length > 1 || multiLang) console.log(`\n요약: 완료 ${okCount} · 실패 ${failCount}`);

  // 또 멈췄거나(크레딧 부족) 다운로드만 실패한 게 남았으면 manifest 저장 → 이어하기.
  const dlPending = allResults.some((r) => r.status === 'DLFAIL');
  const stopped = !!ctx.sched?.stopped;
  if (stopped || dlPending) {
    if (ctx.multiInput && ctx.out) mkdirSync(ctx.out, { recursive: true });
    writeFileSync(ctx.file, JSON.stringify(buildManifest(ctx, perInput, allResults, ctx.prevDone ?? {})), 'utf8');
    if (stopped) {
      const plan = await getPlanStatus(ctx.spaceSeq);
      const min = remainingMinutes(ctx.sched.pendingLeft);
      console.log('\n' + messages.quotaExceeded({
        planTier: plan?.planTier,
        remainingQuota: plan?.remainingQuota,
        remainingNote: min != null ? `약 ${min}분` : null,
        resumeHint: `node scripts/dubbing.mjs --resume "${ctx.file}"`,
      }));
    } else {
      console.log(`\n일부 구간은 생성됐지만 내려받기에 실패했습니다(재더빙 아님). 이어하기로 재다운로드하세요:\n  node scripts/dubbing.mjs --resume "${ctx.file}"`);
    }
  } else {
    try { unlinkSync(ctx.file); } catch { /* 완료 → 이어하기 상태파일 정리(없으면 무시) */ }
  }
}

// 신규 실행: 모든 입력을 하나의 풀로 스케줄. 입력별 분할·업로드는 1번(mediaSeq 확보) → 언어마다 재사용.
async function runPool(args) {
  if (!resolveKey()) {
    console.error(onboardingHelp());
    process.exit(2);
  }
  const inputs = await expandInputs(args.inputs, { recursive: args.recursive });
  const spaceSeq = args.space ?? (await resolveSpace());
  const targets = String(args.target).split(',').map((t) => t.trim()).filter(Boolean); // --target en,ja,ko
  const multiInput = inputs.length > 1;

  // 입력별 분할·업로드 → 모든 조각을 inputId로 태깅해 하나의 풀로.
  const pool = [];
  const perInput = [];
  for (let id = 0; id < inputs.length; id++) {
    const inp = inputs[id];
    const tag = multiInput ? `[${id + 1}/${inputs.length}] ${labelOf(inp)}` : labelOf(inp);
    let chunks;
    try {
      ({ chunks } = await resolveChunks(inp, spaceSeq, { log, notify }));
    } catch (e) {
      if (isAuthError(e)) { console.log(`\n${friendlyError(e)}`); return; } // 키 문제는 전체 중단
      if (e?.name === 'UnsupportedMediaError') { notify(skipMsg(labelOf(inp), e)); continue; } // 미지원 → 건너뜀
      console.log(`${tag} — 분할/업로드 실패: ${friendlyError(e)}`); continue;
    }
    if (chunks.length > 1) notify(`분할 완료 — ${labelOf(inp)} (${chunks.length}조각)`);
    for (const c of chunks) pool.push({ ...c, inputId: id });
    perInput.push({ inputId: id, inp, ref: refOf(inp), chunks });
  }
  if (!pool.length) { notify('처리할 입력이 없습니다.'); return; }

  notify(`번역 시작${targets.length > 1 ? ` (${targets.join(', ')})` : ''}`);
  // 모든 입력×조각×언어를 한 큐로 채워 동시 처리. 빈 슬롯만큼 제출하고 5분 간격으로 추가.
  const sched = await runSchedule(pool, spaceSeq, { source: args.source, targets }, { log });

  const file = resumePath({ out: args.out, inputs, multiInput });
  await finishPool([...sched.results.values()], perInput, {
    spaceSeq, source: args.source, targets, out: args.out, multiInput, sched, file, prevDone: {},
  });
}

// 이어하기: 완료분(OK)은 projectSeq로 서버에서 재다운로드, 나머지(PASSTHROUGH/미처리)는 원본에서 재컷해 진행 → 병합.
async function runResume(file) {
  if (!resolveKey()) {
    console.error(onboardingHelp());
    process.exit(2);
  }
  const m = JSON.parse(readFileSync(file, 'utf8'));
  if (m.version !== 4) throw new Error('지원하지 않는 상태파일 형식입니다 — 원본으로 다시 실행하세요.');
  const targets = m.targets ?? [m.opts?.target ?? 'en'];
  const multiInput = (m.inputs?.length ?? 0) > 1;
  const outDir = await makeTempDir('dubbing-resume-');
  const matCache = new Map(); // `${inputId}|${index}` → 재컷 경로(조각당 1회, 언어 공유)

  const downloaded = [];
  const skip = new Set();
  const pool = [];
  const perInput = [];

  for (const pin of m.inputs) {
    const inputStr = pin.ref.source === 'local' ? pin.ref.localPath : pin.ref.sourceUrl;
    let prepared;
    try {
      prepared = await prepareInput(inputStr); // 로컬 재확인 / URL 재다운로드
    } catch (e) {
      console.log(`입력을 찾을 수 없어 건너뜁니다: ${pin.ref.originalName ?? inputStr} (${e.message})`);
      continue;
    }
    const inp = { ...prepared, originalName: prepared.originalName ?? pin.ref.originalName };
    const localPath = prepared.localPath ?? prepared.path ?? null;
    const materialize = async (c) => {
      if (c.source === 'external') return null; // external은 재컷 불가 → 그대로 재제출
      if (!localPath) throw new Error('원본을 찾을 수 없어 이어할 수 없습니다.');
      if (c.endMs == null) return localPath; // 통짜면 원본
      const mk = `${pin.inputId}|${c.index}`;
      if (!matCache.has(mk)) matCache.set(mk, await recutChunk(localPath, c.startMs, c.endMs));
      return matCache.get(mk);
    };

    // 완료분((inputId|index|target) OK/PASSTHROUGH)은 재다운로드/원본, 나머지는 재제출 대상(skip에서 제외).
    for (const c of pin.chunks) {
      for (const target of targets) {
        const k = `${pin.inputId}|${c.index}|${target}`;
        const d = m.done?.[k];
        if (d?.status === 'OK') {
          const out = join(outDir, `dub_${pin.inputId}_${String(c.index).padStart(3, '0')}_${target}.mp4`);
          try {
            const dl = await download(d.projectSeq, m.spaceSeq, { kind: c.kind, outPath: out });
            downloaded.push({ inputId: pin.inputId, index: c.index, target, status: 'OK', path: out, projectId: d.projectSeq, name: dl.fileName });
            log(`[입력 ${pin.inputId + 1}] 구간 ${c.index + 1}(${target}) 재다운로드`);
          } catch {
            downloaded.push({ inputId: pin.inputId, index: c.index, target, status: 'DLFAIL', projectId: d.projectSeq, reason: 'download_failed' });
            log(`[입력 ${pin.inputId + 1}] 구간 ${c.index + 1}(${target}) 재다운로드 실패 — 재더빙 안 함`);
          }
          skip.add(k);
        } else if (d?.status === 'PASSTHROUGH') {
          downloaded.push({ inputId: pin.inputId, index: c.index, target, status: 'PASSTHROUGH', path: await materialize(c) });
          skip.add(k);
        }
      }
    }

    // 미완 언어가 하나라도 있는 조각만 재컷해 풀에 추가(언어는 skip으로 걸러짐).
    for (const c of pin.chunks) {
      if (!targets.some((t) => !skip.has(`${pin.inputId}|${c.index}|${t}`))) continue;
      if (c.source === 'external') pool.push({ inputId: pin.inputId, index: c.index, source: 'external', sourceUrl: c.sourceUrl, kind: c.kind });
      else {
        const path = await materialize(c);
        pool.push({ inputId: pin.inputId, index: c.index, source: 'local', path, startMs: c.startMs, endMs: c.endMs, originalName: basename(path), title: c.title, kind: c.kind });
      }
    }
    perInput.push({ inputId: pin.inputId, inp, ref: pin.ref, chunks: pin.chunks });
  }

  if (pool.length) notify('번역 시작 (이어하기)');
  const sched = pool.length
    ? await runSchedule(pool, m.spaceSeq, { source: m.opts?.source ?? 'auto', targets, done: skip }, { log })
    : { results: new Map(), stopped: false, pendingLeft: [] };

  await finishPool([...downloaded, ...sched.results.values()], perInput, {
    spaceSeq: m.spaceSeq, source: m.opts?.source ?? 'auto', targets, out: m.out, multiInput, sched, file, prevDone: m.done ?? {},
  });
}

// 테스트용 순수 헬퍼 export(직접 실행 시에는 아래 main만 동작).
export { parseArgs, targetPaths, buildManifest, finishPool, refOf, resumePath, explicitOutPath, remainingMinutes };

async function main() {
  let exitCode = 0;
  try {
    preloadKeyEnv(); // async 이전(깨끗한 시점)에 키를 env로 선주입 → 메인 프로세스의 powershell 동기호출/크래시 회피
    const args = parseArgs(process.argv.slice(2));
    if (args.resume) await runResume(args.resume);
    else if (!args.inputs.length) {
      console.error('사용법: node scripts/dubbing.mjs "<파일|폴더|URL>" ["<또 다른 입력>" ...] [--source auto] [--target en,ja] [--space N] [--out 경로|폴더] [--recursive]');
      exitCode = 1;
    } else await runPool(args);
  } catch (e) {
    console.error(friendlyError(e));
    exitCode = 1;
  } finally {
    await cleanupTempDirs(); // 자르기/스케줄/병합/다운로드 임시폴더 일괄 정리
  }
  process.exit(exitCode);
}

// 직접 실행(CLI)일 때만 main. import(테스트)될 때는 헬퍼만 노출하고 실행 안 함.
const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invoked) await main();
