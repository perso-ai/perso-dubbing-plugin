<div align="center">

# Perso Dubbing Plugin

**Every video, every language. Dub, subtitle, and clip right from your coding agent.**
*"Dub this video into English" is the whole workflow.*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](LICENSE)
[![skills.sh](https://skills.sh/b/perso-ai/perso-dubbing-plugin)](https://skills.sh/perso-ai/perso-dubbing-plugin)

<sub>

**English** ｜ [한국어](docs/ko/README.md) ｜ [Español](docs/es/README.md) ｜ [Português](docs/pt/README.md) ｜ [Русский](docs/ru/README.md) ｜ [Bahasa Indonesia](docs/id/README.md) ｜ [Deutsch](docs/de/README.md) ｜ [ไทย](docs/th/README.md) ｜ [日本語](docs/ja/README.md) ｜ [繁體中文](docs/zh-TW/README.md) ｜ [简体中文](docs/zh-CN/README.md) ｜ [Tiếng Việt](docs/vi/README.md) ｜ [Français](docs/fr/README.md)

</sub>

</div>

<br>

| Feature | You say | You get | |
|---|---|---|---|
| **Dubbing** | *"Dub this video into Japanese"* | The same video, re-voiced | |
| **Lip-sync** | *"…with lip-sync"* | Mouth matched to the dubbed audio | |
| **Voice separation** | *"Split the voice from the music"* | Voice and background tracks | |
| **Subtitles from speech** | *"Make me an English SRT"* | An SRT extracted via STT | |
| **Subtitle translation** | *"Translate subs.srt into Spanish"* | Translated SRT, timing intact, QA included | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Styled subtitles** | *"Burn these subtitles onto the video"* | Styled subtitles on the video | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Short clips** | *"Cut 2:00–3:00 as a short"* | A 9:16 clip, reframed | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **AI highlights** | *"Pick the best moments as shorts"* | AI-selected highlight clips | |

Files, folders, and YouTube/TikTok URLs all work.

<br>

## Install

> **Agent installing from this repo URL?** In Claude Code, run this now (non-interactive, safe to re-run):
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> Have the user restart so `/dubbing`, `/srt`, `/clip` load. Other hosts: `npx perso-dubbing`. No terminal (ChatGPT / Gemini): [docs/chatgpt-setup.md](docs/chatgpt-setup.md) · [docs/gemini-setup.md](docs/gemini-setup.md)

**Claude desktop app** (paid plan): open the **Code tab**, pick a folder, choose **Local**, paste:

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI**: `/plugin marketplace add perso-ai/perso-dubbing-plugin`, then `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · anything else**: `npx perso-dubbing` detects your hosts and installs into each — or, cross-agent via [skills.sh](https://skills.sh/perso-ai/perso-dubbing-plugin):

```bash
npx skills add perso-ai/perso-dubbing-plugin
```

Requires **Node.js 18+**, nothing else. [Visual walkthrough](https://dubbing-plugin.perso.ai/en/) · [FAQ](FAQ.md)

<br>

<sub>FREE · RUNS LOCALLY</sub>

## Styled subtitles

Pick one of twelve presets, or just describe the look in plain words: *"yellow text, black outline, bottom."* The burn runs locally on ffmpeg: no upload, no queue, no account. Several languages? Each SRT gets its own finished video.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="12 subtitle style presets">
</p>

<br>

<sub>FREE · RUNS LOCALLY</sub>

## Translate subtitles

Hand over any SRT and name the languages you want. Several at once is fine, one pass covers them all. Every line keeps its exact original timing, appearing and disappearing at the same moments as before. Before delivery, the result is checked for lines that run too long or read too fast.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="Subtitle translation demo">
</p>

<br>

<sub>FREE · RUNS LOCALLY</sub>

## Short clips

Timecodes in, vertical shorts out: reframed 16:9 → 9:16, named, and ready for subtitles. Or hand over the transcript and AI picks the moments that work as shorts: opens on a hook, rides the reaction to its peak, cuts before the energy drops. 30–90 seconds each.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="Short clips demo: ask in chat, highlights picked on the timeline, 9:16 shorts out">
</p>

<br>

<sub>PERSO API</sub>

## Dubbing and lip-sync

One run takes a file, a whole folder, or a YouTube/TikTok URL and dubs it into several languages from a single upload. Videos over the plan limit split, process, and merge back on their own; an interrupted run resumes exactly where it stopped, never re-billing finished parts. Dubbing clones the original voice into the new language, and lip-sync moves the mouth to match that cloned audio.

<br>

<sub>PERSO API</sub>

## Subtitles from speech (STT)

No subtitles yet? Speech-to-text runs on Perso's servers and uses credits to turn the video's audio into an SRT in the original language, for one file or a whole folder. Every step after the SRT exists is free: translating, styling, burning.

<br>

<sub>PERSO API</sub>

## Voice separation

Splits a video or audio into clean tracks: the voice and the background. With several speakers, each person's voice comes out as its own track. Swap the soundtrack, remaster the dialogue, or reuse any track on its own.

<br>

## Free where it can be. Paid where it must be.

**MIT, free and open-source.** Everything that runs on your machine costs nothing and needs no account: styling and burning subtitles, translating an SRT you have, cutting clips at timecodes. Credits come in only when a job runs on Perso's servers: dubbing, lip-sync, voice separation, and speech-to-text, billed per processed second via the [Perso Dubbing API](https://developers.perso.ai/api-keys).

No setup ceremony. The first time a server job runs, a browser opens: sign in, one click, key stored encrypted. Free steps never ask.

<br>

---

<sub>**Privacy**: `/dubbing`, `/srt`, and `/clip` send usage events to improve the skills, covering what ran and how it went, media length, style choices, coarse locale, app version/OS, and whether a Perso API key was used (and registered). Each event has a random per-install ID and your workspace number; never your key, media, filenames, or subtitle text. Opt out with `PERSO_NO_TELEMETRY`.</sub>

<sub>**License**: the skill code is [MIT](LICENSE). API usage is subject to the [Perso AI Terms of Service](https://perso.ai) and pricing.</sub>
