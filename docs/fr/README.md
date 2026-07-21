# 🎬 /dubbing — Traduction vidéo avec Perso Dubbing

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ **Français**

Une skill pour agents de programmation qui apporte le doublage par IA de [Perso Dubbing](https://perso.ai/dubbing) à votre agent. Installez-la une fois, puis dites simplement *« double cette vidéo en anglais »*.

- **Doubler** dans une autre langue — un seul fichier, un dossier entier ou une URL
- **Synchroniser les lèvres** de la vidéo doublée pour que la bouche corresponde au nouvel audio
- **Séparer** la voix du son de fond
- **Sous-titres** (`/srt`) — extraire un SRT par reconnaissance vocale, puis votre agent le traduit
- Les médias trop volumineux ou très longs sont automatiquement découpés, traités, puis réassemblés

Fonctionne avec **Node.js 18+** et nécessite une **clé API Perso Dubbing**. Basée sur le standard Agent Skills (`SKILL.md`), elle se comporte de façon identique sur Claude, Codex, Cursor et Antigravity.

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## Installation

> 📖 **[Tutoriel visuel →](https://dubbing-plugin.perso.ai/en/)** — choisissez votre agent et copiez les commandes.

### Application de bureau Claude — le plus simple, sans terminal (environ 3 min)

Dans l'<a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">application de bureau Claude</a> (offre payante) :

1. Ouvrez l'**onglet Code** (en haut au centre), choisissez un dossier, puis sélectionnez l'environnement **Local** — les plugins ne fonctionnent pas dans les sessions cloud.
2. Collez chaque commande dans la zone de saisie et appuyez sur Entrée, une à la fois :

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *Vous préférez cliquer ? Après la première commande : bouton **+** → **Plugins** → **Add plugin** → **perso-dubbing**.*
3. Demandez un doublage — *« Double cette vidéo en anglais — C:\videos\clip.mp4 »*. Une URL YouTube ou un dossier fonctionnent aussi. Les résultats sont enregistrés à côté de la vidéo source, sauf si vous passez `--out`.

**CLI Claude Code :** utilisez plutôt `/plugin marketplace add perso-ai/perso-dubbing-plugin` et `/plugin install perso-dubbing@perso-ai`.

### Tous les autres hôtes

```bash
npx perso-dubbing
```

Détecte les hôtes présents sur votre machine et y installe les deux skills, en indiquant où chacune a été placée. Ajoutez `--claude` / `--codex` / `--cursor` / `--antigravity` pour un seul hôte, `--all` pour tous les hôtes, ou `--project` pour le projet actuel uniquement. Vous avez déjà cloné le dépôt ? `node scripts/install.mjs` depuis la racine du dépôt fait la même chose, hors ligne.

> **🤖 À l'attention de l'agent :** si seule l'URL de ce dépôt vous a été fournie :
>
> - **Claude Code (application de bureau ou CLI)** — **n'exécutez pas** npx, même si l'utilisateur a dit « installe ça ». Montrez-lui les deux commandes `claude …` ci-dessus et demandez-lui de les taper lui-même, une par une (ce sont des commandes slash à saisir par l'utilisateur, que vous ne pouvez pas exécuter), ainsi que le chemin par clic : bouton **+** → **Plugins** → **Add plugin**. Ne recourez à npx que si l'utilisateur souhaite ensuite que vous vous en chargiez.
> - **Codex · Cursor · Antigravity, ou si l'utilisateur vous a délégué l'installation** — exécutez `npx perso-dubbing` (ou `node scripts/install.mjs` si le dépôt est déjà cloné).

### Premier lancement — votre clé API

Une page de navigateur s'ouvre : connectez-vous et cliquez une fois, votre clé est émise puis stockée sur cette machine, chiffrée. Rien à copier. Si aucun navigateur ne peut s'ouvrir, un fichier de clé s'ouvre à la place — collez-y la clé et enregistrez ; le fichier est chiffré puis supprimé.

**Ne collez jamais votre clé API dans le chat.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Obtenir une clé API</a> · vérifiez à tout moment avec `npm run key:check`

---

## Utilisation

Dites simplement à votre agent ce que vous voulez :

> « Double cette vidéo en anglais — C:\videos\clip.mp4 »
>
> « Double toutes les vidéos de ce dossier en japonais et en espagnol »
>
> « Double ce lien YouTube en anglais, avec synchronisation labiale »
>
> « Sépare la voix et la musique de fond de ce clip »
>
> « Fais-moi un SRT en anglais pour cette vidéo »

Ou tapez **`/dubbing`** / **`/srt`** pour démarrer. Pour la liste complète des options CLI, demandez l'aide à votre agent ou exécutez `npm run dub -- --help`.

---

## Dépannage

D'autres questions ? Consultez la **[FAQ](FAQ.md)**.

| Symptôme | Solution |
|---|---|
| `node` introuvable | Installez la LTS depuis <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> (ou demandez à votre agent *« installe Node.js pour moi »*), puis réessayez. |
| L'application de bureau Claude demande Git (Windows) | L'onglet Code nécessite <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git pour Windows</a> lors de la première utilisation. Installez-le, puis redémarrez l'application. |
| Les commandes `claude` ou le menu Plugins ne font rien | Vous êtes dans une **session cloud** — les plugins nécessitent une session **Local** (ou SSH). |
| Clé refusée ou absente | Enregistrez-la à nouveau : `node skills/dubbing/scripts/connect.mjs`. Vérifiez la clé stockée avec `npm run key:check`. |
| Erreur liée à ffmpeg | ffmpeg s'installe normalement automatiquement ; en cas d'échec, exécutez `npm run doctor`. |
| S'arrête en cours de route (crédits épuisés, plantage, processus interrompu) | La progression est enregistrée en continu. Exécutez la commande **`--resume "<state-file>"`** indiquée dans l'avis — les parties déjà terminées sont ignorées et jamais refacturées. |

---

## Confidentialité et télémétrie

`/dubbing` et `/srt` envoient des événements d'utilisation pour améliorer les skills — par exemple, quelle action a été exécutée, si elle a réussi, la durée du média, la version de l'application et le système d'exploitation. Chaque événement comporte un ID aléatoire propre à l'installation et votre numéro d'espace de travail. Votre clé API et vos médias ne sont jamais inclus. Vous pouvez vous désinscrire à tout moment via `PERSO_NO_TELEMETRY`.

---

## Structure du dépôt

```text
.claude-plugin/    Plugin Claude Code + manifestes du marketplace
.codex-plugin/     Manifeste du plugin Codex
.cursor-plugin/    Manifeste du plugin Cursor
docs/              Landing GitHub Pages + READMEs traduits · FAQ (12 langues)
skills/dubbing/    La skill de doublage (SKILL.md · lib/ · scripts/) — autonome
skills/srt/        La skill de sous-titres SRT (SKILL.md · scripts/) — utilise la lib/ de la skill de doublage
scripts/           Installateur au niveau du dépôt (install.mjs)
```

## Licence

Le code de cette skill est distribué sous la **[Licence MIT](../../LICENSE)**. Le doublage proprement dit est réalisé via l'API Perso Dubbing ; l'utilisation de l'API est donc soumise aux [Conditions d'utilisation de Perso AI](https://perso.ai) et à sa tarification.
