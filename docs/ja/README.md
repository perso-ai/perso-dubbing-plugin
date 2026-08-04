<div align="center">

# Perso Dubbing Plugin

**すべての動画を、すべての言語へ。吹き替えも字幕もクリップも、コーディングエージェントから直接。**
*「この動画を日本語に吹き替えて」の一言で完結します。*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](../../LICENSE)

<sub>

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ **日本語** ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

</sub>

</div>

<br>

| 機能 | こう頼むと | こうなります | |
|---|---|---|---|
| **吹き替え** | *「この動画を英語に吹き替えて」* | 同じ動画が、新しい言語の声で | |
| **リップシンク** | *「…リップシンクも付けて」* | 吹き替え音声に合わせた口の動き | |
| **音声分離** | *「声と音楽を分けて」* | 音声トラックと背景トラック | |
| **音声から字幕** | *「英語のSRTを作って」* | STTで抽出したSRT | |
| **字幕翻訳** | *「subs.srtをスペイン語に翻訳して」* | 翻訳済みSRT (タイミング維持、チェック込み) | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **スタイル字幕** | *「この字幕を動画に焼き込んで」* | スタイル字幕入りの動画 | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **ショートクリップ** | *「2:00–3:00をショートに切り出して」* | 9:16にリフレームされたクリップ | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **AIハイライト** | *「ベストシーンをショートに選んで」* | AIが選んだハイライトクリップ | |

ファイル、フォルダ、YouTube/TikTok URL、どれでもそのまま使えます。

<br>

## インストール

> **リポジトリURLだけを渡されてインストールしに来たエージェントへ。** Claude Codeなら今すぐ実行してください (非対話型、再実行しても安全):
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> 完了後、ユーザーに再起動を案内すると `/dubbing`、`/srt`、`/clip` が読み込まれます。他のホスト: `npx perso-dubbing`。ターミナルがない環境 (ChatGPT / Gemini): [chatgpt-setup](../chatgpt-setup.md) · [gemini-setup](../gemini-setup.md)

**Claude デスクトップアプリ** (有料プラン): **Codeタブ**を開き、フォルダを選択、**Local** を選んで貼り付け:

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI**: `/plugin marketplace add perso-ai/perso-dubbing-plugin` のあと `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · その他**: `npx perso-dubbing` がホストを検出し、それぞれにインストールします。

必要なのは **Node.js 18+** だけ。[ビジュアルガイド](https://dubbing-plugin.perso.ai/en/) · [FAQ](FAQ.md)

<br>

<sub>FREE · ローカル実行</sub>

## スタイル字幕

12種類のプリセットから選ぶか、言葉でそのまま伝えるだけ: *「黄色い文字、黒い縁取り、下に」*。焼き込みはローカルのffmpegで完結します: アップロードも、待ち時間も、アカウントも不要。複数言語? SRTごとに完成した動画が1本ずつ出来上がります。

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="字幕スタイルプリセット12種">
</p>

<br>

<sub>FREE · ローカル実行</sub>

## 字幕翻訳

SRTを渡して、欲しい言語を伝えてください。複数まとめてでも、一度の処理で全部そろいます。各行のタイミングは元のまま、表示されるタイミングも消えるタイミングも以前とまったく同じです。納品前には、行が長すぎないか、読むには速すぎないかまでチェックします。

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="字幕翻訳デモ">
</p>

<br>

<sub>FREE · ローカル実行</sub>

## ショートクリップ

タイムコードを入れれば縦型ショートが出てきます: 16:9 → 9:16のリフレームと名前付けが済み、字幕を載せる準備まで整った状態で。あるいは文字起こしを渡せば、ショートとして成立する瞬間をAIが選びます: フックで始まり、リアクションのピークまで引っ張り、勢いが落ちる前に切る。各30–90秒です。

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="ショートクリップのデモ: チャットで依頼、タイムラインでハイライトを選定、9:16のショートを出力">
</p>

<br>

<sub>PERSO API</sub>

## 吹き替えとリップシンク

ファイル1本でも、フォルダ全体でも、YouTube/TikTok URLでも、一度の実行と一度のアップロードで複数言語の吹き替えまで終わります。プランの上限を超える動画は自動で分割・処理・結合され、中断された処理は止まった地点から正確に再開し、完了済みの部分に再課金されることはありません。吹き替えは元の声をクローンして新しい言語で話させ、リップシンクはそのクローン音声に合わせて口を動かします。

<br>

<sub>PERSO API</sub>

## 音声から字幕 (STT)

字幕がまだない? 音声認識がPersoのサーバー上でクレジットを使い、動画の音声を元の言語のSRTに変換します。ファイル1本でもフォルダ全体でも対応。SRTができた後の工程はすべて無料です: 翻訳、スタイル、焼き込み。

<br>

<sub>PERSO API</sub>

## 音声分離

動画や音声を、声と背景音のクリーンなトラックに分けます。話者が複数いる場合は、一人ひとりの声が別々のトラックとして出力されます。サウンドトラックを差し替える、セリフだけリマスターする、トラック1本だけ取り出して使う、どれも自由です。

<br>

## 無料にできるところは無料に。有料はどうしても必要なところだけ。

**MITライセンスの無料オープンソースです。** 手元のマシンで動くものはすべて費用ゼロ、アカウントも不要です: 字幕のスタイル設定と焼き込み、手持ちのSRTの翻訳、タイムコード指定のクリップ切り出し。クレジットが必要になるのはPersoのサーバーで処理が走るときだけ: 吹き替え、リップシンク、音声分離、音声認識が対象で、[Perso Dubbing API](https://developers.perso.ai/api-keys)を通じて処理した秒数ぶんだけ課金されます。

面倒な初期設定はありません。サーバー処理を初めて実行した瞬間にブラウザが開きます: サインインしてワンクリック、キーは暗号化して保存されます。無料の工程では何も聞かれません。

<br>

---

<sub>**プライバシー**: `/dubbing`、`/srt`、`/clip` はスキル改善のため匿名の使用イベントを送信します。内容は、実行した処理とその結果、メディアの長さ、スタイルの選択、おおまかなロケール、アプリのバージョン/OS、Perso APIキーの使用 (および登録) の有無です。各イベントにはインストールごとのランダムIDとワークスペース番号が付きますが、APIキー・メディア・ファイル名・字幕テキストが含まれることは決してありません。`PERSO_NO_TELEMETRY` でオプトアウトできます。</sub>

<sub>**ライセンス**: スキルのコードは [MIT](../../LICENSE) です。APIの利用には [Perso AI利用規約](https://perso.ai)と料金が適用されます。</sub>
