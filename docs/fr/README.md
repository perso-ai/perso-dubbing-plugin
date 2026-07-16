# 🎬 /dubbing — Doublage vidéo automatique avec Perso AI

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ **Français**

Une skill pour agents de programmation qui apporte le **Doublage (doublage par IA)** de [Perso AI](https://perso.ai) à votre agent. Elle **double automatiquement** des vidéos dans d'autres langues — un seul fichier ou un dossier entier —, et même les fichiers trop volumineux ou très longs sont automatiquement découpés, traités, puis réassemblés. Elle peut aussi **synchroniser les lèvres** de la vidéo doublée et **séparer la voix du son de fond**.

Le paquet inclut aussi **`/srt`** — une seconde skill qui extrait des **sous-titres SRT** à partir d'une vidéo/d'un audio/d'une URL via la reconnaissance vocale de Perso, puis fait traduire ces sous-titres par votre agent dans les langues de votre choix (ou vous fournit directement la transcription dans la langue d'origine).

En coulisses, elle appelle l'API de Doublage Perso ; **une clé API Perso Dubbing est donc nécessaire** (une seule clé couvre les deux skills). → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Obtenir une clé API</a>

Comme tous les hôtes utilisent le même standard **Agent Skills** (`SKILL.md`), elle fonctionne de la même manière partout où vous l'installez : exécutez simplement `/dubbing` ou dites *« double cette vidéo »* (ou `/srt` — *« fais-moi un SRT en anglais pour cette vidéo »*).

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## 🖥️ Le plus simple — l'application de bureau Claude (environ 3 minutes)

