---
name: dubbing
description: Auto-dub (voice-translate) videos into other languages, with lip-sync (Perso AI Dubbing).
---

# /dubbing

A skill that auto-dubs videos via the Perso AI Dubbing API.

## Core rules (must follow)

- **Only the worker sees the raw key.** Never open the key with `Read`, echo it, or pass it as a command-line argument. The real key is used by the `lib/`·`scripts/` workers in the `XP-API-KEY` header only.
- **One command = the whole job.** `scripts/dubbing.mjs` does everything: validate input → upload → split only if needed → translate → merge → save. **Never run `prepare_input.mjs` or `probe_split.mjs` before it** — they are debug tools, and `probe_split.mjs` performs a real upload (running it first uploads the same video twice).
- **Always run `dubbing.mjs` in the background.** Jobs take minutes to hours; a foreground shell with a timeout kills the run mid-way.
- When languages are unspecified: source `auto`, target `en`.
- **Multiple languages in a single command** — comma-separate them (`--target en,zh,ja`): split/upload happens once per video and the mediaSeq is reused per language. Running once per language re-uploads the same source once per language — avoid it.
- **Relay progress faithfully.** Surface the `[progress]` lines the worker prints to stdout to the user's chat **verbatim (or summarized)** — don't let them stay buried in background logs, and don't announce steps that didn't appear: splitting/merging happen only for videos that exceeded the limit, so an unsplit video is just "translation → save" (never promise a "merge" step for it). The two-space-indented stderr detail logs don't need relaying.
- **Unsupported formats are skipped automatically.** If upload doesn't accept a format, that file is skipped and the rest keep processing. Relay the skip notice to the user too.

## One-time setup

1. **API key** — no separate step needed: if no key is registered, `dubbing.mjs` opens a key file itself on first run (self-heal) — show the user the printed key-file path (as a **clickable** path) and tell them to "click to open, paste just the key, and save." It's encrypted on save and the file is deleted. To check/register ahead of time: `node scripts/resolve_key.mjs --check` (exit 2 = missing → `--watch` registers the same way; don't run `--watch` if a dubbing run is already waiting for the key — two watchers would open two editors). Never paste the key into chat. Get a key: https://developers.perso.ai/api-keys
2. **ffmpeg/ffprobe** — no need to pre-install. Installed automatically **only when a video exceeds the plan's length limit and must be split** (approve only if permission is requested). Manual check: `node scripts/check_deps.mjs`.

## Run

After the key gate, collect the input (local path or URL — re-ask if missing) and run **in the background**:

- Single: `node scripts/dubbing.mjs "<file|URL>" [--source auto] [--target en] [--space "space name"] [--out result.mp4]`
- Multi-language: `node scripts/dubbing.mjs "<file|URL>" --target en,zh,ja` — one output file per language.
- Multiple inputs (URLs, files, and folders can be mixed): `node scripts/dubbing.mjs "<URL1>" "<URL2>" "<file>" --target en,ja` — results are saved per input × language next to each source (`--out <folder>` collects them into that folder).
- Folder (batch): `node scripts/dubbing.mjs "<folder>" [--target en,zh] [--recursive] [--out output-folder]`

**Space selection** — if the account has several workspaces, the worker stops before uploading anything, prints `[space-select]` lines listing each space as **name | (plan) | remaining credits**, and exits (code 3). Show the user ONLY those options (no internal numbers), ask which one to dub in, then re-run the same command with `--space "<space name>"`. A single-space account proceeds without asking; `PERSO_SPACE_SEQ` pins the choice for every run.

What happens while it runs (so you can explain the waiting to the user):

- **Upload-first split decision**: the whole file is uploaded first; only if the plan limit rejects it (`F4008`/size) is ffmpeg installed and the video split losslessly (`-c copy`, re-encode only when lossless isn't possible). External URLs (YouTube·TikTok·Drive·Vimeo) are handled server-side.
- **One global queue**: all inputs × parts × languages fill a single pool. Only as many jobs as there are free slots are submitted; when the queue is fully occupied by other jobs, it re-checks every 5 minutes. An engine error on a part cancels that part's other languages; a silent (no-voice) part of a split video passes the original through; an idle guard prevents hanging forever.
- **Merge & save**: consecutive successful parts are concatenated into one file per (input × language). Output names: a non-split single output keeps the **Perso download filename as-is**; a split-and-merged output is `<original-name>.dubbed.<lang>.<ext>`; on name collision, `_2`,`_3`….

## Interruption & resume

The worker saves a state file (`*.dubresume.json`, next to the source or `--out`) **from the moment the split plan is known and after every completed piece** — so a run that dies for ANY reason (out of credits, crash, killed shell, Ctrl+C) can resume without redoing paid work:

```
node scripts/dubbing.mjs --resume "<state-file>"
```

Completed parts are skipped automatically (same for single · multi-input · batch). The state file is deleted when everything finishes.

**When it stops due to insufficient usage (credits)**: deliver the completed parts and **surface the upgrade / buy-more-credits (Get credits) URL and the resume instructions printed by the worker, verbatim and without omission**. (That URL line is plain stdout, not a `[progress]` line, so it's easy to drop while summarizing — never just say "top up credits and re-run" without the upgrade/credit path. Always include the URL.)

## Config (env)

- `PERSO_API_BASE` — API base URL (default `https://api.perso.ai`).
- `PERSO_MEDIA_BASE` — media host for result files (default `https://portal-media.perso.ai`). Prepended when a response path is relative.
- `PERSO_SPACE_SEQ` — pin the space to use for every run (skips the space question).
- `XP_API_KEY` — set the key directly (highest priority). Otherwise resolved from `~/.perso/credentials` (DPAPI-encrypted on Windows).
- `PERSO_NO_WATCH` — when no key is registered, `dubbing.mjs` normally self-heals by opening a key file and waiting for the user to paste the key. Set this to fail fast instead (headless/CI).
- `PERSO_NO_OPEN` — don't auto-open the key file in an editor during key registration (headless; the file path is still printed).
- `PERSO_SIZE_CAP_BYTES` — upload size cap used for the split decision (default ≈1.9 GB, under the API's 2 GB limit).
- `PERSO_QUEUE_WAIT_MS` — how long to wait between queue re-checks when all slots are occupied by other jobs (default 5 minutes).

## Advanced (debug only — not part of the normal flow)

`dubbing.mjs` already does all of this internally; use these only to diagnose a problem:

- `node scripts/prepare_input.mjs "<input>"` — input normalization check (prints JSON).
- `node scripts/probe_split.mjs '<JSON|path>'` — upload-first split decision. ⚠ Performs a **real upload**; never use it as a pre-step to `dubbing.mjs`.
- `node scripts/languages.mjs` — list supported language codes.
- `node scripts/check_deps.mjs` — check/auto-install ffmpeg/ffprobe.
