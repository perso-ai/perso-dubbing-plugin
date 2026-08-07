<div align="center">

# Perso Dubbing Plugin

**Chaque vidéo, dans toutes les langues. Doublez, sous-titrez et clippez directement depuis votre agent de codage.**
*« Double cette vidéo en français », et c'est tout le workflow.*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](../../LICENSE)

<sub>

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ **Français**

</sub>

</div>

<br>

| Fonctionnalité | Vous dites | Vous obtenez | |
|---|---|---|---|
| **Doublage** | *« Double cette vidéo en japonais »* | La même vidéo, avec une nouvelle voix | |
| **Lip-sync** | *« …avec lip-sync »* | Les lèvres synchronisées sur l'audio doublé | |
| **Séparation de voix** | *« Sépare la voix de la musique »* | Une piste voix et une piste fond sonore | |
| **Sous-titres depuis la parole** | *« Fais-moi un SRT en anglais »* | Un SRT extrait par STT | |
| **Traduction de sous-titres** | *« Traduis subs.srt en espagnol »* | SRT traduit, timing intact, contrôle qualité inclus | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Sous-titres stylisés** | *« Incruste ces sous-titres sur la vidéo »* | Des sous-titres stylisés sur la vidéo | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Clips courts** | *« Coupe 2:00–3:00 en short »* | Un clip 9:16, recadré | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **Highlights IA** | *« Choisis les meilleurs moments pour des shorts »* | Des clips highlights sélectionnés par l'IA | |

Fichiers, dossiers et URL YouTube/TikTok fonctionnent tous.

<br>

## Installation

> **Agent venu installer depuis l'URL de ce dépôt ?** Dans Claude Code, exécutez ceci maintenant (non interactif, réexécutable sans risque) :
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> Demandez ensuite à l'utilisateur de redémarrer pour que `/dubbing`, `/srt` et `/clip` se chargent. Autres hôtes : `npx perso-dubbing`. Sans terminal (ChatGPT / Gemini) : [chatgpt-setup](../chatgpt-setup.md) · [gemini-setup](../gemini-setup.md)

**Application de bureau Claude** (offre payante) : ouvrez l'onglet **Code**, choisissez un dossier, sélectionnez **Local**, collez :

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI** : `/plugin marketplace add perso-ai/perso-dubbing-plugin`, puis `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · tout le reste** : `npx perso-dubbing` détecte vos hôtes et s'installe dans chacun.

Requiert **Node.js 18+**, rien d'autre. [Guide visuel](https://dubbing-plugin.perso.ai/en/) · [FAQ](FAQ.md)

<br>

<sub>FREE · EXÉCUTION LOCALE</sub>

## Sous-titres stylisés

Choisissez parmi douze presets, ou décrivez simplement le rendu avec vos mots : *« texte jaune, contour noir, en bas. »* L'incrustation tourne en local sur ffmpeg : pas d'upload, pas de file d'attente, pas de compte. Plusieurs langues ? Chaque SRT donne sa propre vidéo finalisée.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="12 presets de style de sous-titres">
</p>

<br>

<sub>FREE · EXÉCUTION LOCALE</sub>

## Traduire des sous-titres

Donnez n'importe quel SRT et nommez les langues que vous voulez. Plusieurs à la fois, aucun souci : une seule passe couvre tout. Chaque ligne garde exactement son timing d'origine, apparaissant et disparaissant aux mêmes instants qu'avant. Avant livraison, le résultat est vérifié pour repérer les lignes trop longues ou trop rapides à lire.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="Démo de traduction de sous-titres">
</p>

<br>

<sub>FREE · EXÉCUTION LOCALE</sub>

## Clips courts

Des timecodes en entrée, des shorts verticaux en sortie : recadrés 16:9 → 9:16, nommés et prêts pour les sous-titres. Ou confiez la transcription et l'IA choisit les moments qui fonctionnent en short : ouverture sur un hook, montée jusqu'au pic de la réaction, coupe avant que l'énergie retombe. 30–90 secondes chacun.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="Démo de clips courts : demande dans le chat, highlights choisis sur la timeline, shorts 9:16 en sortie">
</p>

<br>

<sub>PERSO API</sub>

## Doublage et lip-sync

Une seule exécution prend un fichier, un dossier entier ou une URL YouTube/TikTok et le double en plusieurs langues à partir d'un seul upload. Les vidéos dépassant la limite du plan se découpent, se traitent et se réassemblent toutes seules ; une exécution interrompue reprend exactement là où elle s'était arrêtée, sans jamais refacturer les parties terminées. Le doublage clone la voix d'origine dans la nouvelle langue, et le lip-sync fait bouger les lèvres pour suivre cet audio cloné.

<br>

<sub>PERSO API</sub>

## Sous-titres depuis la parole (STT)

Pas encore de sous-titres ? La reconnaissance vocale tourne sur les serveurs de Perso et utilise des crédits pour transformer l'audio de la vidéo en SRT dans la langue d'origine, pour un fichier ou un dossier entier. Une fois le SRT créé, toutes les étapes suivantes sont gratuites : traduction, style, incrustation.

<br>

<sub>PERSO API</sub>

## Séparation de voix

Sépare une vidéo ou un audio en pistes propres : la voix et le fond sonore. Avec plusieurs locuteurs, la voix de chaque personne sort dans sa propre piste. Remplacez la bande-son, remasterisez les dialogues ou réutilisez n'importe quelle piste seule.

<br>

## Gratuit partout où c'est possible. Payant seulement là où il le faut.

**MIT, gratuit et open source.** Tout ce qui tourne sur votre machine ne coûte rien et ne demande aucun compte : styliser et incruster des sous-titres, traduire un SRT que vous avez déjà, couper des clips aux timecodes. Les crédits n'entrent en jeu que lorsqu'un job tourne sur les serveurs de Perso : doublage, lip-sync, séparation de voix et reconnaissance vocale, facturés à la seconde traitée via la [Perso Dubbing API](https://developers.perso.ai/api-keys).

Aucune cérémonie de configuration. La première fois qu'un job serveur se lance, un navigateur s'ouvre : connexion, un clic, clé stockée chiffrée. Les étapes gratuites ne demandent jamais rien.

<br>

---

<sub>**Confidentialité** : `/dubbing`, `/srt` et `/clip` envoient des événements d'usage pour améliorer les skills : ce qui a tourné et comment cela s'est terminé, la durée des médias, les choix de style, la locale approximative, la version de l'app/OS, et si une clé Perso API a été utilisée (et enregistrée). Chaque événement porte un ID aléatoire par installation et votre numéro de workspace ; jamais votre clé, vos médias, vos noms de fichiers ni le texte de vos sous-titres. Désactivez avec `PERSO_NO_TELEMETRY`.</sub>

<sub>**Licence** : le code des skills est sous licence [MIT](../../LICENSE). L'usage de l'API est soumis aux [conditions d'utilisation de Perso AI](https://perso.ai) et à sa tarification.</sub>
