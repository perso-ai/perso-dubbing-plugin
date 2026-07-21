# 🎬 /dubbing — Perso Dubbing Videoübersetzung

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ **Deutsch** ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

Eine Skill für Coding-Agents, die die KI-Synchronisation von [Perso Dubbing](https://perso.ai/dubbing) in deinen Agenten bringt. Einmal installieren, dann einfach sagen: *„synchronisiere dieses Video ins Englische"*.

- **Synchronisieren** in eine andere Sprache — eine einzelne Datei, einen ganzen Ordner oder eine URL
- **Lippensynchronisation** des synchronisierten Videos, damit der Mund zum neuen Audio passt
- **Trennen** von Stimme und Hintergrundton
- **Untertitel** (`/srt`) — SRT per Speech-to-Text extrahieren, dein Agent übersetzt sie anschließend
- Übergroße und sehr lange Mediendateien werden automatisch aufgeteilt, verarbeitet und wieder zusammengeführt

Läuft mit **Node.js 18+** und benötigt einen **Perso Dubbing API-Schlüssel**. Basiert auf dem Agent-Skills-Standard (`SKILL.md`) und verhält sich daher auf Claude, Codex, Cursor und Antigravity identisch.

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## Installation

> 📖 **[Visuelle Anleitung →](https://dubbing-plugin.perso.ai/en/)** — Agent auswählen und Befehle kopieren.

### Claude-Desktop-App — am einfachsten, kein Terminal (ca. 3 Minuten)

In der <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude-Desktop-App</a> (kostenpflichtiger Plan):

1. Öffne den **Code-Tab** (oben in der Mitte), wähle einen beliebigen Ordner und die Umgebung **Local** — Plugins funktionieren nicht in Cloud-Sitzungen.
2. Füge jeden Befehl einzeln in das Eingabefeld ein und drücke Enter:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Lieber klicken? Nach dem ersten Befehl: Schaltfläche **+** → **Plugins** → **Add plugin** → **perso-dubbing**.*
3. Fordere eine Synchronisation an — *„Synchronisiere dieses Video ins Englische — C:\videos\clip.mp4"*. Eine YouTube-URL oder ein Ordner funktionieren ebenfalls. Die Ergebnisse werden neben dem Ausgangsvideo gespeichert, sofern du nicht `--out` angibst.

**Claude Code CLI:** Verwende stattdessen `/plugin marketplace add perso-ai/perso-dubbing-plugin` und `/plugin install perso-dubbing@perso-ai`.

### Alle anderen Hosts

```bash
npx perso-dubbing
```

Erkennt, welche Hosts du hast, installiert beide Skills in jeden davon und gibt aus, wo sie jeweils gelandet sind. Ergänze `--claude` / `--codex` / `--cursor` / `--antigravity` für einen einzelnen Host, `--all` für alle Hosts oder `--project` nur für das aktuelle Projekt. Repository bereits geklont? `node scripts/install.mjs` im Root-Verzeichnis des Repositorys macht dasselbe, ganz ohne Netzwerk.

> **🤖 An den Agenten:** Wenn dir nur die URL dieses Repositorys gegeben wurde:
>
> - **Claude Code (Desktop-App oder CLI)** — führe **kein** npx aus, selbst wenn der Nutzer „installiere das" gesagt hat. Zeige ihm die beiden `claude …`-Befehle oben und bitte ihn, jeden davon selbst einzutippen (es sind vom Nutzer einzugebende Slash-Befehle, die du nicht ausführen kannst), plus den Klick-Weg: Schaltfläche **+** → **Plugins** → **Add plugin**. Greife nur dann auf npx zurück, wenn er weiterhin möchte, dass du die Installation übernimmst.
> - **Codex · Cursor · Antigravity, oder der Nutzer hat dir die Installation übertragen** — führe `npx perso-dubbing` aus (oder `node scripts/install.mjs`, falls das Repository bereits geklont ist).

### Erster Durchlauf — dein API-Schlüssel

Es öffnet sich eine Browser-Seite: Melde dich an und klicke einmal, dann wird dein Schlüssel ausgestellt und verschlüsselt auf diesem Rechner gespeichert. Nichts zu kopieren. Falls sich kein Browser öffnen lässt, öffnet sich stattdessen eine Schlüsseldatei — füge den Schlüssel dort ein und speichere; die Datei wird verschlüsselt und gelöscht.

**Füge deinen API-Schlüssel niemals in den Chat ein.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">API-Schlüssel holen</a> · jederzeit prüfbar mit `npm run key:check`

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

`/dubbing` und `/srt` senden Nutzungsereignisse, um die Skills zu verbessern — zum Beispiel, welche Aktion ausgeführt wurde, ob sie erfolgreich war, die Medienlänge, die App-Version und das Betriebssystem. Jedes Ereignis enthält eine zufällige, installationsspezifische ID und deine Workspace-Nummer. Dein API-Schlüssel und deine Medien sind niemals enthalten. Mit `PERSO_NO_TELEMETRY` kannst du dies jederzeit deaktivieren.

---

## Repository-Struktur

```text
.claude-plugin/    Claude-Code-Plugin + Marketplace-Manifeste
.codex-plugin/     Codex-Plugin-Manifest
.cursor-plugin/    Cursor-Plugin-Manifest
docs/              GitHub-Pages-Landingpage + übersetzte READMEs · FAQ (12 Sprachen)
skills/dubbing/    Die Dubbing-Skill (SKILL.md · lib/ · scripts/) — eigenständig
skills/srt/        Die SRT-Untertitel-Skill (SKILL.md · scripts/) — nutzt die lib/ der Dubbing-Skill
scripts/           Installer auf Repository-Ebene (install.mjs)
```

## Lizenz

Der Code dieser Skill steht unter der **[MIT-Lizenz](../../LICENSE)**. Die eigentliche Synchronisation läuft über die Perso Dubbing API, daher unterliegt die API-Nutzung den [Nutzungsbedingungen von Perso AI](https://perso.ai) und deren Preisgestaltung.
