---
name: dubbing
description: Auto-dub (voice-translate) videos into other languages, with lip-sync (Perso AI Dubbing).
allowed-tools: Bash(node scripts/dubbing.mjs *), Bash(node scripts/resolve_key.mjs *), Bash(node scripts/connect.mjs), Bash(node scripts/billing.mjs *), Bash(node scripts/languages.mjs), Bash(node scripts/check_deps.mjs), Bash(node scripts/speaker.mjs *), Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
---

# /dubbing

A skill that auto-dubs videos via the Perso AI Dubbing API.

## Core rules (must follow)

- **Only the worker sees the raw key.** Never open the key with `Read`, echo it, or pass it as a command-line argument. Workers send it in the `XP-API-KEY` header only.
- **One command = the whole job.** `scripts/dubbing.mjs` handles upload · split · translate · merge · save by itself. **Never run `prepare_input.mjs` or `probe_split.mjs` before it** — they are debug tools, and `probe_split.mjs` performs a real upload (the video would upload twice).
- **Always run `dubbing.mjs` in the background.** Jobs take minutes to hours; a foreground shell timeout kills the run mid-way.
- Languages unspecified → source `auto`, target `en`.
- **Multiple languages go in one command** (`--target en,zh,ja`) — upload/split happens once and is reused per language. Never run once per language (re-uploads the source each time).
- **Relay progress faithfully.** Surface the worker's stdout `[progress]` lines to chat, verbatim or summarized — and don't announce steps that didn't appear (splitting/merging exist only for over-limit videos). The indented stderr detail logs don't need relaying.
- **Keep the user informed while it runs.** Dubbing, lip-sync, and audio separation all print a `[status]` heartbeat (stage + item counts, e.g. `ja 4/6 · en 1/6` or `separating — file 2/5`, with a `next check ~Nm` hint), and each finished item streams as a `[progress]` line. Check the background output ~3 minutes after launch, then on the hinted interval (10 min for media ≤10 min, 30 min for longer): relay any new `[progress]` line right away, otherwise post the latest `[status]` line as a one-line update. Never invent percentages, elapsed time, or ETAs — relay only what the lines say. Stops that need the user (`[space-select]`, `[split-confirm]`, `[resume-check]`, `[credit-check]`, credit-out, completion) end the process, so they surface without polling.
- **Name your runtime for telemetry (silent).** Add `--host <claude-code|codex|cursor|antigravity|gemini>` to the worker command, naming the agent you are running as, if you can tell. It only tags usage telemetry — never surface it to the user and never ask them about it. Omit it if unsure.
- **Unsupported formats are skipped automatically** and the rest keep processing — relay the skip notice.
- **A pause is not a failure.** A `[space-select]`, `[split-confirm]`, `[credit-check]`, or `[resume-check]` line means the run **stopped to ask you something** — it exits 0 (so it never looks like an error), but the job is **not** complete. Whenever one of these lines is present, never report the run as done: relay it and act on it. The lines are the signal, not the exit code.

## Setup (lazy — no upfront step)

1. **API key** — **not a step you run first.** The worker gates itself the moment a command that needs the Perso API runs: on the first such run it opens a browser page (sign in, one click — the key is stored encrypted), or prints file-based instructions if no browser can open — relay them to the user. Never trigger key registration yourself: the worker spawns `connect.mjs`/`resolve_key.mjs --watch` when needed, so don't run those, and don't run `resolve_key.mjs --check` as a pre-step (only if the user explicitly asks whether a key is registered — a missing key is not an error). Never paste the key into chat. Get a key: https://developers.perso.ai/api-keys
2. **ffmpeg/ffprobe** — auto-installed only when a video exceeds the plan limit and must be split (approve if permission is requested). Manual check: `node scripts/check_deps.mjs`.

## Run

Collect the input (local path or URL — re-ask if missing) and run **in the background** — the worker performs the key gate itself on first need; just relay its printed instructions if registration starts:

- Single: `node scripts/dubbing.mjs "<file|URL>" [--source auto] [--target en] [--space "space name"] [--out result.mp4] [--lipsync] [--no-save]`
- Multi-language / multi-input (one or more inputs; URLs and files can be mixed): `node scripts/dubbing.mjs "<URL>" "<file>" --target en,ja` — one output per input × language, saved next to each source (`--out <folder>` collects them).
- Folder (batch): `node scripts/dubbing.mjs "<folder>" [--target en,zh] [--recursive] [--out output-folder]`

**Save location** — default is next to each source file; don't ask. On the session's first job, state it in the kickoff line (e.g. "Results will be saved next to the originals — tell me now if you'd like a different folder") and start right away, without waiting for an answer. If the user names a folder — with this request or any time later in this session — run with `--out "<folder>"` and keep using that folder for every later job until they change it. If they redirect after a run already started, move the finished files there when the run completes. Exception: when every input is a URL (no local source folder), ask where to save before starting.

