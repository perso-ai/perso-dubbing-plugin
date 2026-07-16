# 🎬 /dubbing — Perso AI 動画自動吹き替え

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ **日本語** ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

コーディングエージェント向けのスキルで、[Perso AI](https://perso.ai) の**吹き替え（AI吹き替え）**機能をエージェントにもたらします。動画を他の言語に**自動吹き替え**します — 単一ファイルでもフォルダ全体でも対応し、サイズが大きすぎる動画や非常に長い動画でも自動的に分割・処理され、最後に結合されます。吹き替えた動画の**リップシンク（口の動きの同期）**や、**音声と背景音の分離**も可能です。

このパッケージには **`/srt`** も同梱されています — Persoの音声認識（speech-to-text）を使って動画・音声・URLから**SRT字幕**を抽出し、指定した任意の言語にエージェントが翻訳する、もう一つのスキルです（翻訳せず、元言語のままの文字起こしを受け取ることもできます）。

内部で Perso Dubbing API を呼び出すため、**Perso Dubbing API キーが必要です**（1つのキーで両方のスキルをカバーします）。 → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">APIキーを取得</a>

すべてのホストが同じ **Agent Skills** 標準（`SKILL.md`）を使用しているため、どこにインストールしても同じように動作します — `/dubbing` を実行するか、「この動画を吹き替えて」と言うだけです（または `/srt` — 「この動画の英語字幕を作って」）。

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## 🖥️ 最も簡単な方法 — Claude デスクトップアプリ（約3分）

> 📖 **画面付きの手順が必要ですか？** **[インストールチュートリアル →](https://perso-ai.github.io/perso-dubbing-plugin/)** でエージェント別のコマンドをコピーできます。

ターミナルは不要です。<a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude デスクトップアプリ</a>（有料プラン）で:

1. **Code タブを開き**（画面上部中央）、任意のフォルダを選びます — **Local** 環境を選択してください（プラグインはクラウドセッションでは利用できません）。
2. **各コマンドをプロンプト欄に貼り付け**て、一つずつ Enter を押します。

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *クリック操作がお好みですか？ 最初のコマンドの後、プロンプト欄の横にある **+** ボタンを押す → **Plugins** → **Add plugin** → **perso-dubbing** をインストールしてください。*
3. **吹き替えを依頼します** — 例:「この動画を英語に吹き替えて — C:\videos\clip.mp4」（YouTubeのURLやフォルダ全体でも動作します）。初回実行時には<a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Perso APIキー</a>用のキーファイルが自動で開きます — キーはそのファイルに貼り付けてください。**チャットには貼り付けないでください。** `--out` を指定しない限り、結果は元の動画と同じ場所に保存されます。

> 💡 このスキル自体は **Node.js 18以上** で動作します。お使いのPCに入っていない場合、エージェントは `node` が見つからないと表示します — 「Node.jsをインストールして」と返信するだけで構いません（または <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> からLTS版を入手してください）。その後もう一度お試しください。

**Claude Code CLI**（ターミナル）では、代わりに `/plugin marketplace add perso-ai/perso-dubbing-plugin` と `/plugin install perso-dubbing@perso-ai` を使ってください。

---

## 他のホストへのインストール

どこでも使える近道: このリポジトリのURLをエージェントに貼り付けて「これをインストールして」と言うだけです。

> **🤖 エージェントへ:** このリポジトリのURLのみを渡された場合は、ホストに応じたパスを選んでください。
>
> - **Claude Code（デスクトップアプリまたはCLI）:** ユーザーが「これをインストールして」と言った場合でも、すぐに npx を実行しては**いけません**。上記「Claude デスクトップアプリ」セクションにある2つの コマンドをユーザーに提示し、1メッセージにつき1コマンドずつ、ユーザー自身に入力してもらってください（これらはユーザーが入力するスラッシュコマンドであり、あなたが実行することはできません）。デスクトップアプリでのクリック操作によるパスも案内してください: 最初のコマンドの後、**+ ボタン → Plugins → Add plugin**。文言を調整する必要がある場合、シェル環境の `CLAUDE_CODE_ENTRYPOINT=cli` はターミナルセッションであることを示唆します（非公式なシグナルのため、判断に迷う場合は両方のパスを提示してください）。npx にフォールバックするのは、これらを見せたうえでユーザーがそれでもインストール作業をあなたに任せたい場合のみです。
> - **Codex・Cursor・Antigravity、またはユーザーがインストールをあなたに委任した場合:** 次の単一コマンドを実行してください — パッケージを取得し、インストール済みのすべてのホストを自動検出して、それぞれにスキルをインストールします。
>
> ```bash
> npx perso-dubbing
> ```
>
> リポジトリが既にクローンされている場合は、代わりにリポジトリのルートで `node scripts/install.mjs` を実行してください（ネットワーク不要）。

<details>
<summary><b>Codex</b></summary>

Codex は共有の Agent Skills フォルダからスキルを読み込みます。`npx perso-dubbing --codex` を実行するか、手動でコピーしてください。

```text
~/.agents/skills/dubbing/        # 個人用（すべてのリポジトリ） — 現行の Codex
~/.codex/skills/dubbing/         # 旧バージョンの Codex（インストーラーは両方に書き込みます）
<repo>/.agents/skills/dubbing/   # このリポジトリのみ
```

リポジトリには、マーケットプレイス経由のインストール用に Codex プラグインマニフェスト（`.codex-plugin/plugin.json`）も含まれています。

</details>

<details>
<summary><b>Cursor</b></summary>

`npx perso-dubbing --cursor` を実行するか、以下にコピーしてください。

```text
~/.cursor/skills/dubbing/        # グローバル
.cursor/skills/dubbing/          # このプロジェクトのみ
```

リポジトリには、Cursor プラグインマーケットプレイス用の Cursor プラグインマニフェスト（`.cursor-plugin/plugin.json`）が含まれています。

</details>

<details>
<summary><b>Antigravity</b></summary>

`npx perso-dubbing --antigravity` を実行するか、いずれかの場所にコピーしてください。

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+（共有の Agent Skills フォルダ）
```

</details>

<details>
<summary><b>⚡ ワンライン・インストーラー（すべてのホスト対応）</b></summary>

使用しているホストを検出し、すべてにインストールします — クローン不要です。

```bash
npx perso-dubbing
```

- 特定のホストのみ: `--claude` / `--antigravity` / `--codex` / `--cursor` ・すべて: `--all`
- 現在のプロジェクトのみ（`./.claude`、`./.agents` など）: `--project`

リポジトリを既にクローン済みの場合は、リポジトリのルートで `node scripts/install.mjs` を実行すると、ネットワーク不要で同じことができます。

</details>

<details>
<summary><b>🔧 手動インストール</b></summary>

**両方の**スキルフォルダを、ホストのスキルディレクトリ内に並べてコピーしてください（`srt` スキルは、隣接フォルダにある `dubbing` スキルのライブラリをインポートします）。リポジトリのルートから:

```bash
# macOS / Linux
mkdir -p <skills_folder> && cp -r skills/dubbing skills/srt <skills_folder>/
```

> 💡 Windows（PowerShell）: `New-Item -ItemType Directory -Force <skills_folder>; Copy-Item .\skills\dubbing,.\skills\srt <skills_folder>\ -Recurse`

</details>

インストール後、エージェントで **`/dubbing`** と入力するか、**「この動画を吹き替えて」**と言うだけで実行できます — 字幕には **`/srt`** / **「この動画の英語字幕を作って」**をお使いください。（上記のどのインストール方法でも、両方のスキルが一緒にインストールされます。）

---

## 使用例

最も簡単な方法 — エージェントに伝えるだけです:

> 「この動画を英語に吹き替えて — C:\videos\clip.mp4」

リポジトリのルートから直接CLIを実行することもできます。

```bash
# 動画1本（元言語を自動検出 → 英語）
npm run dub -- "clip.mp4" --target en --out result.mp4

# 複数言語を一度に（アップロードと分割は一度だけ行い、言語ごとに再利用）
npm run dub -- "clip.mp4" --target en,ja,zh

# 複数の入力を一度に（URL・ファイル・フォルダを混在可能）
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# 吹き替え + リップシンク（口の動きを吹き替え音声に同期; 追加クレジットが必要）
npm run dub -- "clip.mp4" --target en --lipsync

# 音声/背景音トラックの分離（吹き替えなし）
npm run dub -- "clip.mp4" --separate

# 字幕を抽出し、エージェントに翻訳させる（/srt スキル）
npm run srt -- "clip.mp4" --target en,ja

# 文字起こしのみ — 元言語のSRT、翻訳なし
npm run srt -- "clip.mp4" --transcribe-only
```

*（同等の直接呼び出し: `node skills/dubbing/scripts/dubbing.mjs …` — またはインストール済みのスキルフォルダ内から `node scripts/dubbing.mjs …`。）*

---

## トラブルシューティング

さらに疑問がありますか？ **[FAQ](FAQ.md)** をご覧ください。

| 症状 | 対処法 |
|---|---|
| Claude デスクトップアプリがGitを要求する（Windows） | Code タブは初回利用時に <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a> を必要とします。インストール後、アプリを再起動してください。 |
| `claude` コマンドやPluginsメニューが反応しない | **クラウドセッション**にいます — プラグインは **Local**（およびSSH）セッションでのみ動作します。環境をLocalに切り替えて再試行してください。 |
| `node` が見つからない／インストールや実行が失敗する | このスキルは **Node.js 18以上** で動作します — `node -v` で確認してください。入っていない場合は <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> からLTS版をインストールするか、セッション内のClaudeにインストールを依頼してから、アプリを再起動してください。 |
| APIキーがまだない | 吹き替えコマンドを実行するだけで、キーファイルが自動的に開きます。キーを貼り付けて保存してください（暗号化され、ファイルは削除されます）。手動確認: `npm run key:check`。**キーをチャットに貼り付けないでください。** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">APIキーを取得</a> |
| ffmpeg関連のエラー | ffmpegは通常自動的にインストールされます。失敗する場合は `npm run doctor` を実行してください。 |
| 途中で停止する（クレジット切れ、クラッシュ、プロセスの強制終了） | 実行中は進捗が状態ファイルに保存され続けます（`/dubbing` の場合は `*.dubresume.json`、`/srt` の場合は `*.srtresume.json`）。通知に表示される **`--resume "<state-file>"`** コマンドを実行すると、残りの部分だけを完了できます（完了済みの部分は自動的にスキップされます）。 |

---

## プライバシーとテレメトリー

`/dubbing` と `/srt` は、スキルを改善するために**匿名**の利用イベントを送信します — 例えば、実行されたアクション（吹き替え／リップシンク／分離／字幕抽出）、成功したかどうか、言語ペア、メディアの長さ、アプリバージョン、OSなどです。インストールごとのランダムなIDのみでタグ付けされ、APIキー、ファイル名やメディアの内容、アカウント／メールアドレス、ワークスペースIDは一切含まれません。`PERSO_NO_TELEMETRY` 環境変数でいつでもオプトアウトできます。

---

## リポジトリ構成

```text
.claude-plugin/    Claude Code プラグイン + マーケットプレイスマニフェスト
.codex-plugin/     Codex プラグインマニフェスト
.cursor-plugin/    Cursor プラグインマニフェスト
docs/              GitHub Pages ランディング + 翻訳版 README・FAQ（12言語）
skills/dubbing/    吹き替えスキル本体（SKILL.md・lib/・scripts/） — 自己完結型
skills/srt/        SRT字幕スキル（SKILL.md・scripts/） — dubbingスキルのlib/を利用
scripts/           リポジトリレベルのインストーラー（install.mjs）
```

## ライセンス

このスキルのコードは **[MITライセンス](../../LICENSE)** の下で配布されています。実際の吹き替えはPerso Dubbing APIを通じて実行されるため、API自体の利用は [Perso AI利用規約](https://perso.ai) および料金体系に従います。
