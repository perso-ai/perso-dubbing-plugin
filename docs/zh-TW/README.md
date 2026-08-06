<div align="center">

# Perso Dubbing Plugin

**每部影片、每種語言。配音、字幕、短影音剪輯，都在你的 coding agent 裡完成。**
*「把這部影片配音成中文」一句話就是完整流程。*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](../../LICENSE)

<sub>

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ **繁體中文** ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

</sub>

</div>

<br>

| 功能 | 你這樣說 | 你會得到 | |
|---|---|---|---|
| **配音** | *「把這部影片配音成日文」* | 同一部影片，換上新語言的聲音 | |
| **唇形同步** | *「…順便做唇形同步」* | 嘴型完全對上配音後的聲音 | |
| **人聲分離** | *「把人聲和音樂分開」* | 人聲軌與背景音軌 | |
| **語音轉字幕** | *「幫我做一份英文 SRT」* | 用 STT 擷取出的 SRT | |
| **字幕翻譯** | *「把 subs.srt 翻譯成西班牙文」* | 翻譯完成的 SRT，時間軸原封不動，附品質檢查 | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **樣式字幕** | *「把這些字幕燒錄到影片上」* | 套好樣式字幕的影片 | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **短影音剪輯** | *「把 2:00–3:00 剪成短影音」* | 重新取景成 9:16 的片段 | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **AI 精華** | *「挑最精彩的片段做成短影音」* | AI 挑選的精華片段 | |

檔案、資料夾、YouTube/TikTok 網址都能直接丟進來。

<br>

## 安裝

> **拿著這個儲存庫網址來安裝的 agent？** 在 Claude Code 裡現在就執行（非互動式，可安全重複執行）：
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> 請提醒使用者重新啟動，`/dubbing`、`/srt`、`/clip` 就會載入。其他 host：`npx perso-dubbing`。沒有終端機的環境（ChatGPT / Gemini）：[chatgpt-setup](../chatgpt-setup.md) · [gemini-setup](../gemini-setup.md)

**Claude 桌面版**（付費方案）：打開 **Code 分頁**，選一個資料夾，選擇 **Local**，貼上：

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI**：先執行 `/plugin marketplace add perso-ai/perso-dubbing-plugin`，再執行 `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · 其他任何工具**：`npx perso-dubbing` 會自動偵測你安裝的 host，並逐一裝好。

只需要 **Node.js 18+**，其他什麼都不用。[圖解安裝指南](https://dubbing-plugin.perso.ai/en/) · [FAQ](FAQ.md)

<br>

<sub>FREE · 本機執行</sub>

## 樣式字幕

從十二種預設樣式中挑一個，或直接用白話描述：*「黃色字、黑色外框、放在下方。」* 燒錄在你的電腦上用 ffmpeg 完成：不用上傳、不用排隊、不用帳號。要做好幾種語言？每份 SRT 都會產出一支完成的影片。

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="12 種字幕樣式預設">
</p>

<br>

<sub>FREE · 本機執行</sub>

## 字幕翻譯

把任何 SRT 交過來，說出你要的語言。一次好幾種也沒問題，一趟就全部處理完。每一句字幕都保留原本的精確時間軸，出現與消失的時間點和原本一模一樣。交付之前，還會檢查有沒有太長或閱讀速度太快的句子。

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="字幕翻譯示範">
</p>

<br>

<sub>FREE · 本機執行</sub>

## 短影音剪輯

丟進時間碼，就拿到直式短影音：16:9 → 9:16 重新取景、命名整理好，隨時可以上字幕。或者把逐字稿交給 AI，讓它挑出適合做短影音的片段：用鉤子開場，把情緒帶到最高點，在能量下滑前收尾。每支 30–90 秒。

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="短影音剪輯示範：在聊天中提出需求，AI 在時間軸上挑出精華，產出 9:16 短影音">
</p>

<br>

<sub>PERSO API</sub>

## 配音與唇形同步

一次執行就能處理單一檔案、整個資料夾或 YouTube/TikTok 網址，一次上傳就能配成多種語言。超過方案上限的影片會自動分割、處理、再合併；中斷的工作會從停下的地方精準續跑，已完成的部分絕不重複計費。配音會把原始聲音複製到新語言，唇形同步再讓嘴型跟著這段複製的聲音動起來。

<br>

<sub>PERSO API</sub>

## 語音轉字幕（STT）

還沒有字幕？語音辨識在 Perso 伺服器上執行，使用點數把影片的聲音轉成原始語言的 SRT，單一檔案或整個資料夾都可以。SRT 產出之後的每一步都是免費的：翻譯、套樣式、燒錄。

<br>

<sub>PERSO API</sub>

## 人聲分離

把影片或音訊拆成乾淨的音軌：人聲與背景音。有多位說話者時，每個人的聲音會各自成為獨立音軌。你可以換掉配樂、重新處理對白，或單獨取用任何一軌。

<br>

## 能免費的地方全部免費。必須付費的地方才付費。

**MIT 授權，免費且開源。** 在你電腦上執行的一切都不花錢、不需要帳號：字幕套樣式與燒錄、翻譯你手上的 SRT、依時間碼剪片。只有工作跑在 Perso 伺服器上時才需要點數：配音、唇形同步、人聲分離、語音辨識，透過 [Perso Dubbing API](https://developers.perso.ai/api-keys) 依處理秒數計費。

沒有繁瑣的前置設定。第一次執行伺服器工作時會自動開啟瀏覽器：登入、點一下、金鑰加密儲存。免費步驟從頭到尾都不會問你。

<br>

---

<sub>**隱私**：`/dubbing`、`/srt`、`/clip` 會傳送使用事件來改進這些技能，內容包含執行了什麼與結果如何、媒體長度、樣式選擇、粗略的地區設定、應用程式版本/作業系統，以及是否使用（並註冊）了 Perso API 金鑰。每筆事件帶有安裝時產生的隨機 ID 與你的 workspace 編號；絕不包含你的金鑰、媒體、檔案名稱或字幕文字。可透過 `PERSO_NO_TELEMETRY` 選擇退出。</sub>

<sub>**授權**：技能程式碼採 [MIT](../../LICENSE) 授權。API 的使用受 [Perso AI 服務條款](https://perso.ai)與其定價規範。</sub>
