# Perso Dubbing — agent setup guide

> **To the AI agent reading this:** you are running inside a coding agent (Cursor, Antigravity, Claude Code, Codex, or similar) **with terminal access**, helping a person who is likely **not a developer**. Do the work yourself — run the commands, read the output, fix problems — and ask for approval before installing anything. **Always reply in the user's language.** Keep each message short: what you're about to do, then do it.
>
> **No terminal access?** If you are a chat assistant that cannot run commands on the user's computer (e.g. Gemini or ChatGPT on the web), do NOT pretend to execute anything. Switch to coaching mode: first help the user get a coding agent — the easiest free path is **Antigravity** (download at https://antigravity.google, sign in with a Google account) — then tell them to paste this same guide link into that agent's chat, which will take over from there. Alternatively, walk them through the steps below yourself, one command at a time, waiting for their output after each step.

## Goal

Get [Perso Dubbing](https://github.com/perso-ai/perso-dubbing-plugin) working so the user can say *"dub this video into English"* and it just happens. Dubbing is billed against the user's own Perso credits (within their plan's monthly limit) — the skill adds no extra fee.

## Step 1 — Node.js 18+

```
node -v
```

If missing or older than 18, install it (with the user's approval):

- **Windows:** `winget install OpenJS.NodeJS.LTS`
- **Mac:** `brew install node` (or guide the user to the LTS installer at https://nodejs.org if Homebrew is missing)

Open a fresh shell (or re-source the environment) and verify `node -v` again.

## Step 2 — Install the skill

```
npx perso-dubbing
```

The installer auto-detects every coding agent installed on this machine and installs the skill into each. If you know your own host, you can target it directly: `--cursor`, `--antigravity`, `--codex`, `--claude`. It prints where it installed (e.g. `~/.cursor/skills/dubbing/`, `~/.agents/skills/dubbing/`).

If your host loads skills at startup, tell the user to restart the app (or reload the window) once.

## Step 3 — First dub

1. Ask the user for a test video — a file path, a folder, or a YouTube URL all work.
2. Run the dub through the skill: type `/dubbing`, or handle it directly per the skill's `SKILL.md` — e.g. dub `clip.mp4` into English.
3. **API key:** on the first run, a key file opens automatically. The user gets a free-to-issue Perso API key at https://developers.perso.ai/api-keys and pastes it **into that file (not into the chat)**, saves, then you retry.
4. The result is saved next to the original file. Show the user where it is.

## Good to know

- Long/oversized videos are split, processed, and merged back automatically.
- Multiple languages in one go: dub into English, Japanese, and Spanish at once — upload happens only once.
- Interrupted runs (credits ran out, crash) save progress; the notice shows a `--resume` command that finishes only what's left.
- Troubleshooting: `node`/`npm` not found → reopen the shell; ffmpeg errors → run `npm run doctor` in the skill folder; more in the [FAQ](https://github.com/perso-ai/perso-dubbing-plugin/blob/main/FAQ.md).
