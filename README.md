# 🎬 /dubbing — Perso Dubbing Video Translation

[![Powered by Perso Dubbing](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**English** ｜ [한국어](docs/ko/README.md) ｜ [Español](docs/es/README.md) ｜ [Português](docs/pt/README.md) ｜ [Русский](docs/ru/README.md) ｜ [Bahasa Indonesia](docs/id/README.md) ｜ [Deutsch](docs/de/README.md) ｜ [ไทย](docs/th/README.md) ｜ [日本語](docs/ja/README.md) ｜ [繁體中文](docs/zh-TW/README.md) ｜ [简体中文](docs/zh-CN/README.md) ｜ [Tiếng Việt](docs/vi/README.md) ｜ [Français](docs/fr/README.md)

A coding-agent skill that brings [Perso Dubbing](https://perso.ai/dubbing)'s **Dubbing (AI dubbing)** to your agent. It **auto-dubs** videos into other languages — a single file or a whole folder, and even oversized or very long media is automatically split, processed, and merged back together. It can also **lip-sync** the dubbed video and **separate voice from background audio**.

The package also ships **`/srt`** — a second skill that extracts **SRT subtitles** from a video/audio/URL via Perso's speech-to-text, then has your agent translate them into any languages you ask for (or hands you the original-language transcript as-is).

It calls the Perso Dubbing API under the hood, so **a Perso Dubbing API key is required** (one key covers both skills). → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Get an API key</a>

Because every host uses the same **Agent Skills standard** (`SKILL.md`), it works identically wherever you install it — just run `/dubbing` or say *"dub this video for me"* (or `/srt` — *"make me an English SRT for this video"*).

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## 🖥️ Easiest way — the Claude desktop app (about 3 minutes)

> 📖 **Prefer a visual walkthrough?** Follow the **[install tutorial →](https://dubbing-plugin.perso.ai/en/)** — pick your agent and copy the commands.

No terminal needed. In the <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude desktop app</a> (paid plan):

1. **Open the Code tab** (top center) and pick any folder — choose the **Local** environment (plugins are not available in cloud sessions).
2. **Paste each command** into the prompt box and press Enter, one at a time:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Prefer clicking? After the first command, press the **+** button next to the prompt box → **Plugins** → **Add plugin** → install **perso-dubbing**.*
3. **Ask for a dub** — e.g. *"Dub this video into English — C:\videos\clip.mp4"* (a YouTube URL or a whole folder works too). On the first run a key file opens for your <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Perso API key</a> — paste the key into that file, **not into the chat**. Unless you pass `--out`, results are saved next to the source video.

> 💡 The skill itself runs on **Node.js 18+**. If your PC doesn't have it, the agent will say `node` was not found — just reply *"install Node.js for me"* (or grab the LTS from <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>), then try again.

In the **Claude Code CLI**, use `/plugin marketplace add perso-ai/perso-dubbing-plugin` and `/plugin install perso-dubbing@perso-ai` instead.

---

## Install on other hosts

The shortcut that works everywhere: paste this repository's URL into your agent and say *"install this."*

> **🤖 To the agent:** If you were given only this repository's URL, pick the path for your host:
>
> - **Claude Code (desktop app or CLI):** do **not** run npx right away — even if the user said "install this". Show the user the two commands from the *Claude desktop app* section above and ask them to type the commands themselves, one per message (they are user-typed slash commands you cannot execute). Also mention the desktop-app click path: after the first command, **+ button → Plugins → Add plugin**. If you need to tailor the wording, `CLAUDE_CODE_ENTRYPOINT=cli` in your shell env suggests a terminal session (undocumented signal — when unsure, present both paths). Fall back to npx only if the user still wants you to handle the install after seeing them.
> - **Codex · Cursor · Antigravity, or the user delegated the install to you:** run this single command — it fetches the package, auto-detects every installed host, and installs the skill into each:
>
> ```bash
> npx perso-dubbing
> ```
>
> If the repo is already cloned, run `node scripts/install.mjs` from the repo root instead (no network needed).

<details>
<summary><b>Codex</b></summary>

Codex reads skills from the shared Agent Skills folder. Run `npx perso-dubbing --codex`, or copy manually:

```text
~/.agents/skills/dubbing/        # personal (all repos) — current Codex
~/.codex/skills/dubbing/         # older Codex versions (the installer writes both)
<repo>/.agents/skills/dubbing/   # this repository only
```

The repo also ships a Codex plugin manifest (`.codex-plugin/plugin.json`) for marketplace-based installs.

</details>

<details>
<summary><b>Cursor</b></summary>

Run `npx perso-dubbing --cursor`, or copy into:

```text
~/.cursor/skills/dubbing/        # global
.cursor/skills/dubbing/          # this project only
```

The repo ships a Cursor plugin manifest (`.cursor-plugin/plugin.json`) for the Cursor plugin marketplace.

</details>

<details>
<summary><b>Antigravity</b></summary>

Run `npx perso-dubbing --antigravity`, or copy into either location:

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+ (shared Agent Skills folder)
```

</details>

<details>
<summary><b>⚡ One-line installer (any host)</b></summary>

Detects which hosts you use and installs to all of them — no clone needed:

```bash
npx perso-dubbing
```

- Specific host only: `--claude` / `--antigravity` / `--codex` / `--cursor` · all: `--all`
- Current project only (`./.claude`, `./.agents`, …): `--project`

Already have the repo cloned? `node scripts/install.mjs` from the repo root does the same without any network.

</details>

<details>
<summary><b>🔧 Manual install</b></summary>

Copy **both** skill folders into your host's skills directory, side by side (the `srt` skill imports the `dubbing` skill's libraries from the sibling folder). From the repo root:

```bash
# macOS / Linux
mkdir -p <skills_folder> && cp -r skills/dubbing skills/srt <skills_folder>/
```

> 💡 Windows (PowerShell): `New-Item -ItemType Directory -Force <skills_folder>; Copy-Item .\skills\dubbing,.\skills\srt <skills_folder>\ -Recurse`

</details>

After installing, type **`/dubbing`** in your agent or just say **"dub this video for me"** to run it — or **`/srt`** / **"make me an English SRT for this video"** for subtitles. (Every install method above installs both skills.)

---

## Examples

The easiest way — just tell your agent:

> "Dub this video into English — C:\videos\clip.mp4"

You can also run the CLI directly from the repo root:

```bash
# One video (auto-detect source → English)
npm run dub -- "clip.mp4" --target en --out result.mp4

# Several languages at once (uploaded/split once, reused per language)
npm run dub -- "clip.mp4" --target en,ja,zh

# Several inputs at once (URLs, files, and folders can be mixed)
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# Dub + lip-sync (mouth matched to the dubbed audio; extra credits)
npm run dub -- "clip.mp4" --target en --lipsync

# Separate voice / background audio tracks (no dubbing)
npm run dub -- "clip.mp4" --separate

# Extract subtitles and have the agent translate them (/srt skill)
npm run srt -- "clip.mp4" --target en,ja

# Transcript only — original-language SRT, no translation
npm run srt -- "clip.mp4" --transcribe-only
```

*(Equivalent direct call: `node skills/dubbing/scripts/dubbing.mjs …` — or `node scripts/dubbing.mjs …` from inside an installed skill folder.)*

---

## Troubleshooting

More questions? See the **[FAQ](FAQ.md)**.

| Symptom | Fix |
|---|---|
| Claude desktop app asks for Git (Windows) | The Code tab needs <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a> on first use. Install it, then restart the app. |
| `claude` commands or the Plugins menu do nothing | You are in a **cloud session** — plugins only work in **Local** (and SSH) sessions. Switch the environment to Local and retry. |
| `node` not found / install or run fails | The skill runs on **Node.js 18+** — check with `node -v`. If missing, install the LTS from <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>, or simply ask Claude in the session to install it for you, then restart the app. |
| No API key yet | Just run any dubbing command — a key file opens automatically; paste your key and save (it's encrypted and the file is deleted). Manual check: `npm run key:check`. **Do not paste the key into the chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Get an API key</a> |
| ffmpeg-related error | ffmpeg is normally installed automatically. If it fails, run `npm run doctor`. |
| Stops midway (out of credits, crash, killed process) | Progress is saved to a state file throughout the run (`*.dubresume.json` for `/dubbing`, `*.srtresume.json` for `/srt`). Run the **`--resume "<state-file>"`** command shown in the notice to finish only the remaining parts (completed parts are skipped automatically). |

---

## Privacy & Telemetry

`/dubbing` and `/srt` send **anonymous** usage events to improve the skills — for example, which action ran (dub / lip-sync / separate / subtitle extraction), whether it succeeded, the language pair, media length, app version, and OS. They are tagged only with a random per-install ID and never include your API key, file names or media content, account/email, or workspace IDs. Opt out anytime with the `PERSO_NO_TELEMETRY` environment variable.

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

This skill's code is distributed under the **[MIT License](LICENSE)**. The actual dubbing is performed through the Perso Dubbing API, so API usage itself is subject to the [Perso AI Terms of Service](https://perso.ai) and pricing.
