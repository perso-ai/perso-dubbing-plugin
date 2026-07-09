---
name: dubbing
description: Auto-dub (voice-translate) videos into other languages, with lip-sync (Perso AI Dubbing).
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
- **Unsupported formats are skipped automatically** and the rest keep processing — relay the skip notice.

## One-time setup

1. **API key** — no separate step: with no key registered, `dubbing.mjs` opens a key file on first run. Show the user the printed key-file path (clickable) and tell them to paste just the key and save (it's encrypted and the file deleted). Pre-check: `node scripts/resolve_key.mjs --check` (exit 2 = missing; `--watch` registers the same way — never start it while a run is already waiting for the key). Never paste the key into chat. Get a key: https://developers.perso.ai/api-keys
2. **ffmpeg/ffprobe** — auto-installed only when a video exceeds the plan limit and must be split (approve if permission is requested). Manual check: `node scripts/check_deps.mjs`.

## Run

After the key gate, collect the input (local path or URL — re-ask if missing) and run **in the background**:

- Single: `node scripts/dubbing.mjs "<file|URL>" [--source auto] [--target en] [--space "space name"] [--out result.mp4] [--lipsync] [--no-save]`
- Multi-language / multi-input (one or more inputs; URLs and files can be mixed): `node scripts/dubbing.mjs "<URL>" "<file>" --target en,ja` — one output per input × language, saved next to each source (`--out <folder>` collects them).
- Folder (batch): `node scripts/dubbing.mjs "<folder>" [--target en,zh] [--recursive] [--out output-folder]`

**Space selection** — with several workspaces the worker stops before uploading, prints `[space-select]` lines (**name | (plan) | remaining credits**) and exits (code 3). Show the user ONLY those options (no internal numbers), ask which one, and re-run with `--space "<space name>"`. One space → no question; `PERSO_SPACE_SEQ` pins it.

**Split confirmation** — if the input exceeds the length or size limit and must be auto split & merged (dubbing, dub+lip-sync, or audio separation), the worker stops (exit 3) and prints `[split-confirm]` lines. Relay them and ask the user: it exceeds the length/size limit, so it needs **automatic split → process → merge**, which can come out **less polished than splitting it up themselves** — proceed automatically? On a yes, re-run the **same command with `--allow-split`** (nothing is billed until this point, so re-running is free). Batch runs: `--allow-split` authorizes every split in the run.

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
   If `[credit-check]` lines print and it exits (code 3), the estimate exceeds the remaining credits: show those lines (top-up URL included), and re-run with `--force` only after the user tops up or approves continuing anyway.
2. **Dubbed earlier in this session** — every finished run prints a `[project-ref] {...}` line. **Keep it; never show it to the user.** Lip-sync without re-dubbing (×2, no dubbing charge):
   `node scripts/dubbing.mjs --lipsync-only '<that [project-ref] JSON>'`
3. **No [project-ref] in this session** — ask if the user knows the project number from the Perso portal (`--lipsync-only <number>`, ×2). Otherwise the video must be dubbed again (`--lipsync`, ×3) — confirm before re-dubbing.

Rules:

- **Repeating lip-sync on the same project bills again** (no server-side dedup). If this session already lip-synced it, point at the existing file and re-run only on explicit confirmation.
- **If lip-sync fails, the worker saves the dubbed video instead** and says so in the final report — relay that clearly; the dubbing credits are not wasted.
- Credits running out between dubbing and lip-sync: the dubbed videos are saved and resume finishes only the lip-sync — relay the printed top-up URL and resume command verbatim.

## Audio separation

To split voice from background sound (no dubbing involved), run **in the background**:

`node scripts/dubbing.mjs --separate "<file|URL|folder>" [--space "space name"] [--out folder]`

- Outputs per input, next to the source (`--out` is a folder here): `<name>.voice.wav` · `<name>.background.wav` · `<name>.sub_background.wav`.
- Credits ≈ seconds ×0.5. No language options; cannot combine with lip-sync flags.
- Auto-split/merge, key gate, `[space-select]` and `[progress]` rules apply unchanged.
- **Resume** — separation saves the same `*.dubresume.json` state with a per-part checkpoint, so an interrupted run (credits, crash, killed shell) continues with `node scripts/dubbing.mjs --resume "<state-file>"` **without re-submitting already-paid parts**. Re-running the original command is blocked (`[resume-check]`, exit 3) — run the printed `--resume` instead.

## Interruption & resume

The worker saves a state file (`*.dubresume.json`, next to the source or `--out`) from the moment the split plan is known and after every completed piece, so a run that dies for ANY reason (credits, crash, killed shell) resumes without redoing paid work:

```
node scripts/dubbing.mjs --resume "<state-file>"
```

Completed parts are skipped automatically; the state file is deleted when everything finishes.

**Re-running the original command while a state file exists is blocked** — the worker prints `[resume-check]` lines (exit 3) instead of re-billing. Relay the printed `--resume` command and run that. Delete the state file **only** if the user explicitly chooses to pay for the completed parts again — never on your own.

**On an insufficient-credits stop**: deliver the completed parts, then relay the worker's guidance and resume command **verbatim** — plain stdout (not `[progress]`), so don't drop it while summarizing. The guidance points to `scripts/billing.mjs` for a payment link — see **Plan upgrade & credits** below.

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

Hand the returned link to the user to complete payment in their browser; after they top up, resume the interrupted job with the printed `--resume` command (no re-billing).

## Perso portal (answer only when asked)

Every run is also a project in the user's Perso portal account. If the user wants more than the delivered files (subtitles, audio-only, other formats) or to browse/re-download earlier projects, point them to https://portal.perso.ai — projects live in the workspace used for the run; split parts are numbered `_01`, `_02`, …. Never add this to progress relays or final reports.

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
- `PERSO_NO_TELEMETRY` — turn off anonymous usage telemetry (opt-out). No account/key/file data is ever sent; see the README "Privacy & Telemetry" section.

## Advanced (debug only — not part of the normal flow)

`dubbing.mjs` already does all of this internally; use these only to diagnose a problem:

- `node scripts/prepare_input.mjs "<input>"` — input normalization check (prints JSON).
- `node scripts/probe_split.mjs '<JSON|path>'` — upload-first split decision. ⚠ Performs a **real upload**; never use it as a pre-step to `dubbing.mjs`.
- `node scripts/languages.mjs` — list supported language codes.
- `node scripts/check_deps.mjs` — check/auto-install ffmpeg/ffprobe.