> 📖 **Vous préférez un guide visuel ?** Suivez le **[tutoriel d'installation →](https://dubbing-plugin.perso.ai/en/)** — choisissez votre agent et copiez les commandes.

Aucun terminal nécessaire. Dans l'<a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">application de bureau Claude</a> (offre payante) :

1. **Ouvrez l'onglet Code** (en haut au centre) et choisissez un dossier — sélectionnez l'environnement **Local** (les plugins ne sont pas disponibles dans les sessions cloud).
2. **Collez chaque commande** dans la zone de saisie et appuyez sur Entrée, une à la fois :

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Vous préférez cliquer ? Après la première commande, appuyez sur le bouton **+** à côté de la zone de saisie → **Plugins** → **Add plugin** → installez **perso-dubbing**.*
3. **Demandez un doublage** — p. ex. *« Double cette vidéo en anglais — C:\videos\clip.mp4 »* (une URL YouTube ou un dossier entier fonctionnent aussi). Au premier lancement, un fichier de clé s'ouvre pour votre <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">clé API Perso</a> — collez la clé dans ce fichier, **pas dans le chat**. Sauf si vous utilisez `--out`, les résultats sont enregistrés à côté de la vidéo source.

> 💡 La skill elle-même s'exécute avec **Node.js 18+**. Si votre PC ne l'a pas, l'agent indiquera que `node` est introuvable — répondez simplement *« installe Node.js pour moi »* (ou téléchargez la LTS depuis <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>), puis réessayez.

Dans la **CLI Claude Code**, utilisez plutôt `/plugin marketplace add perso-ai/perso-dubbing-plugin` et `/plugin install perso-dubbing@perso-ai`.

---

## Installer sur d'autres hôtes

Le raccourci qui fonctionne partout : collez l'URL de ce dépôt dans votre agent et dites *« installe ça »*.

> **🤖 À l'attention de l'agent :** Si seule l'URL de ce dépôt vous a été fournie, choisissez le chemin adapté à votre hôte :
>
> - **Claude Code (application de bureau ou CLI) :** **n'exécutez pas** npx tout de suite — même si l'utilisateur a dit « installe ça ». Montrez-lui les deux commandes de la section *application de bureau Claude* ci-dessus et demandez-lui de les taper lui-même, une par message (ce sont des commandes slash à saisir par l'utilisateur, que vous ne pouvez pas exécuter). Mentionnez aussi le chemin par clic dans l'application de bureau : après la première commande, **bouton + → Plugins → Add plugin**. Si vous devez adapter le message, `CLAUDE_CODE_ENTRYPOINT=cli` dans votre environnement shell suggère une session terminal (signal non documenté — en cas de doute, présentez les deux chemins). Ne recourez à npx que si l'utilisateur, après les avoir vues, souhaite toujours que vous vous chargiez de l'installation.
> - **Codex · Cursor · Antigravity, ou si l'utilisateur vous a délégué l'installation :** exécutez cette commande unique — elle récupère le paquet, détecte automatiquement chaque hôte installé et installe la skill dans chacun d'eux :
>
> ```bash
> npx perso-dubbing
> ```
>
> Si le dépôt est déjà cloné, exécutez plutôt `node scripts/install.mjs` depuis la racine du dépôt (aucun réseau nécessaire).

<details>
<summary><b>Codex</b></summary>

Codex lit les skills depuis le dossier partagé Agent Skills. Exécutez `npx perso-dubbing --codex`, ou copiez manuellement :

```text
~/.agents/skills/dubbing/        # personnel (tous les dépôts) — Codex actuel
~/.codex/skills/dubbing/         # anciennes versions de Codex (l'installeur écrit les deux)
<repo>/.agents/skills/dubbing/   # ce dépôt uniquement
```

Le dépôt fournit aussi un manifeste de plugin Codex (`.codex-plugin/plugin.json`) pour les installations via marketplace.

</details>

<details>
<summary><b>Cursor</b></summary>

Exécutez `npx perso-dubbing --cursor`, ou copiez dans :

```text
~/.cursor/skills/dubbing/        # global
.cursor/skills/dubbing/          # ce projet uniquement
```

Le dépôt fournit un manifeste de plugin Cursor (`.cursor-plugin/plugin.json`) pour le marketplace de plugins Cursor.

</details>

<details>
<summary><b>Antigravity</b></summary>

Exécutez `npx perso-dubbing --antigravity`, ou copiez dans l'un des emplacements suivants :

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+ (dossier partagé Agent Skills)
```

</details>

<details>
<summary><b>⚡ Installateur en une ligne (tout hôte)</b></summary>

Détecte les hôtes que vous utilisez et installe la skill sur tous — aucun clonage nécessaire :

```bash
npx perso-dubbing
```

- Un hôte précis uniquement : `--claude` / `--antigravity` / `--codex` / `--cursor` · tous : `--all`
- Projet actuel uniquement (`./.claude`, `./.agents`, …) : `--project`

Vous avez déjà cloné le dépôt ? `node scripts/install.mjs` depuis la racine du dépôt fait la même chose sans réseau.

</details>

<details>
<summary><b>🔧 Installation manuelle</b></summary>

Copiez **les deux** dossiers de skills dans le répertoire de skills de votre hôte, côte à côte (la skill `srt` importe les bibliothèques de la skill `dubbing` depuis le dossier voisin). Depuis la racine du dépôt :

```bash
# macOS / Linux
mkdir -p <skills_folder> && cp -r skills/dubbing skills/srt <skills_folder>/
```

> 💡 Windows (PowerShell) : `New-Item -ItemType Directory -Force <skills_folder>; Copy-Item .\skills\dubbing,.\skills\srt <skills_folder>\ -Recurse`

</details>

Une fois l'installation terminée, tapez **`/dubbing`** dans votre agent ou dites simplement **« double cette vidéo »** pour l'exécuter — ou **`/srt`** / **« fais-moi un SRT en anglais pour cette vidéo »** pour des sous-titres. (Chaque méthode d'installation ci-dessus installe les deux skills.)

---

## Exemples

Le plus simple : dites simplement à votre agent :

> « Double cette vidéo en anglais — C:\videos\clip.mp4 »

Vous pouvez aussi exécuter la CLI directement depuis la racine du dépôt :

```bash
# Une vidéo (détection automatique de la langue source → anglais)
npm run dub -- "clip.mp4" --target en --out result.mp4

# Plusieurs langues à la fois (upload/découpage une seule fois, réutilisé par langue)
npm run dub -- "clip.mp4" --target en,ja,zh

# Plusieurs entrées à la fois (URLs, fichiers et dossiers peuvent être mélangés)
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# Doublage + synchronisation labiale (bouche calée sur l'audio doublé ; crédits supplémentaires)
npm run dub -- "clip.mp4" --target en --lipsync

# Séparer les pistes voix / audio de fond (sans doublage)
npm run dub -- "clip.mp4" --separate

# Extraire les sous-titres et les faire traduire par l'agent (skill /srt)
npm run srt -- "clip.mp4" --target en,ja

# Transcription seule — SRT dans la langue d'origine, sans traduction
npm run srt -- "clip.mp4" --transcribe-only
```

*(Appel direct équivalent : `node skills/dubbing/scripts/dubbing.mjs …` — ou `node scripts/dubbing.mjs …` depuis l'intérieur d'un dossier de skill installé.)*

---

## Dépannage

D'autres questions ? Consultez la **[FAQ](FAQ.md)**.

| Symptôme | Solution |
|---|---|
| L'application de bureau Claude demande Git (Windows) | L'onglet Code nécessite <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git pour Windows</a> lors de la première utilisation. Installez-le, puis redémarrez l'application. |
| Les commandes `claude` ou le menu Plugins ne font rien | Vous êtes dans une **session cloud** — les plugins ne fonctionnent que dans les sessions **Local** (et SSH). Passez l'environnement en Local et réessayez. |
| `node` introuvable / l'installation ou l'exécution échoue | La skill s'exécute avec **Node.js 18+** — vérifiez avec `node -v`. S'il manque, installez la LTS depuis <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>, ou demandez simplement à Claude dans la session de l'installer pour vous, puis redémarrez l'application. |
| Pas encore de clé API | Exécutez simplement une commande de doublage — un fichier de clé s'ouvre automatiquement ; collez votre clé et enregistrez (elle est chiffrée et le fichier est supprimé). Vérification manuelle : `npm run key:check`. **Ne collez jamais la clé dans le chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Obtenir une clé API</a> |
| Erreur liée à ffmpeg | ffmpeg s'installe normalement automatiquement. En cas d'échec, exécutez `npm run doctor`. |
| S'arrête en cours de route (crédits épuisés, plantage, processus interrompu) | La progression est enregistrée en continu dans un fichier d'état (`*.dubresume.json` pour `/dubbing`, `*.srtresume.json` pour `/srt`). Exécutez la commande **`--resume "<state-file>"`** indiquée dans l'avis pour ne terminer que les parties restantes (les parties déjà terminées sont automatiquement ignorées). |

---

## Confidentialité et télémétrie

`/dubbing` et `/srt` envoient des événements d'utilisation **anonymes** pour améliorer les skills — par exemple, quelle action a été exécutée (doublage / synchronisation labiale / séparation / extraction de sous-titres), si elle a réussi, la paire de langues, la durée du média, la version de l'application et le système d'exploitation. Ils sont identifiés uniquement par un ID aléatoire propre à l'installation et n'incluent jamais votre clé API, des noms de fichiers ou du contenu multimédia, votre compte/e-mail, ni des identifiants d'espace de travail. Vous pouvez désactiver la télémétrie à tout moment via la variable d'environnement `PERSO_NO_TELEMETRY`.

---

## Structure du dépôt

```text
.claude-plugin/    Manifestes de plugin et de marketplace Claude Code
.codex-plugin/     Manifeste de plugin Codex
.cursor-plugin/    Manifeste de plugin Cursor
docs/              Landing GitHub Pages + README et FAQ traduits (12 langues)
skills/dubbing/    La skill de doublage (SKILL.md · lib/ · scripts/) — autonome
skills/srt/        La skill de sous-titres SRT (SKILL.md · scripts/) — utilise le lib/ de la skill dubbing
scripts/           Installateur au niveau du dépôt (install.mjs)
```

## Licence

Le code de cette skill est distribué sous la **[Licence MIT](../../LICENSE)**. Le doublage proprement dit est réalisé via l'API Perso Dubbing ; l'utilisation de l'API est donc soumise aux [Conditions d'utilisation de Perso AI](https://perso.ai) et à sa tarification.
