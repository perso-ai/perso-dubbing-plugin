# 🎬 /dubbing — Perso Dubbing 動画翻訳

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ **日本語** ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

[Perso Dubbing](https://perso.ai/dubbing) のAI吹き替えをエージェントにもたらすコーディングエージェント向けスキルです。一度インストールすれば、あとは*「この動画を英語に吹き替えて」*と言うだけです。

- **吹き替え** — 単一ファイル、フォルダ全体、URLのいずれからでも他の言語へ
- **リップシンク** — 吹き替えた動画の口の動きを新しい音声に合わせます
- **音声分離** — 音声と背景音を分離します
- **字幕**（`/srt`）— 音声認識でSRTを抽出し、続けてエージェントが翻訳します
- サイズが大きすぎるメディアや非常に長いメディアは、自動的に分割・処理され、最後に結合されます

**Node.js 18以上**で動作し、**Perso Dubbing APIキー**が必要です。Agent Skills標準（`SKILL.md`）に基づいているため、Claude・Codex・Antigravity のいずれでもまったく同じように動作します。

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## インストール

> 📖 **[画面付きの手順 →](https://dubbing-plugin.perso.ai/en/)** — エージェントを選んでコマンドをコピーできます。

### Claude デスクトップアプリ — 最も簡単、ターミナル不要（約3分）

<a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude デスクトップアプリ</a>（有料プラン）で:

1. **Code タブ**（画面上部中央）を開き、任意のフォルダを選んで、**Local** 環境を選択します — プラグインはクラウドセッションでは動作しません。
2. 各コマンドをプロンプト欄に貼り付けて、一つずつ Enter を押します。

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

3. 吹き替えを依頼します — *「この動画を英語に吹き替えて — C:\videos\clip.mp4」*。YouTubeのURLやフォルダでも動作します。`--out` を指定しない限り、結果は元の動画と同じ場所に保存されます。

**Claude Code CLI:** 代わりに `/plugin marketplace add perso-ai/perso-dubbing-plugin` と `/plugin install perso-dubbing@perso-ai` を使ってください。

### その他のすべてのホスト

```bash
npx perso-dubbing
```

インストール済みのホストを検出して、それぞれに両方のスキルをインストールし、どこに配置されたかを表示します。特定のホストのみなら `--claude` / `--codex` / `--antigravity`、すべてのホストなら `--all`、現在のプロジェクトのみなら `--project` を追加してください。リポジトリを既にクローン済みですか？ リポジトリのルートで `node scripts/install.mjs` を実行すれば、ネットワーク不要で同じことができます。

<details>
<summary><b>🤖 エージェントへ</b> — このリポジトリのURLのみを渡された場合</summary>

- **Claude Code（デスクトップまたはCLI）** — 次のインストールコマンド1行を自分で実行してください（非対話型かつ冪等なので、再実行しても安全です）:

  ```bash
  claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
  ```

  両方成功したら、新しいセッションを開始する（または Claude Code を再起動する）ようユーザーに伝えてください — `/dubbing` と `/srt` は次のセッションから読み込まれます。シェルで `claude` CLI が使えない場合に限り、上記のコマンドをユーザー自身に入力してもらう方法にフォールバックしてください。
- **Codex・Antigravity、またはユーザーがインストールを委任した場合** — `npx perso-dubbing` を実行してください（リポジトリが既にクローン済みの場合は `node scripts/install.mjs`）。
- **ChatGPT（ウェブ/アプリ — ユーザーのPCでターミナルを使えない場合）** — https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/chatgpt-setup.md を読んで従ってください: まずユーザーのPCに **Codex** を導入し、インストールはそちらで続行します。（すでにターミナル付きの Codex 内にいる場合は上の項目に従ってください。）
- **Gemini（ウェブ/アプリ — ユーザーのPCでターミナルを使えない場合）** — https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/gemini-setup.md を読んで従ってください: まず **Antigravity** をインストールし、インストールはそちらで続行します。（すでに Antigravity 内にいる場合は上の項目に従ってください。）

</details>

### 初回実行 — APIキー

ブラウザのページが開きます。サインインして一度クリックするだけで、キーが発行され、このマシンに暗号化して保存されます。コピーする必要はありません。ブラウザを開けない場合は、代わりにキーファイルが開きます — そこにキーを貼り付けて保存すると、暗号化されファイルは削除されます。

<a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">APIキーを取得</a> ・ `npm run key:check` でいつでも確認できます

---

## 使い方

やりたいことをエージェントに伝えるだけです:

> 「この動画を英語に吹き替えて — C:\videos\clip.mp4」
>
> 「このフォルダ内のすべての動画を日本語とスペイン語に吹き替えて」
>
> 「このYouTubeリンクを英語に吹き替えて、リップシンクも付けて」
>
> 「このクリップから音声と背景音楽を分離して」
>
> 「この動画の英語のSRTを作って」

または **`/dubbing`** / **`/srt`** と入力して開始します。CLIオプションの全一覧は、エージェントに使い方を尋ねるか、`npm run dub -- --help` を実行してください。

---

## トラブルシューティング

さらに疑問がありますか？ **[FAQ](FAQ.md)** をご覧ください。

| 症状 | 対処法 |
|---|---|
| `node` が見つからない | <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> からLTS版をインストールし（またはエージェントに*「Node.jsをインストールして」*と依頼し）、再試行してください。 |
| Claude デスクトップアプリがGitを要求する（Windows） | Code タブは初回利用時に <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a> を必要とします。インストール後、アプリを再起動してください。 |
| `claude` コマンドやPluginsメニューが反応しない | **クラウドセッション**にいます — プラグインには **Local**（またはSSH）セッションが必要です。 |
| キーが拒否される、または存在しない | もう一度登録してください: `node skills/dubbing/scripts/connect.mjs`。保存されているキーは `npm run key:check` で確認できます。 |
| ffmpeg関連のエラー | ffmpegは通常自動的にインストールされます。失敗する場合は `npm run doctor` を実行してください。 |
| 途中で停止した（クレジット切れ、クラッシュ、プロセスの強制終了） | 進捗は継続的に保存されています。通知に表示される **`--resume "<state-file>"`** コマンドを実行してください — 完了済みの部分はスキップされ、再課金されることはありません。 |

---

## プライバシーとテレメトリー

`/dubbing` と `/srt` は、スキルを改善するために利用イベントを送信します — 例えば、実行されたアクション、成功したかどうか、メディアの長さ、アプリバージョン、OSなどです。各イベントには、インストールごとのランダムなIDとワークスペース番号が付与されます。APIキーとメディアが含まれることは一切ありません。`PERSO_NO_TELEMETRY` でいつでもオプトアウトできます。

---

## リポジトリ構成

```text
.claude-plugin/    Claude Code プラグイン + マーケットプレイス マニフェスト
.codex-plugin/     Codex プラグイン マニフェスト
docs/              GitHub Pages ランディング + 翻訳版 README · FAQ（12言語）
skills/dubbing/    吹き替えスキル本体 (SKILL.md · lib/ · scripts/) — 単体で完結
skills/srt/        SRT字幕スキル (SKILL.md · scripts/) — dubbing スキルの lib/ を使用
scripts/           リポジトリレベルのインストーラー (install.mjs)
```

## ライセンス

このスキルのコードは **[MIT](../../LICENSE)** です。実際の吹き替えは Perso Dubbing API を通じて実行されるため、APIの利用は [Perso AI利用規約](https://perso.ai) および料金体系に従います。
