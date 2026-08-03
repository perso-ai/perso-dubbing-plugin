# 🎬 /dubbing — Perso Dubbing Videoübersetzung

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ **Deutsch** ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

Eine Skill für Coding-Agents, die die KI-Synchronisation von [Perso Dubbing](https://perso.ai/dubbing) in deinen Agenten bringt. Einmal installieren, dann einfach sagen: *„synchronisiere dieses Video ins Englische"*.

- ![kostenlos](https://img.shields.io/badge/%E2%9C%93%20kostenlos-2ea44f) **Gestylte Untertitel** — fertige oder eigens gestylte Untertitel ins Video einbrennen. **Das Highlight dieser Version.**
- ![kostenlos](https://img.shields.io/badge/%E2%9C%93%20kostenlos-2ea44f) **Untertitel übersetzen** — ein vorhandenes SRT in jede beliebige Sprache übertragen
- ![kostenlos](https://img.shields.io/badge/%E2%9C%93%20kostenlos-2ea44f) **Kurzclips** — ein langes Video in Kurzform-Highlights schneiden, von 16:9 → 9:16 neu einrahmen
- **Synchronisieren** in eine andere Sprache — eine einzelne Datei, einen ganzen Ordner oder eine URL
- **Lippensynchronisation** des synchronisierten Videos, damit der Mund zum neuen Audio passt
- **Trennen** von Stimme und Hintergrundton
- **Untertitel aus Sprache** — SRT per Speech-to-Text extrahieren (oder eigenes mitbringen → kostenlos)
- Übergroße und sehr lange Mediendateien werden automatisch aufgeteilt, verarbeitet und wieder zusammengeführt

> **Die Skill ist kostenlos und quelloffen (MIT).** Alles, was lokal auf deinem Rechner läuft, braucht **kein Konto und keine Credits** — gestylte Untertitel ins Video einbrennen, ein vorhandenes SRT übersetzen und Kurzclips schneiden. Die KI-Schritte, die auf Persos Servern laufen — Synchronisation, Lippensynchronisation, Stimm-/Hintergrund-Trennung, Speech-to-Text — nutzen Perso Dubbing API-Credits (**zahle nur für das, was du verarbeitest**).

Läuft mit **Node.js 18+**. Die kostenlosen Schritte benötigen nie einen Schlüssel; die serverseitigen KI-Schritte verwenden einen **Perso Dubbing API-Schlüssel**. Basiert auf dem Agent-Skills-Standard (`SKILL.md`) und verhält sich daher auf Claude, Codex und Antigravity identisch.

![Untertitel-Stilvorlagen](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif)

---

## Installation

> 📖 **[Visuelle Anleitung →](https://dubbing-plugin.perso.ai/en/)** — Agent auswählen und Befehle kopieren.

### Claude-Desktop-App — am einfachsten, kein Terminal (ca. 3 Minuten)

In der <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude-Desktop-App</a> (kostenpflichtiger Plan):

1. Öffne den **Code-Tab** (oben in der Mitte), wähle einen beliebigen Ordner und die Umgebung **Local** — Plugins funktionieren nicht in Cloud-Sitzungen.
2. Füge diesen Befehl in das Eingabefeld ein und drücke Enter:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
   ```

3. Fordere eine Synchronisation an — *„Synchronisiere dieses Video ins Englische — C:\videos\clip.mp4"*. Eine YouTube-URL oder ein Ordner funktionieren ebenfalls. Die Ergebnisse werden neben dem Ausgangsvideo gespeichert, sofern du nicht `--out` angibst.

**Claude Code CLI:** Verwende stattdessen `/plugin marketplace add perso-ai/perso-dubbing-plugin` und `/plugin install perso-dubbing@perso-ai`.

### Alle anderen Hosts

```bash
npx perso-dubbing
```

Erkennt, welche Hosts du hast, installiert beide Skills in jeden davon und gibt aus, wo sie jeweils gelandet sind. Ergänze `--claude` / `--codex` / `--antigravity` für einen einzelnen Host, `--all` für alle Hosts oder `--project` nur für das aktuelle Projekt. Repository bereits geklont? `node scripts/install.mjs` im Root-Verzeichnis des Repositorys macht dasselbe, ganz ohne Netzwerk.

<details>
<summary><b>🤖 An den Agenten</b> — Wenn dir nur die URL dieses Repositorys gegeben wurde</summary>

- **Claude Code (Desktop-App oder CLI)** — führe diesen einzeiligen Installationsbefehl selbst aus (nicht interaktiv und idempotent, gefahrlos wiederholbar):

  ```bash
  claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
  ```

  Wenn beide erfolgreich waren, bitte den Nutzer, eine neue Sitzung zu starten (oder Claude Code neu zu starten) — `/dubbing` und `/srt` werden ab der nächsten Sitzung geladen. Nur wenn die `claude`-CLI in deiner Shell nicht verfügbar ist, greife darauf zurück, dem Nutzer den Befehl oben zum Selbsteintippen zu zeigen.
- **Codex · Antigravity, oder der Nutzer hat dir die Installation übertragen** — führe `npx perso-dubbing` aus (oder `node scripts/install.mjs`, falls das Repository bereits geklont ist).
- **ChatGPT (Web/App — kein Terminal auf dem Rechner des Nutzers)** — lies https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/chatgpt-setup.md und folge ihm: Bring zuerst **Codex** auf dem Rechner des Nutzers zum Laufen — die Installation geht dort weiter. (Schon in Codex mit Terminal? Nimm den Punkt oben.)
- **Gemini (Web/App — kein Terminal auf dem Rechner des Nutzers)** — lies https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/gemini-setup.md und folge ihm: Installiere zuerst **Antigravity** — die Installation geht dort weiter. (Schon in Antigravity? Nimm den Punkt oben.)

</details>

### Erster Durchlauf — dein API-Schlüssel

Der Schlüssel wird nur benötigt, wenn eine Aktion die Perso-API verwendet (Synchronisation, Lippensynchronisation, Trennung, SRT-Extraktion) — Offline-Schritte wie das Einbrennen gestylter Untertitel in ein lokales Video oder das Übersetzen eines von dir bereitgestellten SRT fragen nie danach. Wird einer benötigt, öffnet sich eine Browser-Seite: Melde dich an und klicke einmal, dann wird dein Schlüssel ausgestellt und verschlüsselt auf diesem Rechner gespeichert. Nichts zu kopieren. Falls sich kein Browser öffnen lässt, öffnet sich stattdessen eine Schlüsseldatei — füge den Schlüssel dort ein und speichere; die Datei wird verschlüsselt und gelöscht.

<a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">API-Schlüssel holen</a> · jederzeit prüfbar mit `npm run key:check`

---

## Nutzung

Sag deinem Agenten einfach, was du willst:

> „Synchronisiere dieses Video ins Englische — C:\videos\clip.mp4"
>
> „Synchronisiere jedes Video in diesem Ordner ins Japanische und Spanische"
>
> „Synchronisiere diesen YouTube-Link ins Englische, mit Lippensynchronisation"
>
> „Trenne Stimme und Hintergrundmusik aus diesem Clip heraus"
>
> „Erstelle mir ein englisches SRT für dieses Video"
>
> „Füge diesem Video gestylte Untertitel hinzu — hier ist das SRT"
>
> „Schneide dieses Video von 2:00 bis 3:00 als Kurzclip"

Oder tippe **`/dubbing`** / **`/srt`**, um zu starten. Die vollständige Liste der CLI-Optionen erhältst du von deinem Agenten oder mit `npm run dub -- --help`.

---

## Fehlerbehebung

Weitere Fragen? Sieh dir die **[FAQ](FAQ.md)** an.

| Symptom | Lösung |
|---|---|
| `node` nicht gefunden | Installiere die LTS-Version von <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> (oder bitte deinen Agenten: *„installiere Node.js für mich"*) und versuche es erneut. |
| Die Claude-Desktop-App fragt nach Git (Windows) | Der Code-Tab benötigt bei der ersten Nutzung <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git für Windows</a>. Installiere es und starte die App neu. |
| `claude`-Befehle oder das Plugins-Menü reagieren nicht | Du befindest dich in einer **Cloud-Sitzung** — Plugins benötigen eine **Local**- (oder SSH-)Sitzung. |
| Schlüssel abgelehnt oder nicht vorhanden | Registriere ihn erneut: `node skills/dubbing/scripts/connect.mjs`. Prüfe den gespeicherten Schlüssel mit `npm run key:check`. |
| Fehler im Zusammenhang mit ffmpeg | ffmpeg wird normalerweise automatisch installiert; falls es fehlschlägt, führe `npm run doctor` aus. |
| Bricht mittendrin ab (Credits aufgebraucht, Absturz, abgebrochener Prozess) | Der Fortschritt wird laufend gespeichert. Führe den in der Meldung angezeigten Befehl **`--resume "<state-file>"`** aus — fertige Teile werden übersprungen und nie erneut berechnet. |

---

## Datenschutz & Telemetrie

`/dubbing`, `/srt` und `/clip` senden anonyme Nutzungsereignisse, um die Skills zu verbessern — welche Aktion lief und wie sie ausging, die Medienlänge, Stiloptionen, das grobe Gebietsschema, App-Version/OS sowie ob ein Perso-API-Schlüssel verwendet wurde (und registriert ist). Jedes Ereignis enthält eine zufällige, installationsspezifische ID und deine Workspace-Nummer; niemals deinen Schlüssel, deine Medien, Dateinamen oder Untertiteltexte. Deaktivieren mit `PERSO_NO_TELEMETRY`.

---

## Repository-Struktur

```text
.claude-plugin/    Claude-Code-Plugin + Marketplace-Manifeste
.codex-plugin/     Codex-Plugin-Manifest
docs/              GitHub-Pages-Landingpage + übersetzte READMEs · FAQ (12 Sprachen)
skills/dubbing/    Die Dubbing-Skill (SKILL.md · lib/ · scripts/) — eigenständig
skills/srt/        Die SRT-Untertitel-Skill (SKILL.md · scripts/) — nutzt die lib/ der Dubbing-Skill
skills/clip/       Die Kurzclip-Skill (SKILL.md · lib/ · scripts/) — nutzt die lib/ der Dubbing-Skill
scripts/           Installer auf Repository-Ebene (install.mjs)
```

## Lizenz

Der Code dieser Skill steht unter der **[MIT-Lizenz](../../LICENSE)**. Die eigentliche Synchronisation läuft über die Perso Dubbing API, daher unterliegt die API-Nutzung den [Nutzungsbedingungen von Perso AI](https://perso.ai) und deren Preisgestaltung.
