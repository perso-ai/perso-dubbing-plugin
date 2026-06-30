# 🎬 /dubbing — Perso AI Video Auto-Dubbing

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20Code%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A coding-agent skill that brings [Perso AI](https://perso.ai)'s **Dubbing (AI dubbing)** to your agent. It **auto-dubs** videos into other languages — a single file or a whole folder, and even oversized or very long media is automatically split, processed, and merged back together.

It calls the Perso Dubbing API under the hood, so **a Perso Dubbing API key is required.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Get an API key</a>

Because every host uses the same **Agent Skills standard** (`SKILL.md`), it works identically wherever you install it — just run `/dubbing` or say *"dub this video for me."*

---

## Supported platforms

- [**Claude Code**](#claude-code)
- [**Antigravity**](#antigravity)
- [**Codex App**](#codex-app)
- [**Codex CLI**](#codex-cli)
- [**Cursor**](#cursor)

> If you use several hosts together, follow the one-shot install below.

---

## Install

> **🤖 To the agent:** If you're reading this README from inside the repo, install is a single line. Run the following from the repo root — no repo URL or network needed.
>
> ```bash
> node scripts/install.mjs
> ```

### ⚡ One-line install (recommended · when you already have the repo)

From the repo root:

```bash
node scripts/install.mjs        # = npm run install:skill
```

Copies the `dubbing` skill into the skills folder of every detected host (`~/.claude` · `~/.antigravity` · `~/.codex` · `~/.cursor`).

- Specific host only: `--claude` / `--antigravity` / `--codex` / `--cursor`
- All of them: `--all` · current project only (`./.claude` etc.): `--project`

### 📦 When you don't have the repo yet (npx)

```bash
npx github:est-perso-dubbing-agent/perso-dubbing-plugin
```

Installs the same way, auto-detecting hosts. *(Once published to npm: `npx perso-dubbing`.)*

### 🔧 Manual install

If automatic install fails, drop the folder into your host's skills directory under the name **`dubbing`**. From the repo root:

```bash
# macOS / Linux — see the per-platform locations below for <skills_folder>
mkdir -p <skills_folder>/dubbing && cp -r ./* <skills_folder>/dubbing/
```

> 💡 Windows (PowerShell): `New-Item -ItemType Directory -Force <skills_folder>\dubbing; Copy-Item .\* <skills_folder>\dubbing\ -Recurse`

Per-platform `<skills_folder>` locations are below.

### Claude Code

Auto-install target. To install for this host only, use `--claude`.

Manual locations:

```text
~/.claude/skills/dubbing/            # global
.claude/skills/dubbing/              # this project only
```

### Antigravity

Auto-install target. To install for this host only, use `--antigravity`.

Manual location:

```text
~/.antigravity/skills/dubbing/
```

### Codex App

Codex App shares the **same config folder (`~/.codex`)** as the Codex CLI. Add `--codex` to the install command (`node scripts/install.mjs --codex`) or drop the folder in directly.

```text
~/.codex/skills/dubbing/
```

### Codex CLI

Auto-install target. To install for this host only, use `--codex`.

Manual location:

```text
~/.codex/skills/dubbing/
```

### Cursor

Auto-install target. To install for this host only, use `--cursor`.

Manual location:

```text
~/.cursor/skills/dubbing/
```

After installing, type **`/dubbing`** in your agent or just say **"dub this video for me"** to run it.

---

## Examples

The easiest way — just tell your agent:

> "Dub this video into English — C:\videos\clip.mp4"

You can also run the CLI directly:

```bash
# One video (auto-detect source → English)
node scripts/dubbing.mjs "clip.mp4" --target en --out result.mp4

# Several languages at once (uploaded/split once, reused per language)
node scripts/dubbing.mjs "clip.mp4" --target en,ja,zh

# Several inputs at once (URLs, files, and folders can be mixed)
node scripts/dubbing.mjs "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Install/run fails | Requires **Node.js 18+**. Check with `node -v`. |
| `API key missing`-type message | A Perso Dubbing API key is required. Check registration with `node scripts/resolve_key.mjs --check` and follow the prompts. **Do not paste the key into the chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Get an API key</a> |
| ffmpeg-related error | ffmpeg is normally installed automatically. If it fails, run `npm run doctor` (= `node scripts/check_deps.mjs`). |
| Stops midway (out of credits) | It saves what's already done and stops. After topping up credits, run the **`--resume "<state-file>"`** command shown in the notice to finish only the remaining parts (completed parts are skipped automatically). |

---

## License

This skill's code is distributed under the **[MIT License](LICENSE)**. The actual dubbing is performed through the Perso Dubbing API, so API usage itself is subject to the [Perso AI Terms of Service](https://perso.ai) and pricing.
