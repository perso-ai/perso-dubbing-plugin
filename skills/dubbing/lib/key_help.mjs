// User-facing setup guidance only. This module does not read or transmit credentials.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CRED_DIR } from './config.mjs';

/** Registration guidance when no key is present. The browser flow (connect.mjs) needs no copy/paste;
 *  the file-based paths remain for headless/SSH environments where a local browser can't open. */
export function onboardingHelp() {
  const self = fileURLToPath(new URL('../scripts/resolve_key.mjs', import.meta.url)).replace(/\\/g, '/'); // forward-slash path, shell-agnostic
  const connect = join(dirname(self), 'connect.mjs').replace(/\\/g, '/');
  const example = join(dirname(CRED_DIR), 'perso_key.txt').replace(/\\/g, '/');
  return [
    'No API key found. Do not paste the key into the chat — register it as below:',
    '',
    `  Recommended) Run:  ! node "${connect}"`,
    '     → Opens the Perso portal in your browser: sign in and click once — the key is issued',
    '       and delivered straight to this machine (nothing to copy).',
    '       Storage: Windows DPAPI on Windows; a restricted plaintext file on macOS/Linux.',
    '',
    `  File-based) Run:  ! node "${self}" --watch   (headless/SSH, or if the browser flow fails)`,
    '     → Creates the key file and opens it in your editor automatically.',
    '       Paste just the key and save. It is registered with the platform protection above;',
    '       the input file is auto-deleted after successful registration.',
    '',
    '  Manual) If you would rather create the file yourself:',
    `     1) Create a text file containing just the key on one line.  e.g. ${example}`,
    `     2) Run:  ! node "${self}" --import "${example}"`,
    '        → The key is registered with the platform protection above; the input file is auto-deleted.',
    '',
    'Get an API key: https://developers.perso.ai/api-keys',
  ].join('\n');
}

/** Registration guidance for a machine with no browser of its own (headless box / SSH session). The
 *  browser flow is unusable there — its page hands the key to a 127.0.0.1 listener, so it must run on the
 *  same machine — leaving the watched key file and the cross-machine --import route. */
export function headlessKeyHelp() {
  const self = fileURLToPath(new URL('../scripts/resolve_key.mjs', import.meta.url)).replace(/\\/g, '/');
  const example = join(dirname(CRED_DIR), 'perso_key.txt').replace(/\\/g, '/');
  return [
    'No API key registered, and this machine has no browser to sign in with (headless/SSH).',
    'The browser sign-in page delivers the key to a local 127.0.0.1 listener, so it only works on a machine with its own browser — register one of these two ways instead:',
    `  A) Paste the key into the key file that opens next (${example}) and save it — it registers automatically.`,
    '  B) From any machine with a browser: create a key at https://developers.perso.ai/api-keys, copy it into a text file on THIS machine, then run:',
    `       ! node "${self}" --import "<that file>"`,
  ].join('\n');
}

