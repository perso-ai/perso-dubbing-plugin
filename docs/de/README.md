<div align="center">

# Perso Dubbing Plugin

**Jedes Video, jede Sprache. Dubbing, Untertitel und Clips direkt aus deinem Coding-Agenten.**
*„Synchronisiere dieses Video auf Deutsch" und das ist schon der ganze Workflow.*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](../../LICENSE)

<sub>

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ **Deutsch** ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

</sub>

</div>

<br>

| Funktion | Du sagst | Du bekommst | |
|---|---|---|---|
| **Dubbing** | *„Synchronisiere dieses Video auf Japanisch"* | Dasselbe Video, neu vertont | |
| **Lip-Sync** | *„…mit Lip-Sync"* | Mundbewegungen passend zum Dubbing-Audio | |
| **Stimmtrennung** | *„Trenn die Stimme von der Musik"* | Stimm- und Hintergrundspuren | |
| **Untertitel aus Sprache** | *„Erstell mir eine englische SRT"* | Eine per STT extrahierte SRT | |
| **Untertitel übersetzen** | *„Übersetze subs.srt ins Spanische"* | Übersetzte SRT, Timing unverändert, QA inklusive | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Gestylte Untertitel** | *„Brenn diese Untertitel aufs Video"* | Gestylte Untertitel im Video | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Kurze Clips** | *„Schneide 2:00–3:00 als Short"* | Ein 9:16-Clip, neu gerahmt | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **KI-Highlights** | *„Such die besten Momente als Shorts raus"* | Von KI ausgewählte Highlight-Clips | |

Dateien, Ordner und YouTube-/TikTok-URLs funktionieren alle.

<br>

## Installation

> **Du bist ein Agent und installierst über diese Repo-URL?** Führe das in Claude Code jetzt aus (nicht interaktiv, gefahrlos wiederholbar):
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> Bitte den User danach um einen Neustart, damit `/dubbing`, `/srt` und `/clip` geladen werden. Andere Hosts: `npx perso-dubbing`. Ohne Terminal (ChatGPT / Gemini): [chatgpt-setup](../chatgpt-setup.md) · [gemini-setup](../gemini-setup.md)

**Claude-Desktop-App** (Bezahlplan): öffne den **Code-Tab**, wähl einen Ordner, wähl **Local** und füg ein:

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI**: `/plugin marketplace add perso-ai/perso-dubbing-plugin`, dann `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · alles andere**: `npx perso-dubbing` erkennt deine Hosts und installiert in jeden davon.

Du brauchst nur **Node.js 18+**, sonst nichts. [Visuelle Anleitung](https://dubbing-plugin.perso.ai/en/) · [FAQ](FAQ.md)

<br>

<sub>FREE · LÄUFT LOKAL</sub>

## Gestylte Untertitel

Wähl eins von zwölf Presets oder beschreib den Look einfach in eigenen Worten: *„gelber Text, schwarze Outline, unten."* Das Einbrennen läuft lokal über ffmpeg: kein Upload, keine Warteschlange, kein Account. Mehrere Sprachen? Jede SRT bekommt ihr eigenes fertiges Video.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="12 Untertitel-Stil-Presets">
</p>

<br>

<sub>FREE · LÄUFT LOKAL</sub>

## Untertitel übersetzen

Gib eine beliebige SRT rein und nenn die Sprachen, die du willst. Mehrere auf einmal sind kein Problem, ein Durchlauf erledigt sie alle. Jede Zeile behält exakt ihr Original-Timing und erscheint und verschwindet in denselben Momenten wie vorher. Vor der Auslieferung wird das Ergebnis noch auf Zeilen geprüft, die zu lang sind oder sich zu schnell lesen.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="Demo zur Untertitelübersetzung">
</p>

<br>

<sub>FREE · LÄUFT LOKAL</sub>

## Kurze Clips

Timecodes rein, vertikale Shorts raus: von 16:9 auf 9:16 neu gerahmt, benannt und bereit für Untertitel. Oder gib das Transkript ab und die KI wählt die Momente aus, die als Shorts funktionieren: startet mit einem Hook, trägt die Reaktion bis zum Höhepunkt und schneidet, bevor die Energie abfällt. Jeweils 30–90 Sekunden.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="Demo zu kurzen Clips: im Chat anfragen, Highlights auf der Timeline ausgewählt, 9:16-Shorts als Ergebnis">
</p>

<br>

<sub>PERSO API</sub>

## Dubbing und Lip-Sync

Ein Durchlauf nimmt eine Datei, einen ganzen Ordner oder eine YouTube-/TikTok-URL und synchronisiert sie mit einem einzigen Upload in mehrere Sprachen. Videos über dem Planlimit werden von selbst geteilt, verarbeitet und wieder zusammengefügt; ein unterbrochener Lauf setzt genau dort fort, wo er gestoppt hat, und fertige Teile werden nie erneut berechnet. Das Dubbing klont die Originalstimme in die neue Sprache, und Lip-Sync bewegt den Mund passend zu diesem geklonten Audio.

<br>

<sub>PERSO API</sub>

## Untertitel aus Sprache (STT)

Noch keine Untertitel? Speech-to-Text läuft auf Persos Servern und nutzt Credits, um das Audio des Videos in eine SRT in der Originalsprache zu verwandeln, für eine Datei oder einen ganzen Ordner. Sobald die SRT existiert, ist jeder weitere Schritt kostenlos: übersetzen, stylen, einbrennen.

<br>

<sub>PERSO API</sub>

## Stimmtrennung

Teilt ein Video oder Audio in saubere Spuren auf: die Stimme und den Hintergrund. Bei mehreren Sprechern kommt jede Stimme als eigene Spur heraus. Tausch den Soundtrack aus, remaster den Dialog oder nutz jede Spur für sich allein.

<br>

## Kostenlos, wo es geht. Bezahlt, wo es sein muss.

**MIT, kostenlos und Open Source.** Alles, was auf deinem Rechner läuft, kostet nichts und braucht keinen Account: Untertitel stylen und einbrennen, eine vorhandene SRT übersetzen, Clips an Timecodes schneiden. Credits kommen nur ins Spiel, wenn ein Job auf Persos Servern läuft: Dubbing, Lip-Sync, Stimmtrennung und Speech-to-Text, abgerechnet pro verarbeiteter Sekunde über die [Perso Dubbing API](https://developers.perso.ai/api-keys).

Kein Einrichtungsritual. Beim ersten Server-Job öffnet sich ein Browser: anmelden, ein Klick, der Key wird verschlüsselt gespeichert. Kostenlose Schritte fragen nie danach.

<br>

---

<sub>**Datenschutz**: `/dubbing`, `/srt` und `/clip` senden anonyme Nutzungsevents, um die Skills zu verbessern. Sie erfassen, was lief und wie es ausging, Medienlänge, Stilauswahl, grobe Locale, App-Version/OS und ob ein Perso-API-Key verwendet (und registriert) wurde. Jedes Event enthält eine zufällige Installations-ID und deine Workspace-Nummer; niemals deinen Key, deine Medien, Dateinamen oder Untertiteltexte. Opt-out per `PERSO_NO_TELEMETRY`.</sub>

<sub>**Lizenz**: Der Skill-Code steht unter [MIT](../../LICENSE). Die API-Nutzung unterliegt den [Nutzungsbedingungen von Perso AI](https://perso.ai) und deren Preisen.</sub>
