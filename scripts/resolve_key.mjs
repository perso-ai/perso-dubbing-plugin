#!/usr/bin/env node
// API 키 해석 (env override → 로컬 파일 → 온보딩 안내).
// 키 원문은 절대 stdout으로 출력하지 않는다. CLI(--check)는 마스킹된 상태만 보여준다.
import { readFileSync, writeFileSync, unlinkSync, existsSync, realpathSync, mkdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CRED_DIR, CRED_FILE } from '../lib/config.mjs';
import { maskKey } from '../lib/mask.mjs';

const isWindows = process.platform === 'win32';

// Windows: ConvertFrom-SecureString으로 저장된 DPAPI 암호문을 현재 계정에서 복호화.
function decryptDpapi(enc) {
  const ps =
    '$ErrorActionPreference="Stop";' +
    `$sec = ConvertTo-SecureString ${JSON.stringify(enc.trim())};` +
    '$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec);' +
    'try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }' +
    'finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }';
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore'], // 명시적 stdio — 백그라운드/비콘솔에서 libuv 핸들 충돌 완화
  }).replace(/\r?\n$/, '');
}

/** 키를 in-process로 반환한다(출력 금지). 없으면 null.
 *  해석된 키는 프로세스 1회만 캐시한다 — Windows DPAPI 복호화(powershell 실행)가
 *  요청·폴링마다 반복되지 않게(이벤트 루프 블로킹 방지). 키 없음(null)은 캐시하지 않는다. */
let _cachedKey = null;
export function resolveKey() {
  if (_cachedKey) return _cachedKey;
  if (process.env.XP_API_KEY) return (_cachedKey = process.env.XP_API_KEY.trim());
  if (existsSync(CRED_FILE)) {
    const raw = readFileSync(CRED_FILE, 'utf8').trim();
    if (!raw) return null;
    if (!isWindows) return (_cachedKey = raw);
    try { return (_cachedKey = decryptDpapi(raw)); }
    catch { return null; } // 손상된 자격증명(빈 값/깨짐) → '없음'으로 간주(재등록 유도), 크래시 방지
  }
  return null;
}

/**
 * 긴 프로세스(dubbing/resume)용 키 선주입. 시작 시점(async 이전)에 **깨끗한 자식 프로세스**로
 * DPAPI 복호화를 끝내 XP_API_KEY env로 넘긴다. 이렇게 하면 메인 프로세스가 직접 powershell.exe를
 * 동기 호출하다 Windows Node libuv(async.c) 크래시 나는 것을 회피한다. 키는 파이프로만 전달(출력 없음).
 * 실패해도 무시 — 기존 경로(resolveKey가 직접 복호)로 폴백.
 */
export function preloadKeyEnv() {
  if (process.env.XP_API_KEY) return;     // 이미 env에 있으면 불필요
  if (!isWindows) return;                 // 비Windows는 평문 파일 직접 읽음(powershell 미사용)
  if (!existsSync(CRED_FILE)) return;      // 키 없으면 게이트가 처리
  try {
    const self = fileURLToPath(import.meta.url);
    const key = execFileSync(process.execPath, [self, '--export'], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, PERSO_KEY_EXPORT: '1' }, // 내부 호출 표식
    }).replace(/\r?\n$/, '');
    if (key) process.env.XP_API_KEY = key;
  } catch { /* 폴백: resolveKey가 직접 복호 */ }
}