**Space selection** — with several workspaces the worker stops before uploading, prints `[space-select]` lines (**name | (plan) | remaining credits**) and stops. Show the user ONLY those options (no internal numbers), ask which one, and re-run with `--space "<space name>"`. One space → no question; `PERSO_SPACE_SEQ` pins it.

**Split confirmation** — if the input exceeds the length or size limit and must be auto split & merged (dubbing, dub+lip-sync, or audio separation), the worker stops and prints `[split-confirm]` lines. Relay them and ask the user: it exceeds the length/size limit, so it needs **automatic split → process → merge**, which can come out **less polished than splitting it up themselves** — proceed automatically? On a yes, re-run the **same command with `--allow-split`** (nothing is billed until this point, so re-running is free). Batch runs: `--allow-split` authorizes every split in the run.

**Don't save (server-only)** — when the user wants the video dubbed but **not** saved as a local file, add `--no-save`: the worker leaves the result in the user's Perso workspace and skips the download, printing `Kept on server, not saved: … → project <seq>` (the `[project-ref]` line is still emitted, so the dub can be lip-synced or retrieved later). **Single/unsplit videos only** — a split video's merged file needs a local download, so it is saved normally and the worker says so. Cannot be combined with `--lipsync` (the lip-synced video must be downloaded).

While it runs (for explaining the wait):

- **Split**: the whole file is uploaded first; only a plan-limit rejection installs ffmpeg and splits losslessly. External URLs (YouTube·TikTok·Drive·Vimeo) are handled server-side.
- **Queue**: all inputs × parts × languages share one pool; a full queue is re-checked every 5 minutes. An engine error on a part cancels that part's other languages; a silent part passes the original through; an idle guard prevents hanging forever.
- **Save**: parts are merged back into one file per (input × language). An unsplit output keeps the Perso filename; a merged one is `<original-name>.dubbed.<lang>.<ext>`; collisions get `_2`,`_3`….

## Lip-sync

Lip-sync (mouth matched to the dubbed audio) runs **after** dubbing, on the finished dubbing project. Video only — audio inputs are rejected. It is a long job: **run in the background and tell the user up-front it takes considerably longer than dubbing.** Credits (server billing is authoritative): dubbing ≈ seconds ×1 · lip-sync ≈ ×2 · both ≈ ×3 — dubbing now + lip-sync later costs the same as both at once. **4K+ sources: every rate ×3 on pro/business/enterprise plans** (e.g. a 1-min 4K dub+lip-sync ≈ 60×3×3 = 540) — mention this when the video is 4K.

Pick the flow by what exists:

1. **New video + lip-sync** — one command runs the whole chain (dub → lip-sync → save); warn that both stages bill:
   `node scripts/dubbing.mjs "<file|URL>" --target en --lipsync`
   If `[credit-check]` lines print and it stops, the estimate exceeds the remaining credits: show those lines (top-up URL included), and re-run with `--force` only after the user tops up or approves continuing anyway.
2. **Dubbed earlier in this session** — every finished run prints a `[project-ref] {...}` line. **Keep it; never show it to the user.** Lip-sync without re-dubbing (×2, no dubbing charge):
   `node scripts/dubbing.mjs --lipsync-only '<that [project-ref] JSON>'`
3. **No [project-ref] in this session** — ask if the user knows the project number from the Perso portal (`--lipsync-only <number>`, ×2). Otherwise the video must be dubbed again (`--lipsync`, ×3) — confirm before re-dubbing.

Rules:

- **Repeating lip-sync on the same project bills again** (no server-side dedup). If this session already lip-synced it, point at the existing file and re-run only on explicit confirmation.
- **If lip-sync fails, the worker saves the dubbed video instead** and says so in the final report — relay that clearly; the dubbing credits are not wasted.
- Credits running out between dubbing and lip-sync: the dubbed videos are saved and continuing finishes only the lip-sync — relay the top-up URL, and continue via the `[resume-state]` path once paid (see **Interruption & resume**).

## Speaker (dubbing projects only)

To assign a **new speaker** to one or more sentences of an already-dubbed project, run:

