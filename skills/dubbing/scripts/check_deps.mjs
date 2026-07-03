#!/usr/bin/env node
// Check ffmpeg/ffprobe. If missing, attempt auto-install without prompting (the OS asks for approval if elevation is needed).
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

/** Returns true if both ffmpeg and ffprobe are present. Otherwise auto-installs and re-checks. Throws if not possible. */
export function ensureFfmpeg() {
  if (has('ffmpeg') && has('ffprobe')) return true;

  const cmd = installCmd();
  if (!cmd) {
    throw new Error('ffmpeg/ffprobe not found and no auto-installable package manager available — https://ffmpeg.org/download.html');
  }
  const [bin, args] = cmd;
  const r = spawnSync(bin, args, { stdio: 'inherit' }); // the OS prompts if elevation is needed
  if (r.status !== 0) throw new Error('ffmpeg auto-install failed');

  if (!(has('ffmpeg') && has('ffprobe'))) {
    throw new Error('ffmpeg/ffprobe still not found after install. Check your PATH.');
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