/** 키가 없을 때 등록 안내. 대화형 입력(Read-Host)은 TTY 없는 에이전트 환경에서 빈 값이 되므로 파일 기반(--import)을 우선 안내. */
export function onboardingHelp() {
  const self = fileURLToPath(import.meta.url).replace(/\\/g, '/'); // 셸 무관하게 슬래시 경로
  const example = join(dirname(CRED_DIR), 'perso_key.txt').replace(/\\/g, '/');
  return [
    'API 키가 없습니다. 키를 채팅에 붙여넣지 말고 아래로 등록하세요:',
    '',
    `  1) 키만 한 줄 담긴 텍스트 파일을 만드세요.  예: ${example}`,
    `  2) 실행:  ! node "${self}" --import "${example}"`,
    '     → 키를 암호화 저장하고, 그 키 파일은 자동 삭제합니다.',
    '',
    `  (실제 터미널 창을 직접 열었다면 대화형 입력도 가능: node "${self}" --set)`,
    '',
    '키 발급: https://developers.perso.ai/',
  ].join('\n');
}

/** 알려진 키 문자열을 디렉터리 보장→암호화(Windows DPAPI)→ascii 저장→읽어서 확인. 키는 stdin으로만 전달(명령행 노출 방지). */
function storeKey(key) {
  const k = (key ?? '').trim();
  if (!k) { console.error('❌ 키가 비어 있습니다.'); process.exit(1); }
  mkdirSync(CRED_DIR, { recursive: true });
  if (isWindows) {
    const lit = `'${CRED_FILE.replace(/'/g, "''")}'`;
    const ps =
      '$ErrorActionPreference="Stop";' +
      '$k = ([Console]::In.ReadToEnd()).Trim();' +
      'if ($k.Length -lt 1) { throw "empty" };' +
      `($k | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString) | Set-Content -Encoding ascii ${lit}`;
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { input: k });
  } else {
    writeFileSync(CRED_FILE, k, { mode: 0o600 });
  }
  _cachedKey = null;
  const back = resolveKey();
  if (!back) { console.error('❌ 등록 확인 실패. 다시 시도하세요.'); process.exit(1); }
  console.log(`✅ 키 등록 완료: ${maskKey(back)}`);
}

/** 파일에 담긴 키로 등록 — 대화형 입력 불필요라 TTY 없는 환경/에이전트에서도 동작. 등록 후 원본 파일 삭제. */
export function importKey(srcPath) {
  let key;
  try { key = readFileSync(srcPath, 'utf8'); }
  catch { console.error(`❌ 키 파일을 읽지 못했습니다: ${srcPath}`); process.exit(1); }
  storeKey(key);
  try { unlinkSync(srcPath); console.log('   (원본 키 파일 삭제됨)'); } catch { /* 삭제 실패는 무시 */ }
}

/** 대화형 키 등록 — 실제 터미널(TTY)에서만. TTY가 없으면 빈 값이 저장되므로 --import로 유도. */
export function setKey() {
  if (!process.stdin.isTTY) {
    const self = fileURLToPath(import.meta.url).replace(/\\/g, '/');
    const example = join(dirname(CRED_DIR), 'perso_key.txt').replace(/\\/g, '/');
    console.error([
      '이 환경은 대화형 입력(Read-Host/read)을 지원하지 않아 키가 빈 값으로 저장됩니다.',
      '대신 키 파일로 등록하세요:',
      `  1) 키만 한 줄 담긴 파일 생성  예: ${example}`,
      `  2) node "${self}" --import "${example}"`,
    ].join('\n'));
    process.exit(1);
  }
  mkdirSync(CRED_DIR, { recursive: true });
  try {
    if (isWindows) {
      const lit = `'${CRED_FILE.replace(/'/g, "''")}'`;
      const ps =
        '$ErrorActionPreference="Stop";' +
        "$s = Read-Host 'Perso API Key' -AsSecureString;" +
        "if ($s.Length -lt 1) { throw 'empty' };" +
        `($s | ConvertFrom-SecureString) | Set-Content -Encoding ascii ${lit}`;
      execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
    } else {
      const lit = `'${CRED_FILE.replace(/'/g, "'\\''")}'`;
      const sh = `umask 177; printf 'Perso API Key: '; IFS= read -rs k; [ -n "$k" ] || { echo; exit 1; }; printf '%s' "$k" > ${lit}; echo`;
      execFileSync('/bin/sh', ['-c', sh], { stdio: 'inherit' });
    }
  } catch {
    console.error('\n❌ 키 입력이 비었거나 저장에 실패했습니다. 다시 실행하세요.');
    process.exit(1);
  }
  _cachedKey = null;
  const back = resolveKey();
  if (back) console.log(`✅ 키 등록 완료: ${maskKey(back)}`);
  else { console.error('❌ 등록 파일을 읽지 못했습니다. 다시 시도하세요.'); process.exit(1); }
}

