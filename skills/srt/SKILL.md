---
name: srt
description: Extract subtitles (SRT) from video/audio/URLs and translate them into other languages (Perso AI STT).
allowed-tools: Bash(node scripts/srt.mjs *), Bash(node scripts/style.mjs *), Bash(node ../dubbing/scripts/resolve_key.mjs *), Bash(node ../dubbing/scripts/billing.mjs *), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Bash(node ${CLAUDE_SKILL_DIR}/../dubbing/scripts/*)
---

# /srt

A skill that extracts the source-language subtitles of a video/audio via the Perso AI STT API — and then **you (the agent) translate them** into the requested languages.

## Core rules (must follow)

- **Only the worker sees the raw key.** Never open the key with `Read`, echo it, or pass it as a command-line argument. Workers send it in the `XP-API-KEY` header only.
- **One command = the whole extraction.** `scripts/srt.mjs` handles upload · transcription · SRT download by itself.
- **Always run `srt.mjs` in the background.** Transcription takes minutes; a foreground shell timeout kills the run mid-way.
- Language unspecified → target `en`.
- **Transcription only, no translation** (user asks for "the subtitles/transcript as-is", "just the SRT in the original language") → run with `--transcribe-only` instead of `--target`. The downloaded original SRT **is** the final deliverable — skip the Translate section entirely.
- **Multiple languages go in one command** (`--target en,ja`) — one subtitle project is created per input regardless of how many languages, and you translate its single original SRT into each of them.
- **Relay progress faithfully.** Surface the worker's stdout `[progress]` lines to chat, verbatim or summarized. The indented stderr detail logs don't need relaying. For a batch the worker streams a `[progress]` line per input and prints a `[status]` heartbeat (`subtitles 3/20`, with a `next check ~Nm` hint) — check the background output ~3 minutes after launch, then on the hinted interval, relaying new lines. Never invent percentages or ETAs.
- **Name your runtime for telemetry (silent).** Add `--host <claude-code|codex|cursor|antigravity|gemini>` to the worker command, naming the agent you are running as, if you can tell. It only tags usage telemetry — never surface it to the user and never ask them about it. Omit it if unsure.
- **Unsupported formats are skipped automatically** and the rest keep processing — relay the skip notice.
- This skill shares the dubbing skill's libraries: the `dubbing` folder must be installed next to `srt` (every install method ships them together; only a manual copy of the `srt` folder alone breaks this).

## One-time setup

Same as `/dubbing` — the first run registers the key itself (browser flow, file fallback); relay the worker's printed instructions. Never paste the key into chat.

## Run

After the key gate, collect the input (local path or URL — re-ask if missing) and run **in the background**:

- Single: `node scripts/srt.mjs "<file|URL>" [--target en] [--space "space name"] [--out folder]`
- Multi-language / multi-input: `node scripts/srt.mjs "<URL>" "<file>" --target en,ja`
- Folder (batch): `node scripts/srt.mjs "<folder>" [--target en] [--recursive] [--out folder]`
- Transcription only (no translation): `node scripts/srt.mjs "<file|URL>" --transcribe-only`

Extracted original SRT files are saved next to each source (or into `--out`), keeping the server's file name (`…_OriginalSubtitle_….srt`).

**Save location** — same policy as `/dubbing`: default is next to each source file; don't ask. On the session's first job, state it in the kickoff line and start right away. A folder the user named earlier in this session keeps applying (`--out "<folder>"`) until they change it; translated SRTs go to the same folder as their originals. Exception: when every input is a URL, ask where to save before starting.

**Space selection** — with several workspaces the worker stops before uploading, prints `[space-select]` lines (**name | (plan) | remaining credits**) and stops. Show the user ONLY those options (no internal numbers), ask which one, and re-run with `--space "<space name>"`. One dubbing-capable space → no question; `PERSO_SPACE_SEQ` pins it.

**Media over the plan limit** — this skill does **not** auto-split. If the worker reports the media exceeds the plan's length/size limit, relay its message: the user can split/trim the file themselves or upgrade the plan, then retry.

**Credits** — each subtitle project consumes credits in proportion to the media length (one project per input). The server's billing is authoritative; don't quote exact prices.

## Translate (you do this part)

When extraction finishes, the worker prints one line per input, carrying every target language:

```
[srt-original] {"input":"video.mp4","langs":["en","ja"],"path":"C:\\clips\\video_OriginalSubtitle_2026-07-15.srt","seq":389259}
```

**If `langs` is `null`** (a `--transcribe-only` run), there is nothing to translate: deliver that file to the user as-is and stop here.

**Show translation progress.** STT extraction is done, but translating into each language takes time too — make it visible. Before you start, post one line naming the languages you'll produce (e.g. "Subtitles extracted — now translating into Japanese and English"). After you finish and save each language's file, post a one-line update (e.g. `Japanese ✓ (1/2)`), so the user sees per-language progress like a multi-language dub. A long file may stay quiet within a single language while you batch its sections — that's fine.

For each `[srt-original]` line, translate the one file at `path` into **every** language in `langs`:

**Step 1 — read the whole file first and build context.** Read the SRT at `path` end to end before translating anything, and pin down:

- what the content is (lecture, tutorial, vlog, drama, ad, …) and who it's for
- the speaker's tone and register (formal / casual / humorous / technical) — and decide the target-language style that matches it
- recurring names and terms — use one consistent translation for each across the whole file

**Step 2 — translate into each language in `langs`, section by section** (batch long files, but apply the tone and terms fixed in Step 1 to every batch; Step 1 is done once per file, not per language):

- Translate **only the text lines**. Keep cue numbers, timestamp lines (`-->`), blank lines, and the cue count exactly as they are — never alter timestamps or merge/split cues while translating (retiming is a separate later pass, Step 5).
- **Each cue's text stays in its own cue.** The STT cuts the source by speech length, not by grammar, so cues often end mid-phrase — don't mirror that break in the translation. End every cue on a readable unit and carry the continuation with a comma or a running sentence. Keep a fragment only where the speaker is genuinely cut off or interrupted.
- **Meaning and mood come first**: prefer a natural translation that carries the Step-1 tone over a word-for-word one. Render idioms, wordplay, and humor with target-language equivalents.
- **Layout — at most 2 text lines per cue, each line at most 42 characters for Latin scripts (20 for CJK).** A longer line gets force-wrapped by the player into 3+ on-screen lines that cover the picture. Break lines at natural phrase boundaries; if the text cannot fit, shorten it with the priority below.
- **Stay within each cue's display time**: budget ≈ cue duration × 17 chars/sec for Latin scripts (9 for CJK); beyond ~21/sec (13 CJK) the subtitle disappears before it can be read. A natural translation usually fits, so **most cues need no trimming** — shorten only the ones that overflow.
- **When you must shorten, keep this priority**: meaning → tone/nuance → length. Cut fillers, redundancy, and repetition first; keep core information, punchlines, and emotional wording until the last. If a pun truly can't fit, replace it with a shorter line that still lands the humor — **flattening it into a bland summary is the last resort**.

**Step 3 — save**: UTF-8, in the same folder, one file per language named `{stem}_{lang}_Subtitle.srt`, where `stem` is the input's file name without its extension — take it from the `input` field of the `[srt-original]` line (e.g. `"input":"video.mp4"` + `["en","ja"]` → `video_en_Subtitle.srt` and `video_ja_Subtitle.srt`; for URL inputs use the media title or a short slug). Do NOT derive the stem from the downloaded file's name — the server builds that from the project title. Keep the original SRT file — don't delete or overwrite it.

**Step 4 — verify each saved file** (offline — no key, no network, no credits):

```
node scripts/srt.mjs --check "<translated.srt>" --source "<original .srt>"
```

`[check] FAIL` lines mean the file breaks cue alignment, the 2×42 layout, or the reading-speed cap. Rewrite ONLY the listed cues (same meaning-first priority), save, and re-run until no FAIL remains. WARN lines are optional polish. Run this before Step 5 — after retiming, the cue count no longer matches the source by design.

**Step 5 — readability retiming** (offline; once per delivered file, after the check passes):

```
node scripts/srt.mjs --retime "<translated.srt>"
```

It extends too-fast cues into the following silence and merges short neighbouring cues into one 2-line event (Netflix-style), rewriting the file in place — cue numbering may change; the untouched original SRT keeps the 1:1 timing map. Then:

- shorten the text of any cues it still lists as too fast (genuinely fast speech), and
- for comedy/drama content, review its `[retime] merged` lines: if a merge shows a punchline early or completes an intentionally interrupted line, restore those two cues with their original timings from the pre-merge state.

Report the saved translated file paths to the user, mentioning the originals are kept alongside. If the user wants to open the subtitle project on Perso, build the link from the `[srt-original]` line's `seq`: `https://perso.ai/en/workspace/vt/stt/<seq>`.

## Style & burn subtitles (hardsub)

Optionally burn a **styled** subtitle track onto the video (permanent hardsub) with `scripts/style.mjs`. This is a local ffmpeg step — no key, no credits (except `--project`, which downloads the source from Perso). Requires `ffmpeg`; if missing, tell the user to install it and stop.

**When to offer it (two entry points):**

- **After translation:** once the SRTs are delivered, offer to add styled subtitles — natural user-facing wording, not "burn/hardsub". For several languages, ask all or only some.
- **Direct request (video + SRT handed to you):** go straight to preset selection.

**Flow:**

1. **Always show the presets first — never skip to applying one.** How to show them depends on the surface:
   - **Claude app (or any surface that can render an interactive widget):** show the preset **gallery** — a tile per preset the user selects, with an **Apply** button that sends the pick back as the generation request. Preferred there.
   - **CLI / Antigravity / Codex / anywhere without interactive rendering (universal fallback):** attach `assets/style_presets.png` (the static preview) **and** run `node scripts/style.mjs --list-presets` for the text menu.
   Both come from the same presets. Group short-form (9:16) / long-form (16:9). The user can pick a preset **or describe any style** (e.g. "yellow text, black outline, at the bottom"). Suggest a default by orientation (portrait → short-form, landscape → long-form) but let them choose. Apply only after they pick or describe.
2. **Apply.** Run the worker in the **background** (encoding takes time):
   - From a Perso STT project: `node scripts/style.mjs --project <seq> --preset <id> [--out folder]`
   - From local files: `node scripts/style.mjs "<video>" "<subtitle.srt>" --preset <id> [--out folder]`
   - **Custom style:** map the user's description to override flags on top of any base preset — `--position center|lower|bottom|upper`, `--font`, `--fontsize`, `--primary RRGGBB`, `--outline RRGGBB`, `--outline-width`, `--box RRGGBB@opacity|none`, `--karaoke`/`--no-karaoke`, `--highlight RRGGBB`, `--uppercase`, `--bold`/`--no-bold` (see `--help`).
   - **Fonts:** `--font "<name>"` uses an installed font; a name that isn't installed falls back to the closest system font automatically (mention it when relevant). A user-supplied font file (.ttf/.otf/.ttc) goes in as `--font-file "<path>"` — the family name is read from the file itself.
   - **Multiple languages:** run once per language's SRT with the same `--preset`, adding `--lang <code>` so outputs are named per language.
3. **Relay + deliver.** Surface `[progress]` lines; deliver the file from the `[styled-output]` `path`. Add `--host <runtime>` for telemetry (silent).

**Karaoke (per-word highlight).** The `karaoke` preset needs per-word timings. With `--project` the worker fetches the project's `scriptTimestamps` automatically (accurate for the **original** language). When no word timings are available (a translated SRT, or a local SRT alone), it **still proceeds** with estimated timing and prints a notice — relay the worker's notice as-is, don't ask. For accurate original-language karaoke, pass `--word-timestamps <scriptTimestamps.json>`.

## Making short clips → the clip skill

Cutting a long video into highlight clips is a **separate skill** (`clip`, installed alongside). After extraction, offer it too (e.g. "I can also cut the key moments into short clips"); when the user wants clips, invoke `clip`. It cuts + reframes and hands subtitles back here via `<clip>.srt` sidecars — style each with `scripts/style.mjs "<clip>.mp4" "<clip>.srt" --preset <id>`.

## Interruption & resume

The worker saves a state file (`*.srtresume.json`, next to the source or in `--out`) from the moment the plan is known and after every completed piece, so a run that dies for ANY reason (credits, crash, killed shell) continues without redoing paid work. When continuing is possible the worker prints a **`[resume-state] <path>` marker**.

**`[resume-state]` is for you, not the user — never show it or the raw `--resume` command.** Tell the user in natural language what finished and what didn't, and offer to continue. When the user agrees, run `node scripts/srt.mjs --resume "<that path>"` (completed inputs are skipped and their `[srt-original]` lines re-printed; the state file is deleted when everything finishes). Delete the state file only if the user explicitly chooses to start over and pay for completed parts again — never on your own. Re-running the original command is blocked (`[resume-check]`).

**On an insufficient-credits stop**: deliver the completed SRTs (and translate them), then tell the user the rest needs a top-up and continuing finishes it without re-billing. The guidance points to the dubbing skill's `billing.mjs` (`node ../dubbing/scripts/billing.mjs options`) for a payment link — described in the dubbing SKILL.md's "Plan upgrade & credits" section. **You only ever hand the link to the user — never open it or complete payment yourself.**

## Config (env)

The dubbing skill's environment variables apply unchanged (`PERSO_API_BASE`/`PERSO_MEDIA_BASE` — https `perso.ai` hosts only, `PERSO_SPACE_SEQ`, `XP_API_KEY`, `PERSO_NO_WATCH`, `PERSO_NO_OPEN`, `PERSO_QUEUE_WAIT_MS`, `PERSO_NO_UPDATE_CHECK`, `PERSO_NO_TELEMETRY`).
