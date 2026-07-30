---
name: clip
description: Cut a video into short-form clips (highlights/shorts) — cut given timecodes directly, or pick the best moments from a Perso AI STT project. Reframes 16:9→9:16. Subtitles are added separately by the srt skill.
allowed-tools: Bash(node scripts/clip.mjs *), Bash(node ../dubbing/scripts/resolve_key.mjs *), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Bash(node ${CLAUDE_SKILL_DIR}/../dubbing/scripts/*)
---

# /clip

Cut a video into short clips + reframe. **Subtitles are not this skill's job** — after cutting, the `srt` skill styles them (see the handoff below).

## Entry points

- **Explicit timecodes** ("cut 2:00–3:00 of this video") → cut the local file directly: `--video "<file>" --ranges "2:00-3:00,..."`. No STT, no key, no credits.
- **AI highlight selection on an STT project** → `--plan` then `--clips` (the flow below). Needs the project's transcript + word timestamps.
- **Raw video, "find the good moments"** (no timecodes given) → you can't pick highlights without a transcript, so **ask the user which they want**:
  - **STT** (proper selection, uses credits): run the `srt` skill's STT first to create the project, then clip it with `--plan`/`--clips`.
  - **Free** (no STT): the user gives the timecodes and you cut them with `--video --ranges`.

  Proceed with their choice — don't run STT (which bills credits) without asking.

## Core rules

- **Only the worker sees the raw key** — never open, echo, or pass it as an argument.
- **The key gate applies only to `--project`/`--plan`/`--clips`.** `--video --ranges` and `--sidecars` are fully offline — never run a key check/registration for them.
- **Run in the background** — encoding takes time.
- This skill shares the dubbing skill's libraries: the `dubbing` folder must be installed next to `clip`.

## Flow

**Phase 1 — plan.** `node scripts/clip.mjs --project <seq> --plan` prints the summary's section map (topic guide) plus the full sentence transcript, each line as `order [start-end] text`.

**Phase 2 — pick, then cut.** Read the transcript and choose clips, each `{ "title": "...", "start_order": N, "end_order": M }`. Rubric:

- **Hook first** — start on a sentence that grabs attention (question, bold claim, funny/surprising line).
- **End where the moment resolves, not at the first complete sentence.** Ride the beat to its end — the whole reaction, follow-through, and any secondary punchline. Read a few sentences past the apparent ending; keep them if still the same reaction.
- **Cut at the transition** — end just before the energy drops or the tone shifts (excited reaction → calm narration).
- **Peak** — favour funny / surprising / emotional / quotable moments; the high point often sits a sentence or two after the literal reveal.
- **Length 30–90s** — the worker warns when outside; prefer the full arc over a premature cut.
- **Title** — describes the moment; becomes the file name (`01_<title>.mp4`).

Sections are chapter-length — use the section map only as a guide, then tighten to a hook.

Run: `node scripts/clip.mjs --project <seq> --clips '<json>' [--out folder]` (`--clips` also accepts `@path`). Landscape (16:9) sources are reframed to 9:16 (drama-shorts letterbox); portrait sources are kept. The worker writes the clips plus a `clips.json` manifest (records each clip + the transcript slice needed for subtitles later). Relay `[progress]`; deliver the files from `[clips-output]`.

## Subtitles → hand off to the srt skill

Subtitles are off by default. After cutting, tell the user clips are ready and **ask whether to add subtitles**. If they want subtitles, **show the presets first — never jump straight to one**, exactly as the srt skill's styling flow does: the interactive **gallery** (select + Apply) in the Claude app, or the static `../srt/assets/style_presets.png` + `node ../srt/scripts/style.mjs --list-presets` menu elsewhere. Let the user pick a preset or describe a style (short-form presets like `karaoke`/`bold-punch` suit clips). Only after they pick:

1. Write the sidecars: `node scripts/clip.mjs --sidecars "<out>/clips.json"` — add `--karaoke` **only** for a karaoke preset (it also writes `<clip>.timestamps.json` for measured word timing; a plain preset needs just the `.srt`).
2. Style each clip with the **srt** skill: `node ../srt/scripts/style.mjs "<clip>.mp4" "<clip>.srt" --preset <id>` (append `--word-timestamps "<clip>.timestamps.json"` for karaoke). See the srt skill's "Style & burn subtitles" section.

Add `--host <runtime>` for telemetry (silent), same as the other workers.

## Config (env)

Same as `/dubbing` / `/srt` (`PERSO_API_BASE`/`PERSO_MEDIA_BASE` — https `perso.ai` hosts only, `PERSO_SPACE_SEQ`, `XP_API_KEY`, `PERSO_NO_TELEMETRY`, …).