/** 기본 키 입력 파일 경로(홈 디렉터리 옆). */
export function keyFilePath() {
  return join(dirname(CRED_DIR), 'perso_key.txt');
}

/** OS 기본 편집기로 파일 열기(베스트에포트). PERSO_NO_OPEN 설정 시 건너뜀(헤드리스/자동화 대비). */
function openInEditor(path) {
  if (process.env.PERSO_NO_OPEN) return;
  try {
    const [bin, args] =
      isWindows ? ['notepad.exe', [path]] :
      process.platform === 'darwin' ? ['open', ['-t', path]] :
      ['xdg-open', [path]];
    spawn(bin, args, { detached: true, stdio: 'ignore' }).unref();
  } catch { /* 자동 열기 실패는 무시 — 경로를 직접 열면 됨 */ }
}

/** 빈 키 파일을 만들고 감시 — 사용자가 키를 붙여넣어 저장하면 자동 감지→암호화 저장→파일 삭제. TTY 불필요. */
export function watchKey(file) {
  const path = file || keyFilePath();
  if (!existsSync(path)) writeFileSync(path, '');
  openInEditor(path); // OS 기본 편집기로 자동 열기(메모장 등)
  console.log('편집기가 열립니다. API 키만 붙여넣고 저장(Ctrl+S / Cmd+S)하면 자동 등록됩니다.');
  console.log(`(안 열리면 이 파일을 직접 여세요): ${path}`);
  const start = Date.now();
  const TIMEOUT_MS = 10 * 60 * 1000;
  const tick = () => {
    let content = '';
    try { content = readFileSync(path, 'utf8').trim(); } catch { /* 잠금/일시오류 → 다음 틱 */ }
    if (content) {
      storeKey(content); // 실시간 암호화 저장 + 확인(✅ 출력)
      try { unlinkSync(path); console.log('   (키 파일 자동 삭제됨)'); } catch { /* 무시 */ }
      process.exit(0);
    }
    if (Date.now() - start > TIMEOUT_MS) {
      console.error('시간 초과 — 키 입력이 감지되지 않았습니다. 다시 시도하세요.');
      process.exit(1);
    }
    setTimeout(tick, 500);
  };
  setTimeout(tick, 500);
}

// CLI: `--watch [파일]` 자동감지 등록(권장) / `--import <파일>` / `--set` 대화형 / `--check`(기본) 확인
const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv[0] === '--export') {
    // 내부 전용: preloadKeyEnv가 파이프로 캡처할 때만 키를 출력(우발적 채팅 노출 방지)
    if (process.env.PERSO_KEY_EXPORT !== '1') { console.error('--export는 내부 전용입니다.'); process.exit(1); }
    const key = resolveKey();
    if (key) process.stdout.write(key);
    process.exit(key ? 0 : 2);
  } else if (argv[0] === '--watch') {
    watchKey(argv[1]);
  } else if (argv[0] === '--import') {
    if (!argv[1]) { console.error('사용법: --import "<키파일 경로>"'); process.exit(1); }
    importKey(argv[1]);
  } else if (argv.includes('--set')) {
    setKey();
  } else {
    const key = resolveKey();
    if (!key) {
      console.error(onboardingHelp());
      process.exit(2);
    }
    console.log(`키 확인됨: ${maskKey(key)}`);
  }
}