`node scripts/speaker.mjs "<project URL|projectSeq>" --at "5s,22s,98s"` (comma-separated timecodes/ranges)
`node scripts/speaker.mjs "<project URL|projectSeq>" --text "first line|second line"` (pipe-separated, quoted text)
`node scripts/speaker.mjs "<project URL|projectSeq>" --sentence 1234,1288` (re-run after a `[sentence-select]` question)
`node scripts/speaker.mjs "<project URL|projectSeq>" --list` (browse the project's sentences to find the right target)

**Dubbing projects only** — the worker rejects subtitle (STT), audio-separation, and lip-sync projects, and unfinished/failed ones. It works out the workspace on its own from the project link; you don't need to ask which space.

**A pause is not a failure.** A `[sentence-select]` line means the worker couldn't pin down a single target (nothing was given, nothing matched, or more than one sentence matched) — it exits cleanly to ask you something, not because it failed. The numbered list under it (index, time label, text) is safe to relay to the user as-is. Right after that list, a `[sentence-ref]` line prints a JSON map of the same numbers to the worker's internal sentence numbers — that line is **your own lookup only**: never show it or read it aloud. Once the user picks a number, look it up in that map and re-run the same command with `--sentence` set to that value. A `[speaker-resolve]` block alongside it means some targets already resolved but **nothing was written yet** — it has its own numbered list and its own `[sentence-ref]` line; the re-run's `--sentence` list must include both those already-resolved values and the newly chosen one(s), or the resolved ones would be dropped. When a run prints more than one `[sentence-select]` group (several ambiguous targets at once), each group has its own list and its own `[sentence-ref]` right after it — the numbering restarts per group, so don't mix a number from one group with the ref line of another. A `[speaker-confirm]` line (more than 10 targets at once) works the same way — a numbered list, then its `[sentence-ref]` — and needs a plain yes/no before writing.

Relay `[progress]` lines as the worker reads the script, and `[speaker-added]` lines as each new speaker is created. On `[script-unavailable]`, relay the printed status (still generating / failed / try again) rather than treating it as an error — the project itself is fine, its script just isn't readable yet.

Pass `--host` silently, same as the other commands. If the user wants the project link, build it from whatever project reference they originally gave you — don't invent one.

## Audio separation

To split voice from background sound (no dubbing involved), run **in the background**:

`node scripts/dubbing.mjs --separate "<file|URL|folder>" [--space "space name"] [--out folder]`

- Outputs per input, next to the source (`--out` is a folder here): `<name>.voice.wav` · `<name>.background.wav` · `<name>.sub_background.wav`.
- Credits ≈ seconds ×0.5. No language options; cannot combine with lip-sync flags.
- Auto-split/merge, key gate, `[space-select]` and `[progress]` rules apply unchanged.
- **Resume** — separation saves the same `*.dubresume.json` state with a per-part checkpoint, so an interrupted run (credits, crash, killed shell) continues **without re-submitting already-paid parts**. It uses the same `[resume-state]` handling as dubbing (see **Interruption & resume**); re-running the original command is blocked (`[resume-check]`).

## Interruption & resume

The worker saves a state file (`*.dubresume.json`, next to the source or `--out`) from the moment the split plan is known and after every completed piece, so a run that dies for ANY reason (credits, crash, killed shell) continues without redoing paid work. When continuing is possible the worker prints a **`[resume-state] <path>` marker**.

**`[resume-state]` is for you, not the user — never show it or the raw `--resume` command.** Instead tell the user in natural language what finished and what didn't, and offer to continue. When the user agrees, run `node scripts/dubbing.mjs --resume "<that path>"` (already-completed parts are skipped and not re-billed; the state file is deleted when everything finishes). Delete the state file only if the user explicitly chooses to start over and pay for completed parts again — never on your own.

**Partial / failed segments.** When a split run finishes with missing segments, relay it conversationally: how many segments succeeded and failed, and — from the worker's per-segment lines — which failures are *recoverable* ("recoverable at no extra charge by continuing") versus *permanently failed* ("cannot be recovered"). Offer to continue (fills the recoverable ones; permanent ones stay missing). Also offer to show the successful segments now: they are already saved locally (state the paths), or you can give a Perso link to view them (build it from the `[project-ref]` seqs — see the URL patterns below).

**On an insufficient-credits stop**: the completed parts are delivered; tell the user the rest needs a top-up, then continuing finishes it without re-charging paid work. The worker's guidance points to `scripts/billing.mjs` for a payment link — see **Plan upgrade & credits** below — and prints a `[resume-state]` marker to continue after payment.

## Plan upgrade & credits

When the user runs out of credits (the stop above) **or** asks to upgrade / buy more credits, you can generate a Stripe payment link. **You only ever hand the link to the user — never open it or complete payment yourself**, even if the user asks you to pay.

Run this first — it detects the plan and prints the fitting flow, the choices, and (with `--shortfall`) a recommendation:

`node scripts/billing.mjs options [--shortfall <estimated remaining credits>] [--space "<space name>"]`

It routes by the current plan tier — ask only the question for that branch, then generate the link:

- **free → subscribe.** Ask which plan and **monthly or yearly** (starter is monthly-only). Currency defaults to USD; use KRW only if the user asks.
  `node scripts/billing.mjs link --checkout --plan <starter|creator|pro> --period <monthly|yearly> [--currency usd|krw]`
- **starter / creator → change plan.** Ask which plan; billing period and currency are locked to the existing subscription (handled automatically).
  `node scripts/billing.mjs link --billing --plan <creator|pro>`
- **pro / business → buy credits.** Ask how many packs (1 pack = 60 credits, USD). With `--shortfall`, `options` recommends a quantity.
  `node scripts/billing.mjs link --credits --quantity <n>`
- **enterprise → no self-serve.** Tell the user to contact their workspace administrator.

**Recommending on a credit-out stop**: estimate the remaining work's credits (dubbing ≈ ×1/s · lip-sync ≈ ×2 · separation ≈ ×0.5, and ×3 for 4K on pro+), pass it as `--shortfall`, and relay the tool's recommendation. If even the top self-serve plan or a reasonable credit quantity can't cover it, point the user to their administrator (Enterprise) instead.

Hand the returned link to the user to complete payment in their browser; after they top up, continue the interrupted job via its `[resume-state]` path (no re-billing).

## Perso portal (answer only when asked)

Every run is also a project in the user's Perso workspace. If the user wants to open a result on Perso (more than the delivered files — subtitles, audio-only, other formats — or to browse/re-download), give them the project link, built from the project's seq:

- **dubbing / lip-sync** → `https://perso.ai/en/workspace/vt/detail/<seq>` (seq = a part's `seq` from the run's `[project-ref]` line)
- **subtitles (STT)** → `https://perso.ai/en/workspace/vt/stt/<seq>` (seq from the `[srt-original]` line)
- **audio separation** → `https://perso.ai/en/workspace/vt/audio-separation/<seq>`

A split or multi-language run spans several projects (split parts numbered `_01`, `_02`, …) — link the one the user asked about, or the whole workspace `https://perso.ai/en/workspace/vt` if they just want to browse. Never add any of this to progress relays or final reports — only when the user asks.

## Version updates

Once a day (first run after 00:00 UTC) the worker checks npm for a newer release and, **after the current job finishes** (never mid-run), may print a one-line `ℹ️  Update available: …` notice. When you see it, relay it and act by install method:

- **Claude Code plugin (marketplace):** tell the user to run `/plugin update perso-dubbing` — a slash command you cannot run yourself.
- **npx / manual install:** ask the user whether to update, and on yes run `npx perso-dubbing@latest`.

The notice lists both commands; pick the one matching how it was installed. It never blocks a run and can be silenced with `PERSO_NO_UPDATE_CHECK=1`.

## Config (env)

- `PERSO_API_BASE` — API base URL (default `https://api.perso.ai`). **https `perso.ai` hosts only** — anything else is rejected at startup (the API key travels in a header to this host).
- `PERSO_MEDIA_BASE` — media host for result files (default `https://portal-media.perso.ai`). Prepended when a response path is relative. Same https `perso.ai`-only rule.
- `PERSO_SPACE_SEQ` — pin the space to use for every run (skips the space question).
- `XP_API_KEY` — set the key directly (highest priority). Otherwise resolved from `~/.perso/credentials` (DPAPI-encrypted on Windows).
- `PERSO_NO_WATCH` — when no key is registered, `dubbing.mjs` normally self-heals by opening a key file and waiting for the user to paste the key. Set this to fail fast instead (headless/CI).
- `PERSO_NO_OPEN` — don't auto-open the key file in an editor during key registration (headless; the file path is still printed).
- `PERSO_SIZE_CAP_BYTES` — upload size cap used for the split decision (default ≈1.9 GB, under the API's 2 GB limit).
- `PERSO_QUEUE_WAIT_MS` — how long to wait between queue re-checks when all slots are occupied by other jobs (default 5 minutes).
- `PERSO_LIPSYNC_IDLE_MS` — no-progress allowance for a lip-sync job whose video length is unknown (default 3 hours).
- `PERSO_NO_UPDATE_CHECK` — skip the once-a-day npm version-update check (headless/CI, or to avoid the extra network call).
- `PERSO_NO_TELEMETRY` — turn off usage telemetry (opt-out). The API key and media content are never sent; see the README "Privacy & Telemetry" section.

## Advanced (debug only — not part of the normal flow)

`dubbing.mjs` already does all of this internally; use these only to diagnose a problem:

- `node scripts/prepare_input.mjs "<input>"` — input normalization check (prints JSON).
- `node scripts/probe_split.mjs '<JSON|path>'` — upload-first split decision. ⚠ Performs a **real upload**; never use it as a pre-step to `dubbing.mjs`.
- `node scripts/languages.mjs` — list supported language codes.
- `node scripts/check_deps.mjs` — check/auto-install ffmpeg/ffprobe.
