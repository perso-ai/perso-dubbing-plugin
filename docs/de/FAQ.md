# /dubbing — Häufig gestellte Fragen (FAQ)

[English](../../FAQ.md) ｜ [한국어](../ko/FAQ.md) ｜ [Español](../es/FAQ.md) ｜ [Português](../pt/FAQ.md) ｜ [Русский](../ru/FAQ.md) ｜ [Bahasa Indonesia](../id/FAQ.md) ｜ **Deutsch** ｜ [ไทย](../th/FAQ.md) ｜ [日本語](../ja/FAQ.md) ｜ [繁體中文](../zh-TW/FAQ.md) ｜ [简体中文](../zh-CN/FAQ.md) ｜ [Tiếng Việt](../vi/FAQ.md) ｜ [Français](../fr/FAQ.md)

Häufig gestellte Fragen zu den `/dubbing`- und `/srt`-Skills. Informationen zu Einrichtung und Nutzung findest du im [README](README.md).

### Was brauche ich, um sie zu nutzen?

Node.js 18+ und einen Perso Dubbing API-Schlüssel. Installiere die Skill und sage dann einfach *„synchronisiere dieses Video für mich"*. → [API-Schlüssel holen](https://developers.perso.ai/api-keys)

### Wie registriere ich meinen API-Schlüssel?

Beim ersten Durchlauf öffnet sich automatisch eine Schlüsseldatei — füge **nur deinen API-Schlüssel** in diese Datei ein und speichere (sie wird verschlüsselt und die Datei anschließend gelöscht). **Füge den Schlüssel niemals in den Chat ein.** Manuelle Prüfung: `npm run key:check`.

### Kostet es etwas?

Der Code der Skill ist kostenlos (MIT), aber die Synchronisation läuft über die Perso API, die Credits berechnet: Synchronisation ≈ 1 Credit/Sek., Lippensynchronisation ≈ ×2, Audiotrennung ≈ ×0,5. 4K-Quellen werden in den Plänen Pro/Business/Enterprise mit ×3 berechnet. Maßgeblich ist die Abrechnung des Servers.

### Was kann ich ihr als Eingabe geben?

Eine lokale Datei, einen ganzen Ordner (Stapelverarbeitung) oder eine URL — einschließlich YouTube, TikTok, Google Drive und Vimeo. Übergroße oder sehr lange Videos werden automatisch aufgeteilt, verarbeitet und wieder zusammengeführt.

### Kann sie in mehrere Sprachen synchronisieren oder viele Dateien auf einmal verarbeiten?

Ja. Gib mehrere Sprachen in einem Befehl an (`--target en,ja,zh`) — die Quelle wird einmal hochgeladen und aufgeteilt und anschließend für jede Sprache wiederverwendet. Du kannst außerdem mehrere Dateien, Ordner und URLs in einem einzigen Lauf mischen.

### Wo werden meine Ergebnisse gespeichert?

Standardmäßig neben dem Ausgangsvideo, oder in dem Ordner, den du mit `--out` angibst. Jeder Lauf ist außerdem ein Projekt in deinem Perso-Portal (<https://portal.perso.ai>), wo du es erneut herunterladen oder andere Formate erhalten kannst.

### Was ist Lippensynchronisation?

Sie passt die Mundbewegungen an das synchronisierte Audio an. Sie läuft nach der Synchronisation, funktioniert nur mit Video, dauert deutlich länger und kostet zusätzliche Credits. Füge `--lipsync` hinzu.

### Was ist die Audiotrennung?

Sie teilt die Quelle in Stimme / Hintergrund / Sub-Hintergrund-Spuren auf — ohne Synchronisation. Füge `--separate` hinzu.

### Kann sie auch Untertitel (SRT) statt Synchronisation erstellen?

Ja — das Paket installiert außerdem die **`/srt`**-Skill. Sie extrahiert die Untertitel in der Originalsprache aus einem Video, einer Audiodatei oder einer URL per Perso-Speech-to-Text, und dein Agent übersetzt sie anschließend in die gewünschten Sprachen (gespeichert als `<name>_<lang>_Subtitle.srt` neben dem Original). Du willst nur das Transkript? Sag das einfach, dann läuft sie mit `--transcribe-only` — ohne Übersetzung. Jede Untertitel-Extraktion verbraucht Credits proportional zur Medienlänge (pro Sprache).

### Sie hat mittendrin gestoppt (Credits aufgebraucht, ein Absturz oder eine abgebrochene Shell). Was jetzt?

Der Fortschritt wird während des gesamten Laufs in einer Zustandsdatei gespeichert (`*.dubresume.json` für `/dubbing`, `*.srtresume.json` für `/srt`). Führe den ausgegebenen Befehl `--resume "<state-file>"` erneut aus, um nur die verbleibenden Teile fertigzustellen — abgeschlossene Teile werden übersprungen und nie erneut berechnet.

### Mir sind die Credits ausgegangen. Wie lade ich auf?

Die Skill kann einen Stripe-Zahlungslink generieren (Abonnieren, Plan wechseln oder Credits kaufen, je nach deinem Plan). Du öffnest den Link und bezahlst selbst — der Agent bezahlt niemals in deinem Namen. Setze nach dem Aufladen mit dem ausgegebenen `--resume`-Befehl fort.

### Kann ich synchronisieren, ohne eine lokale Datei zu speichern?

Ja, bei einem einzelnen (nicht aufgeteilten) Video: Füge `--no-save` hinzu. Das Ergebnis bleibt in deinem Perso-Workspace und wird nicht heruntergeladen. Aufgeteilte Videos werden weiterhin normal gespeichert, da die zusammengeführte Datei einen lokalen Download benötigt.

### `node` wurde nicht gefunden — was mache ich?

Die Skill benötigt Node.js 18+. Prüfe das mit `node -v`; installiere die LTS-Version von <https://nodejs.org>, oder bitte einfach den Agenten, sie für dich zu installieren, und versuche es dann erneut.

### Wie aktualisiere ich die Skill?

`npx perso-dubbing@latest`, oder im Claude Code Plugin: `/plugin update perso-dubbing`.

### Welche Daten sammelt die Skill?

Nur anonyme Nutzungsereignisse — welche Aktion ausgeführt wurde, ob sie erfolgreich war, grobe Zählwerte, App-Version und Betriebssystem — versehen mit einer zufälligen, installationsspezifischen ID. Sie enthalten niemals deinen API-Schlüssel, Dateinamen oder Medieninhalte, Konto/E-Mail oder Workspace-IDs.
