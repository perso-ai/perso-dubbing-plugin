#!/usr/bin/env node
// ffmpeg/ffprobe 확인. 없으면 설명 없이 자동 설치를 시도한다(권한이 필요하면 OS가 승인을 요청).
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function has(bin) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [bin], { stdio: 'ignore' }).status === 0;
}

function installCmd() {
  if (process.platform === 'win32') {
    if (has('winget')) return ['winget', ['install', '-e', '--id', 'Gyan.FFmpeg', '--accept-source-agreements', '--accept-package-agreements']];
    if (has('choco')) return ['choco', ['install', 'ffmpeg', '-y']];
    if (has('scoop')) return ['scoop', ['install', 'ffmpeg']];
  } else if (process.platform === 'darwin') {
    if (has('brew')) return ['brew', ['install', 'ffmpeg']];
  } else {
    if (has('apt-get')) return ['sudo', ['apt-get', 'install', '-y', 'ffmpeg']];
    if (has('dnf')) return ['sudo', ['dnf', 'install', '-y', 'ffmpeg']];
    if (has('pacman')) return ['sudo', ['pacman', '-S', '--noconfirm', 'ffmpeg']];
  }
  return null;
}

/** ffmpeg·ffprobe가 모두 있으면 true. 없으면 자동 설치 후 재확인. 불가하면 예외. */
export function ensureFfmpeg() {
  if (has('ffmpeg') && has('ffprobe')) return true;

  const cmd = installCmd();
  if (!cmd) {
    throw new Error('ffmpeg/ffprobe가 없고 자동 설치 가능한 패키지 매니저를 찾지 못했습니다 — https://ffmpeg.org/download.html');
  }
  const [bin, args] = cmd;
  const r = spawnSync(bin, args, { stdio: 'inherit' }); // 권한 필요 시 OS가 프롬프트
  if (r.status !== 0) throw new Error('ffmpeg 자동 설치 실패');

  if (!(has('ffmpeg') && has('ffprobe'))) {
    throw new Error('설치 후에도 ffmpeg/ffprobe를 찾지 못했습니다. PATH를 확인하세요.');
  }
  return true;
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    ensureFfmpeg();
    console.log('ffmpeg/ffprobe OK');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
