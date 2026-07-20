# /dubbing — FAQ

[English](../../FAQ.md) ｜ [한국어](../ko/FAQ.md) ｜ [Español](../es/FAQ.md) ｜ [Português](../pt/FAQ.md) ｜ [Русский](../ru/FAQ.md) ｜ [Bahasa Indonesia](../id/FAQ.md) ｜ [Deutsch](../de/FAQ.md) ｜ [ไทย](../th/FAQ.md) ｜ [日本語](../ja/FAQ.md) ｜ [繁體中文](../zh-TW/FAQ.md) ｜ [简体中文](../zh-CN/FAQ.md) ｜ [Tiếng Việt](../vi/FAQ.md) ｜ **Français**

Foire aux questions sur les skills `/dubbing` et `/srt`. Pour l'installation et l'utilisation, consultez le [README](README.md).

### De quoi ai-je besoin pour l'utiliser ?

Node.js 18+ et une clé API Perso Dubbing. Installez la skill, puis dites simplement *« double cette vidéo »*. → [Obtenir une clé API](https://developers.perso.ai/api-keys)

### Comment enregistrer ma clé API ?

Au premier lancement, une page de navigateur s'ouvre — connectez-vous et cliquez une fois, votre clé est émise puis stockée sur cette machine, chiffrée. Rien à copier. Si aucun navigateur ne peut s'ouvrir, un fichier de clé s'ouvre à la place : collez-y **uniquement votre clé API** et enregistrez (elle est chiffrée et le fichier est supprimé). **Ne collez jamais la clé dans le chat.** Vérification manuelle : `npm run key:check`.

### Est-ce payant ?

Le code de la skill est gratuit (MIT), mais le doublage passe par l'API Perso, qui facture en crédits.

### Que puis-je lui donner en entrée ?

Un fichier local, un dossier local ou une URL (YouTube, TikTok, Google Drive). Les vidéos trop volumineuses ou très longues sont automatiquement découpées, traitées, puis réassemblées.

### Peut-elle doubler dans plusieurs langues, ou traiter plusieurs fichiers à la fois ?

Oui. Indiquez plusieurs langues dans une seule commande (`--target en,ja,zh`) — la source est envoyée et découpée une seule fois, puis réutilisée pour chaque langue. Vous pouvez aussi mélanger plusieurs fichiers, dossiers et URLs en une seule exécution.

### Où mes résultats sont-ils enregistrés ?

Par défaut, à côté de la vidéo source, ou dans le dossier indiqué avec `--out`. Chaque exécution est aussi un projet dans votre portail Perso (<https://portal.perso.ai>), où vous pouvez le retélécharger ou obtenir d'autres formats.

### Qu'est-ce que la synchronisation labiale ?

Elle ajuste les mouvements des lèvres à l'audio doublé. Elle s'exécute après le doublage, fonctionne uniquement sur la vidéo, prend nettement plus de temps et coûte des crédits supplémentaires. Ajoutez `--lipsync`.

### Qu'est-ce que la séparation audio ?

Elle divise la source en pistes voix / fond / fond secondaire — sans doublage. Ajoutez `--separate`.

### Peut-elle créer des sous-titres (SRT) au lieu de doubler ?

La skill **`/srt`** extrait les sous-titres dans la langue d'origine à partir d'une vidéo/d'un audio/d'une URL via la reconnaissance vocale de Perso. Si vous les voulez aussi traduits, demandez le SRT en précisant les langues souhaitées.

### Le processus s'est arrêté en cours de route (crédits épuisés, plantage, ou shell interrompu). Que faire ?

La progression est enregistrée en continu dans un fichier d'état (`*.dubresume.json` pour `/dubbing`, `*.srtresume.json` pour `/srt`). Relancez la commande `--resume "<state-file>"` affichée pour ne terminer que les parties restantes — les parties déjà terminées sont ignorées et jamais refacturées.

### Je n'ai plus de crédits. Comment recharger ?

La skill peut générer un lien de paiement Stripe (s'abonner, changer d'offre ou acheter des crédits, selon votre plan). Vous ouvrez le lien et payez vous-même — l'agent ne paie jamais à votre place. Après avoir rechargé, reprenez avec la commande `--resume` affichée.

### Puis-je doubler sans enregistrer de fichier local ?

Oui, pour une vidéo unique (non découpée) : ajoutez `--no-save`. Le résultat reste dans votre espace de travail Perso et n'est pas téléchargé. Les vidéos découpées sont, elles, toujours enregistrées normalement, car le fichier fusionné nécessite un téléchargement local.

### `node` est introuvable — que faire ?

La skill nécessite Node.js 18+. Vérifiez avec `node -v` ; installez la LTS depuis <https://nodejs.org>, ou demandez simplement à l'agent de l'installer pour vous, puis réessayez.

### Comment mettre à jour la skill ?

`npx perso-dubbing@latest`, ou dans le plugin Claude Code : `/plugin update perso-dubbing`.

### Quelles données la skill collecte-t-elle ?

Uniquement des événements d'utilisation — quelle action a été exécutée, si elle a réussi, des comptages approximatifs, la version de l'application et le système d'exploitation — accompagnés d'un ID aléatoire propre à l'installation et de votre numéro d'espace de travail. Votre clé API et vos médias ne sont jamais inclus.
