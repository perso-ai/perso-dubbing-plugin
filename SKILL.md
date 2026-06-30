---
name: dubbing
description: Auto-dub (voice-translate) videos into other languages, with lip-sync (Perso AI Dubbing).
---

# /dubbing

A skill that auto-dubs videos via the Perso AI Dubbing API.

## Core rules (must follow)

- **Only the worker sees the raw key.** Never open the key with `Read`, echo it, or pass it as a command-line argument. The real key is used by the `lib/`·`scripts/` workers in the `XP-API-KEY` header only.
- When languages are unspecified: source `auto`, target `en`.
- **Multiple languages in a single command** — comma-separate them, e.g. `--target en,zh,ja`. Running once per language re-splits and re-uploads the same source **once per language**. With one command, split/upload happens once (per video) and that mediaSeq is reused for each language's translation.
- **Relay progress to the user.** Dubbing takes time, so `dubbing.mjs` runs **in the background**. But the **`[progress]` lines** the worker prints to stdout (split start / split complete / translation start / merge start) must not stay buried in background logs — surface them to the user's chat **verbatim (or summarized)**. (The `  ` indented stderr detail logs don't need to be relayed.)
- **Unsupported formats are skipped automatically.** If upload doesn't accept a format, skip that file ("Skipped because the format is unsupported…") and keep processing the rest. Relay this skip notice to the user too.

## One-time setup

1. **Register an API key** — `node scripts/resolve_key.mjs --check`. If missing, follow the auto-registration flow (`--watch`) under "Key gate" below (don't paste the key into chat). Get a key: https://developers.perso.ai/api-keys
2. **ffmpeg/ffprobe** — no need to pre-install. They're installed automatically **only when a video exceeds the plan's length limit and must be split** (approve only if permission is requested). Manual check: `node scripts/check_deps.mjs`.

## Flow

1. **Key gate** — `node scripts/resolve_key.mjs --check`. If there's no key (exit 2), **auto-register**: run `node scripts/resolve_key.mjs --watch` in the background → show the user the printed key-file path (as a **clickable** path) and tell them to "click to open, paste just the key, and save." Once they save, it's auto-detected → encrypted on the fly → the key file is deleted, registration finishes (`✅`), and the worker exits. After confirming completion, proceed with dubbing (don't paste the key into chat).
2. **Collect input** — ask the user for the video's local path or URL (re-ask if missing).
3. **Normalize input** — `node scripts/prepare_input.mjs "<input>"` → JSON.
   - `source: local|url` → use `localPath` for the next step (upload/split decision).
   - `source: external` (YouTube·TikTok·Drive·Vimeo) → upload via the API external flow.

4. **Upload-first split decision** — `node scripts/probe_split.mjs '<JSON|path>'`. Try a whole-file upload first; if it's within limits, it's a single chunk (already uploaded, no ffmpeg/ffprobe). If it exceeds the limit, upload returns `F4008` (maxLengthMs) → **only then** install ffmpeg/ffprobe → lossless segment split (`-c copy`, SEG = limit − GOP − margin; re-encode only when lossless isn't possible). If `notice` is present, announce the split. (`source: external` is handled by the server.)

5. **Scheduler (global pool)** — `lib/scheduler.mjs` gathers **all inputs × chunks × languages** into one pool and fills a single queue. At the start it submits **only as many as there are free slots** (via `getQueueStatus`), and submits more as slots free up. When there are no free slots (external/earlier jobs occupy the queue), it **re-checks every 5 minutes** and keeps filling until our jobs occupy Concurrent+Queue. An engine error on a chunk cancels its sibling languages; a no-voice segment passes through the original (split chunks only); on insufficient usage it stops (preserving completed work); plus an idle guard against hanging forever.
6. **Merge & report** — grouped per input and per language, `lib/merge.mjs` concatenates consecutive successful segments (split inputs only); HARD_FAIL marks a group boundary + a failure report. The result is one file per (input × language).

**One-shot run (inputs may be multiple — URLs, files, and folders can be mixed):**
- Single: `node scripts/dubbing.mjs "<file|URL>" [--source auto] [--target en] [--space N] [--out result.mp4]`
- Multi-language: `node scripts/dubbing.mjs "<file|URL>" --target en,zh,ja` — uploaded/split once, then mediaSeq reused per language, saved as one file per language.
- **Multiple inputs**: `node scripts/dubbing.mjs "<URL1>" "<URL2>" "<file>" --target en,ja` — each input is uploaded/split once, then **all inputs × chunks × languages fill one queue** concurrently. Results are saved per input and per language next to each source (`--out <folder>` collects them into that folder).
- Folder (batch): `node scripts/dubbing.mjs "<folder>" [--target en,zh] [--recursive] [--out output-folder]` — expands all media in the folder and processes them through the same global pool.
- Output names: a non-split single output keeps the **Perso download filename as-is** (includes language·timestamp); a split-and-merged output is `<original-name>.dubbed.<lang>.<ext>`; on name collision, `_2`,`_3`…

**When it stops due to insufficient usage (credits)**, deliver the completed parts and **surface the upgrade / buy-more-credits (Get credits) URL and the resume instructions printed by the worker, verbatim and without omission**. (That URL line is plain stdout, not a `[progress]` line, so it's easy to drop while summarizing — never just say "top up credits and re-run" without the upgrade/credit path. Always include the URL.) Resume with `--resume <statefile>` (same for single·multi-input·batch; completed parts are skipped automatically).

## Config (env)

- `PERSO_API_BASE` — API base URL (default `https://api.perso.ai`).
- `PERSO_MEDIA_BASE` — media host for result files (default `https://portal-media.perso.ai`). Prepended when a response path is relative.
- `PERSO_SPACE_SEQ` — pin the space to use (otherwise automatic: among `video_translator` spaces, prefer non-free, then the smallest spaceSeq).
- `XP_API_KEY` — set the key directly (highest priority). Otherwise resolved from `~/.perso/credentials` (DPAPI-encrypted on Windows).
