---
name: srt
description: Extract subtitles (SRT) from video/audio/URLs and translate them into other languages (Perso AI STT).
---

# /srt

A skill that extracts the source-language subtitles of a video/audio via the Perso AI STT API — and then **you (the agent) translate them** into the requested languages.

## Core rules (must follow)

- **Only the worker sees the raw key.** Never open the key with `Read`, echo it, or pass it as a command-line argument. Workers send it in the `XP-API-KEY` header only.
- **One command = the whole extraction.** `scripts/srt.mjs` handles upload · transcription · SRT download by itself.
- **Always run `srt.mjs` in the background.** Transcription takes minutes; a foreground shell timeout kills the run mid-way.
- Language unspecified → target `en`.
- **Transcription only, no translation** (user asks for "the subtitles/transcript as-is", "just the SRT in the original language") → run with `--transcribe-only` instead of `--target`. One subtitle project per input; the downloaded original SRT **is** the final deliverable — skip the Translate section entirely.
- **Multiple languages go in one command** (`--target en,ja`) — the upload happens once and is reused; one subtitle project is created per input × language (each project bills separately).
- **Relay progress faithfully.** Surface the worker's stdout `[progress]` lines to chat, verbatim or summarized. The indented stderr detail logs don't need relaying.
- **Unsupported formats are skipped automatically** and the rest keep processing — relay the skip notice.
- This skill shares the dubbing skill's libraries: the `dubbing` folder must be installed next to `srt` (every install method ships them together; only a manual copy of the `srt` folder alone breaks this).

## One-time setup

Same as `/dubbing` — no separate step: with no key registered, `srt.mjs` opens a browser page on first run (the user signs in and clicks once; the key is delivered automatically). If the browser can't open, a key file opens instead — show the user the printed key-file path (clickable) and tell them to paste just the key and save (it's encrypted and the file deleted). Never paste the key into chat. Get a key: https://developers.perso.ai/api-keys

## Run

After the key gate, collect the input (local path or URL — re-ask if missing) and run **in the background**:

- Single: `node scripts/srt.mjs "<file|URL>" [--target en] [--space "space name"] [--out folder]`
- Multi-language / multi-input: `node scripts/srt.mjs "<URL>" "<file>" --target en,ja`
- Folder (batch): `node scripts/srt.mjs "<folder>" [--target en] [--recursive] [--out folder]`
- Transcription only (no translation): `node scripts/srt.mjs "<file|URL>" --transcribe-only`

Extracted original SRT files are saved next to each source (or into `--out`), keeping the server's file name (`…_OriginalSubtitle_….srt`).

**Space selection** — with several workspaces the worker stops before uploading, prints `[space-select]` lines (**name | (plan) | remaining credits**) and exits (code 3). Show the user ONLY those options (no internal numbers), ask which one, and re-run with `--space "<space name>"`. One dubbing-capable space → no question; `PERSO_SPACE_SEQ` pins it.

**Media over the plan limit** — this skill does **not** auto-split. If the worker reports the media exceeds the plan's length/size limit, relay its message: the user can split/trim the file themselves or upgrade the plan, then retry.

**Credits** — each subtitle project consumes credits in proportion to the media length (per language). The server's billing is authoritative; don't quote exact prices.

## Translate (you do this part)

When extraction finishes, the worker prints one line per (input × language):

```
[srt-original] {"input":"video.mp4","lang":"ja","path":"C:\\clips\\video_OriginalSubtitle_2026-07-15.srt"}
```

**If `lang` is `null`** (a `--transcribe-only` run), there is nothing to translate: deliver that file to the user as-is and stop here.

For each `[srt-original]` line:

**Step 1 — read the whole file first and build context.** Read the SRT at `path` end to end before translating anything, and pin down:

- what the content is (lecture, tutorial, vlog, drama, ad, …) and who it's for
- the speaker's tone and register (formal / casual / humorous / technical) — and decide the target-language style that matches it
- recurring names and terms — use one consistent translation for each across the whole file

**Step 2 — translate into `lang`, section by section** (batch long files, but apply the tone and terms fixed in Step 1 to every batch):

- Translate **only the text lines**. Keep cue numbers, timestamp lines (`-->`), blank lines, and the cue count exactly as they are — never alter timestamps or merge/split cues.
- **Meaning and mood come first**: prefer a natural translation that carries the Step-1 tone over a word-for-word one. Render idioms, wordplay, and humor with target-language equivalents.
- **Stay within each cue's display time**: the subtitle must be readable while the cue is on screen (rough guide: ~15 chars/sec for Latin scripts, ~10 chars/sec for CJK). A natural translation usually fits, so **most cues need no trimming** — shorten only the ones that overflow.
- **When you must shorten, keep this priority**: meaning → tone/nuance → length. Cut fillers, redundancy, and repetition first; keep core information, punchlines, and emotional wording until the last. If a pun truly can't fit, replace it with a shorter line that still lands the humor — **flattening it into a bland summary is the last resort**.

**Step 3 — save**: UTF-8, in the same folder, named `{stem}_{lang}_Subtitle.srt`, where `stem` is the input's file name without its extension — take it from the `input` field of the `[srt-original]` line (e.g. `"input":"video.mp4"` + `ja` → `video_ja_Subtitle.srt`; for URL inputs use the media title or a short slug). Do NOT derive the stem from the downloaded file's name — the server builds that from the project title. Keep the original SRT file — don't delete or overwrite it.

Report the saved translated file paths to the user, mentioning the originals are kept alongside.

## Interruption & resume

The worker saves a state file (`*.srtresume.json`, next to the source or in `--out`) from the moment the plan is known and after every completed piece, so a run that dies for ANY reason (credits, crash, killed shell) resumes without redoing paid work:

```
node scripts/srt.mjs --resume "<state-file>"
```

Completed pairs are skipped (their `[srt-original]` lines are re-printed), and the state file is deleted when everything finishes.

**Re-running the original command while a state file exists is blocked** — the worker prints `[resume-check]` lines (exit 3) instead of re-billing. Relay the printed `--resume` command and run that. Delete the state file **only** if the user explicitly chooses to pay for the completed parts again — never on your own.

**On an insufficient-credits stop**: deliver the completed SRTs (and translate them), then relay the worker's guidance and resume command **verbatim** — plain stdout (not `[progress]`), so don't drop it while summarizing. The guidance points to the dubbing skill's `billing.mjs` (`node ../dubbing/scripts/billing.mjs options`) for a payment link — the flow is described in the dubbing SKILL.md's "Plan upgrade & credits" section. **You only ever hand the link to the user — never open it or complete payment yourself.**

## Config (env)

The dubbing skill's environment variables apply unchanged (`PERSO_API_BASE`/`PERSO_MEDIA_BASE` — https `perso.ai` hosts only, `PERSO_SPACE_SEQ`, `XP_API_KEY`, `PERSO_NO_WATCH`, `PERSO_NO_OPEN`, `PERSO_QUEUE_WAIT_MS`, `PERSO_NO_UPDATE_CHECK`, `PERSO_NO_TELEMETRY`).
