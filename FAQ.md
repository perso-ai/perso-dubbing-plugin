# /dubbing — FAQ

**English** ｜ [한국어](docs/ko/FAQ.md) ｜ [Español](docs/es/FAQ.md) ｜ [Português](docs/pt/FAQ.md) ｜ [Русский](docs/ru/FAQ.md) ｜ [Bahasa Indonesia](docs/id/FAQ.md) ｜ [Deutsch](docs/de/FAQ.md) ｜ [ไทย](docs/th/FAQ.md) ｜ [日本語](docs/ja/FAQ.md) ｜ [繁體中文](docs/zh-TW/FAQ.md) ｜ [简体中文](docs/zh-CN/FAQ.md) ｜ [Tiếng Việt](docs/vi/FAQ.md) ｜ [Français](docs/fr/FAQ.md)

Common questions about the `/dubbing` skill. For setup and usage, see the [README](README.md).

### What do I need to use it?

Node.js 18+ and a Perso Dubbing API key. Install the skill, then just say *"dub this video for me."* → [Get an API key](https://developers.perso.ai/api-keys)

### How do I register my API key?

On the first run a key file opens automatically — paste **only your API key** into that file and save (it is encrypted and the file is deleted). **Never paste the key into the chat.** Manual check: `npm run key:check`.

### Does it cost money?

The skill's code is free (MIT), but the dubbing runs through the Perso API, which bills credits: dubbing ≈ 1 credit/sec, lip-sync ≈ ×2, audio separation ≈ ×0.5. 4K sources are billed ×3 on pro/business/enterprise plans. The server's billing is authoritative.

### What can I feed it?

A local file, a whole folder (batch), or a URL — including YouTube, TikTok, Google Drive, and Vimeo. Oversized or very long videos are automatically split, processed, and merged back together.

### Can it dub into several languages, or process many files at once?

Yes. Put multiple languages in one command (`--target en,ja,zh`) — the source is uploaded and split once, then reused per language. You can also mix multiple files, folders, and URLs in a single run.

### Where are my results saved?

Next to the source video by default, or in the folder you pass with `--out`. Every run is also a project in your Perso portal (<https://portal.perso.ai>), where you can re-download it or get other formats.

### My brand name comes out translated or misspelled. Can I fix it?

Yes — pass a glossary with `--dict glossary.csv`. The translation model treats an unfamiliar brand name as a word to translate or correct, and it does not always decide the same way twice, so the same source can yield "Perso" on one run and "Persona" on the next. A glossary pins the term for every target language in the run.

The file must be a CSV whose first line is exactly `source,target`:

```csv
source,target
페르소,Perso
```

A file in any other shape is ignored by the server without an error — the run finishes with no output and no charge — so the plugin checks the file before it starts.

### What is lip-sync?

It matches the mouth movements to the dubbed audio. It runs after dubbing, works on video only, takes considerably longer, and costs extra credits. Add `--lipsync`.

### What is audio separation?

It splits the source into voice / background / sub-background tracks — no dubbing involved. Add `--separate`.

### It stopped midway (out of credits, a crash, or a killed shell). Now what?

Progress is saved to a `*.dubresume.json` state file throughout the run. Re-run the printed `--resume "<state-file>"` command to finish only the remaining parts — completed parts are skipped and never re-billed.

### I ran out of credits. How do I top up?

The skill can generate a Stripe payment link (subscribe, change plan, or buy credits, depending on your plan). You open the link and pay yourself — the agent never pays on your behalf. After topping up, resume with the printed `--resume` command.

### Can I dub without saving a local file?

Yes, for a single (unsplit) video: add `--no-save`. The result stays in your Perso workspace and is not downloaded. Split videos are still saved normally, because the merged file needs a local download.

### `node` was not found — what do I do?

The skill needs Node.js 18+. Check with `node -v`; install the LTS from <https://nodejs.org>, or simply ask the agent to install it for you, then retry.

### How do I update the skill?

`npx perso-dubbing@latest`, or in the Claude Code plugin: `/plugin update perso-dubbing`.

### What data does the skill collect?

Anonymous usage events only — which action ran, whether it succeeded, coarse counts, app version, and OS — tagged with a random per-install ID. It never includes your API key, file names or media content, account/email, or workspace IDs.
