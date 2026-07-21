# 🎬 /dubbing — Perso Dubbing Video Translation

[![Powered by Perso Dubbing](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**English** ｜ [한국어](docs/ko/README.md) ｜ [Español](docs/es/README.md) ｜ [Português](docs/pt/README.md) ｜ [Русский](docs/ru/README.md) ｜ [Bahasa Indonesia](docs/id/README.md) ｜ [Deutsch](docs/de/README.md) ｜ [ไทย](docs/th/README.md) ｜ [日本語](docs/ja/README.md) ｜ [繁體中文](docs/zh-TW/README.md) ｜ [简体中文](docs/zh-CN/README.md) ｜ [Tiếng Việt](docs/vi/README.md) ｜ [Français](docs/fr/README.md)

A coding-agent skill that brings [Perso Dubbing](https://perso.ai/dubbing)'s AI dubbing to your agent. Install it once, then just say *"dub this video into English"*.

- **Dub** into another language — a single file, a whole folder, or a URL
- **Lip-sync** the dubbed video so the mouth matches the new audio
- **Separate** voice from background audio
- **Subtitles** (`/srt`) — extract an SRT via speech-to-text, then your agent translates it
- Oversized and very long media is split, processed, and merged back automatically

Runs on **Node.js 18+** and needs a **Perso Dubbing API key**. Built on the Agent Skills standard (`SKILL.md`), so it behaves identically on Claude, Codex, Cursor, and Antigravity.

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## Install

> 📖 **[Visual walkthrough →](https://dubbing-plugin.perso.ai/en/)** — pick your agent and copy the commands.

### Claude desktop app — easiest, no terminal (~3 min)

In the <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude desktop app</a> (paid plan):

1. Open the **Code tab** (top center), pick any folder, and choose the **Local** environment — plugins don't work in cloud sessions.
2. Paste each command into the prompt box and press Enter, one at a time:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Prefer clicking? After the first command: **+** button → **Plugins** → **Add plugin** → **perso-dubbing**.*
3. Ask for a dub — *"Dub this video into English — C:\videos\clip.mp4"*. A YouTube URL or a folder works too. Results are saved next to the source video unless you pass `--out`.

**Claude Code CLI:** use `/plugin marketplace add perso-ai/perso-dubbing-plugin` and `/plugin install perso-dubbing@perso-ai` instead.

### Every other host

```bash
npx perso-dubbing
```

Detects which hosts you have and installs both skills into each, printing where each one landed. Add `--claude` / `--codex` / `--cursor` / `--antigravity` for one host, `--all` for every host, or `--project` for the current project only. Already cloned the repo? `node scripts/install.mjs` from the repo root does the same, offline.

> **🤖 To the agent:** if you were handed only this repository's URL:
>
> - **Claude Code (desktop or CLI)** — do **not** run npx, even if the user said "install this". Show them the two `claude …` commands above and ask them to type each one themselves (they're user-typed slash commands you cannot execute), plus the click path: **+** button → **Plugins** → **Add plugin**. Use npx only if they still want you to handle it afterwards.
> - **Codex · Cursor · Antigravity, or the user delegated the install** — run `npx perso-dubbing` (or `node scripts/install.mjs` if the repo is already cloned).

### First run — your API key

A browser page opens: sign in and click once, and your key is issued and stored on this machine, encrypted. Nothing to copy. If no browser can open, a key file opens instead — paste the key there and save, and the file is encrypted and deleted.

**Never paste your API key into the chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Get an API key</a> · verify anytime with `npm run key:check`

---

## Usage

Just tell your agent what you want:

> "Dub this video into English — C:\videos\clip.mp4"
>
> "Dub every video in this folder into Japanese and Spanish"
>
> "Dub this YouTube link into English, with lip-sync"
>
> "Split the voice and background music out of this clip"
>
> "Make me an English SRT for this video"

Or type **`/dubbing`** / **`/srt`** to start. For the full list of CLI options, ask your agent for the usage or run `npm run dub -- --help`.

---

## Troubleshooting

More questions? See the **[FAQ](FAQ.md)**.

| Symptom | Fix |
|---|---|
| `node` not found | Install the LTS from <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> (or ask your agent *"install Node.js for me"*), then retry. |
| Claude desktop app asks for Git (Windows) | The Code tab needs <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a> on first use. Install it and restart the app. |
| `claude` commands or the Plugins menu do nothing | You're in a **cloud session** — plugins need a **Local** (or SSH) session. |
| Key rejected or missing | Register again: `node skills/dubbing/scripts/connect.mjs`. Check the stored key with `npm run key:check`. |
| ffmpeg error | ffmpeg normally installs itself; if it fails, run `npm run doctor`. |
| Stopped midway (out of credits, crash, killed process) | Progress is saved continuously. Run the **`--resume "<state-file>"`** command shown in the notice — finished parts are skipped and never re-billed. |

---

## Privacy & Telemetry

`/dubbing` and `/srt` send usage events to improve the skills — for example, which action ran, whether it succeeded, media length, app version, and OS. Each event carries a random per-install ID and your workspace number. Your API key and your media are never included. Opt out anytime with `PERSO_NO_TELEMETRY`.

---

## Repository layout

```text
.claude-plugin/    Claude Code plugin + marketplace manifests
.codex-plugin/     Codex plugin manifest
.cursor-plugin/    Cursor plugin manifest
docs/              GitHub Pages landing + translated README · FAQ (12 languages)
skills/dubbing/    The dubbing skill (SKILL.md · lib/ · scripts/) — self-contained
skills/srt/        The SRT subtitle skill (SKILL.md · scripts/) — uses the dubbing skill's lib/
scripts/           Repo-level installer (install.mjs)
```

## License

The skill code is **[MIT](LICENSE)**. Dubbing itself runs through the Perso Dubbing API, so API usage is subject to the [Perso AI Terms of Service](https://perso.ai) and pricing.
