# 🎬 /dubbing — Automatische Video-Synchronisation mit Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ **Deutsch** ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

Eine Skill für Coding-Agents, die das **Dubbing (KI-Synchronisation)** von [Perso AI](https://perso.ai) in deinen Agenten bringt. Sie **synchronisiert Videos automatisch** in andere Sprachen — eine einzelne Datei oder einen ganzen Ordner —, und selbst übergroße oder sehr lange Mediendateien werden automatisch aufgeteilt, verarbeitet und wieder zusammengeführt. Sie kann das synchronisierte Video außerdem **lippensynchronisieren** und **die Stimme vom Hintergrundton trennen**.

Im Hintergrund ruft sie die Perso Dubbing API auf, daher **wird ein Perso Dubbing API-Schlüssel benötigt.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">API-Schlüssel holen</a>

Da jeder Host denselben **Agent Skills**-Standard (`SKILL.md`) verwendet, funktioniert sie überall identisch, egal wo du sie installierst — führe einfach `/dubbing` aus oder sage *„synchronisiere dieses Video für mich"*.

---

## 🖥️ Der einfachste Weg — die Claude-Desktop-App (ca. 3 Minuten)

Kein Terminal nötig. In der <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude-Desktop-App</a> (kostenpflichtiger Plan):

1. **Öffne den Code-Tab** (oben in der Mitte) und wähle einen beliebigen Ordner — wähle die Umgebung **Local** (Plugins sind in Cloud-Sitzungen nicht verfügbar).
2. **Füge jeden Befehl** einzeln in das Eingabefeld ein und drücke Enter:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Lieber klicken? Drücke nach dem ersten Befehl die Schaltfläche **+** neben dem Eingabefeld → **Plugins** → **Add plugin** → installiere **perso-dubbing**.*
3. **Fordere eine Synchronisation an** — z. B. *„Synchronisiere dieses Video ins Englische — C:\videos\clip.mp4"* (eine YouTube-URL oder ein ganzer Ordner funktionieren ebenfalls). Beim ersten Durchlauf öffnet sich eine Schlüsseldatei für deinen <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Perso-API-Schlüssel</a> — füge den Schlüssel in diese Datei ein, **nicht in den Chat**. Sofern du nicht `--out` angibst, werden die Ergebnisse neben dem Ausgangsvideo gespeichert.

> 💡 Die Skill selbst läuft mit **Node.js 18+**. Falls dein PC das nicht hat, meldet der Agent, dass `node` nicht gefunden wurde — antworte einfach mit *„installiere Node.js für mich"* (oder lade die LTS-Version von <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> herunter) und versuche es erneut.

In der **Claude Code CLI** verwenden Sie stattdessen `/plugin marketplace add perso-ai/perso-dubbing-plugin` und `/plugin install perso-dubbing@perso-ai`.

---

## Installation auf anderen Hosts

Die Abkürzung, die überall funktioniert: Füge die URL dieses Repositorys in deinen Agenten ein und sage *„installiere das"*.

> **🤖 An den Agenten:** Wenn dir nur die URL dieses Repositorys gegeben wurde, wähle den passenden Weg für deinen Host:
>
> - **Claude Code (Desktop-App oder CLI):** Führe **nicht** sofort npx aus — selbst wenn der Nutzer „installiere das" sagt. Zeige dem Nutzer die beiden -Befehle aus dem Abschnitt *Claude-Desktop-App* oben und bitte ihn, die Befehle selbst einzugeben, einen pro Nachricht (es handelt sich um vom Nutzer einzugebende Slash-Befehle, die du nicht ausführen kannst). Erwähne auch den Klick-Weg in der Desktop-App: Nach dem ersten Befehl **+-Schaltfläche → Plugins → Add plugin**. Falls du die Formulierung anpassen musst: `CLAUDE_CODE_ENTRYPOINT=cli` in deiner Shell-Umgebung deutet auf eine Terminal-Sitzung hin (undokumentiertes Signal — im Zweifel beide Wege zeigen). Greife nur dann auf npx zurück, wenn der Nutzer, nachdem er sie gesehen hat, weiterhin möchte, dass du die Installation übernimmst.
> - **Codex · Cursor · Antigravity, oder der Nutzer hat dir die Installation übertragen:** Führe diesen einen Befehl aus — er lädt das Paket herunter, erkennt automatisch alle installierten Hosts und installiert die Skill in jeden davon:
>
> ```bash
> npx perso-dubbing
> ```
>
> Falls das Repository bereits geklont ist, führe stattdessen `node scripts/install.mjs` im Root-Verzeichnis des Repositorys aus (keine Netzwerkverbindung nötig).

<details>
<summary><b>Codex</b></summary>

Codex liest Skills aus dem gemeinsamen Agent-Skills-Ordner. Führe `npx perso-dubbing --codex` aus oder kopiere manuell:

```text
~/.agents/skills/dubbing/        # persönlich (alle Repos) — aktuelles Codex
~/.codex/skills/dubbing/         # ältere Codex-Versionen (der Installer schreibt beide)
<repo>/.agents/skills/dubbing/   # nur dieses Repository
```

Das Repository enthält außerdem ein Codex-Plugin-Manifest (`.codex-plugin/plugin.json`) für Installationen über den Marketplace.

</details>

<details>
<summary><b>Cursor</b></summary>

Führe `npx perso-dubbing --cursor` aus oder kopiere in:

```text
~/.cursor/skills/dubbing/        # global
.cursor/skills/dubbing/          # nur dieses Projekt
```

Das Repository enthält ein Cursor-Plugin-Manifest (`.cursor-plugin/plugin.json`) für den Cursor-Plugin-Marketplace.

</details>

<details>
<summary><b>Antigravity</b></summary>

Führe `npx perso-dubbing --antigravity` aus oder kopiere in einen der beiden Orte:

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+ (gemeinsamer Agent-Skills-Ordner)
```

</details>

<details>
<summary><b>⚡ Ein-Zeilen-Installer (beliebiger Host)</b></summary>

Erkennt, welche Hosts du nutzt, und installiert die Skill in alle — kein Klonen nötig:

```bash
npx perso-dubbing
```

- Nur ein bestimmter Host: `--claude` / `--antigravity` / `--codex` / `--cursor` · alle: `--all`
- Nur das aktuelle Projekt (`./.claude`, `./.agents`, …): `--project`

Hast du das Repository bereits geklont? `node scripts/install.mjs` im Root-Verzeichnis des Repositorys macht dasselbe, ganz ohne Netzwerk.

</details>

<details>
<summary><b>🔧 Manuelle Installation</b></summary>

Kopiere den Skill-Ordner in das Skills-Verzeichnis deines Hosts unter dem Namen **`dubbing`**. Vom Root-Verzeichnis des Repositorys aus:

```bash
# macOS / Linux
mkdir -p <skills_folder>/dubbing && cp -r skills/dubbing/* <skills_folder>/dubbing/
```

> 💡 Windows (PowerShell): `New-Item -ItemType Directory -Force <skills_folder>\dubbing; Copy-Item .\skills\dubbing\* <skills_folder>\dubbing\ -Recurse`

</details>

Tippe nach der Installation **`/dubbing`** in deinen Agenten ein oder sage einfach **„synchronisiere dieses Video für mich"**, um es auszuführen.

---

## Beispiele

Der einfachste Weg — sag es einfach deinem Agenten:

> „Synchronisiere dieses Video ins Englische — C:\videos\clip.mp4"

Du kannst die CLI auch direkt vom Root-Verzeichnis des Repositorys aus ausführen:

```bash
# Ein Video (automatische Erkennung der Ausgangssprache → Englisch)
npm run dub -- "clip.mp4" --target en --out result.mp4

# Mehrere Sprachen auf einmal (wird einmal hochgeladen/aufgeteilt und pro Sprache wiederverwendet)
npm run dub -- "clip.mp4" --target en,ja,zh

# Mehrere Eingaben auf einmal (URLs, Dateien und Ordner lassen sich mischen)
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# Synchronisation + Lippensynchronisation (Mund an das synchronisierte Audio angepasst; zusätzliche Credits)
npm run dub -- "clip.mp4" --target en --lipsync

# Stimme / Hintergrundton trennen (ohne Synchronisation)
npm run dub -- "clip.mp4" --separate
```

*(Entsprechender direkter Aufruf: `node skills/dubbing/scripts/dubbing.mjs …` — oder `node scripts/dubbing.mjs …` innerhalb eines installierten Skill-Ordners.)*

---

## Fehlerbehebung

Weitere Fragen? Sieh dir die **[FAQ](FAQ.md)** an.

| Symptom | Lösung |
|---|---|
| Die Claude-Desktop-App fragt nach Git (Windows) | Der Code-Tab benötigt bei der ersten Nutzung <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git für Windows</a>. Installiere es und starte die App neu. |
| `claude`-Befehle oder das Plugins-Menü reagieren nicht | Du befindest dich in einer **Cloud-Sitzung** — Plugins funktionieren nur in **Local**- (und SSH-)Sitzungen. Wechsle die Umgebung zu Local und versuche es erneut. |
| `node` nicht gefunden / Installation oder Ausführung schlägt fehl | Die Skill läuft mit **Node.js 18+** — prüfe das mit `node -v`. Falls es fehlt, installiere die LTS-Version von <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>, oder bitte Claude in der Sitzung einfach, sie für dich zu installieren, und starte die App dann neu. |
| Noch kein API-Schlüssel | Führe einfach einen beliebigen Synchronisations-Befehl aus — eine Schlüsseldatei öffnet sich automatisch; füge deinen Schlüssel ein und speichere (er wird verschlüsselt und die Datei wird gelöscht). Manuelle Prüfung: `npm run key:check`. **Füge den Schlüssel nicht in den Chat ein.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">API-Schlüssel holen</a> |
| Fehler im Zusammenhang mit ffmpeg | ffmpeg wird normalerweise automatisch installiert. Falls es fehlschlägt, führe `npm run doctor` aus. |
| Bricht mittendrin ab (Credits aufgebraucht, Absturz, abgebrochener Prozess) | Der Fortschritt wird während des gesamten Laufs in einer Zustandsdatei `*.dubresume.json` gespeichert. Führe den in der Meldung angezeigten Befehl **`--resume "<state-file>"`** aus, um nur die verbleibenden Teile fertigzustellen (bereits abgeschlossene Teile werden automatisch übersprungen). |

---

## Datenschutz & Telemetrie

`/dubbing` sendet **anonyme** Nutzungsereignisse, um die Skill zu verbessern — zum Beispiel, welche Aktion ausgeführt wurde (Synchronisation / Lippensynchronisation / Trennung), ob sie erfolgreich war, das Sprachpaar, die App-Version und das Betriebssystem. Sie werden nur mit einer zufälligen, installationsspezifischen ID versehen und enthalten niemals deinen API-Schlüssel, Dateinamen oder Medieninhalte, Konto/E-Mail oder Workspace-IDs.

---

## Repository-Struktur

```text
.claude-plugin/    Claude Code Plugin- und Marketplace-Manifeste
.codex-plugin/     Codex-Plugin-Manifest
.cursor-plugin/    Cursor-Plugin-Manifest
docs/              Übersetzte README und FAQ (12 Sprachen)
skills/dubbing/    Die Skill selbst (SKILL.md · lib/ · scripts/) — eigenständig
scripts/           Installer auf Repo-Ebene (install.mjs)
```

## Lizenz

Der Code dieser Skill wird unter der **[MIT-Lizenz](../../LICENSE)** vertrieben. Die eigentliche Synchronisation erfolgt über die Perso Dubbing API, daher unterliegt die API-Nutzung selbst den [Nutzungsbedingungen von Perso AI](https://perso.ai) und deren Preisgestaltung.
