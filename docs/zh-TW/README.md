# 🎬 /dubbing — Perso Dubbing 影片翻譯配音

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ **繁體中文** ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

一款編碼代理（coding-agent）技能，將 [Perso Dubbing](https://perso.ai/dubbing) 的 AI 配音帶入你的代理程式。安裝一次後，只要說一句「把這個影片配音成英文」即可。

- **配音**成其他語言——單一檔案、整個資料夾或網址皆可
- 為配音後的影片**對嘴（lip-sync）**，讓嘴型與新的音訊一致
- **分離**人聲與背景音訊
- **字幕**（`/srt`）——透過語音轉文字擷取 SRT，再由你的代理程式進行翻譯
- 過大或過長的媒體會自動分割、處理後再合併回來

需要 **Node.js 18+** 以及一組 **Perso Dubbing API 金鑰**。基於 Agent Skills 標準（`SKILL.md`）打造，因此在 Claude、Codex、Cursor 與 Antigravity 上的行為完全一致。

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## 安裝

> 📖 **[圖文教學 →](https://perso-ai.github.io/perso-dubbing-plugin/)**——選擇你使用的代理程式並複製指令。

### Claude 桌面應用程式——最簡單，不需終端機（約 3 分鐘）

在 <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude 桌面應用程式</a>（付費方案）中：

1. 開啟 **Code 分頁**（畫面上方中央），選擇任一資料夾，並選擇 **Local** 環境——雲端工作階段無法使用外掛程式。
2. 依序將以下每個指令貼到提示輸入框並按下 Enter：

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *偏好點選操作？輸入第一個指令後：**+** 按鈕 → **Plugins** → **Add plugin** → **perso-dubbing**。*
3. 提出配音需求——「把這個影片配音成英文——C:\videos\clip.mp4」。YouTube 網址或整個資料夾也可以。除非指定 `--out`，否則結果會儲存在原始影片旁邊。

**Claude Code CLI：**請改用 `/plugin marketplace add perso-ai/perso-dubbing-plugin` 與 `/plugin install perso-dubbing@perso-ai`。

### 其他所有宿主環境

```bash
npx perso-dubbing
```

它會偵測你已安裝哪些宿主環境，並將兩個技能安裝到每一個環境中，同時印出各自的安裝位置。加上 `--claude` / `--codex` / `--cursor` / `--antigravity` 可只安裝單一宿主環境，`--all` 為全部安裝，`--project` 則僅限目前專案。已經複製好儲存庫了嗎？在儲存庫根目錄執行 `node scripts/install.mjs` 也能達到相同效果，且不需要網路連線。

> **🤖 給代理程式的提示：**若你只拿到本儲存庫的網址：
>
> - **Claude Code（桌面應用程式或 CLI）**——即使使用者說「安裝這個」，也**不要**執行 npx。請將上方兩個 `claude …` 指令展示給使用者，並請他們自行逐一輸入（這些是使用者需親自輸入的斜線指令，你無法代為執行），同時附上點選路徑：**+** 按鈕 → **Plugins** → **Add plugin**。只有在他們看過說明後仍希望由你代為處理時，才使用 npx。
> - **Codex · Cursor · Antigravity，或使用者已將安裝工作委託給你**——執行 `npx perso-dubbing`（若儲存庫已複製到本機，則執行 `node scripts/install.mjs`）。

### 首次執行——你的 API 金鑰

瀏覽器頁面會自動開啟：登入後點擊一次，金鑰就會核發並加密儲存在這台電腦上，不需要複製貼上。若無法開啟瀏覽器，則會改為開啟金鑰檔案——請將金鑰貼入並儲存，該檔案會被加密並隨即刪除。

**絕對不要將 API 金鑰貼到聊天視窗中。** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">取得 API 金鑰</a> · 隨時可用 `npm run key:check` 確認

---

## 使用方式

只要告訴你的代理程式你想做什麼：

> 「把這個影片配音成英文——C:\videos\clip.mp4」
>
> 「把這個資料夾裡的每支影片都配音成日文和西班牙文」
>
> 「把這個 YouTube 連結配音成英文，並加上對嘴」
>
> 「把這段影片的人聲和背景音樂分離出來」
>
> 「幫我做一份這個影片的英文 SRT 字幕」

或輸入 **`/dubbing`** / **`/srt`** 開始。若需要完整的 CLI 選項清單，可詢問你的代理程式，或執行 `npm run dub -- --help`。

---

## 疑難排解

還有其他問題？請參考**[常見問答（FAQ）](FAQ.md)**。

| 症狀 | 解決方式 |
|---|---|
| 找不到 `node` | 請至 <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> 下載 LTS 版本（或直接請代理程式「幫我安裝 Node.js」），然後再試一次。 |
| Claude 桌面應用程式要求安裝 Git（Windows） | Code 分頁首次使用時需要 <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a>。安裝後請重新啟動應用程式。 |
| `claude` 指令或 Plugins 選單沒有反應 | 你目前處於**雲端工作階段**——外掛程式需要 **Local**（或 SSH）工作階段。 |
| 金鑰遭拒或尚未設定 | 請重新註冊：`node skills/dubbing/scripts/connect.mjs`。可用 `npm run key:check` 檢查已儲存的金鑰。 |
| ffmpeg 相關錯誤 | ffmpeg 通常會自動安裝；若安裝失敗，請執行 `npm run doctor`。 |
| 執行到一半中止（點數用盡、當機、程序被終止） | 進度會持續儲存。請執行提示訊息中顯示的 **`--resume "<state-file>"`** 指令——已完成的部分會被略過，且不會重複計費。 |

---

## 隱私權與遙測

`/dubbing` 與 `/srt` 會傳送使用事件以協助改善這些技能——例如執行了哪個動作、是否成功、媒體長度、應用程式版本以及作業系統。每筆事件都會附帶一組隨機產生的每次安裝專屬 ID 以及你的工作區編號。你的 API 金鑰與媒體內容絕不會包含在內。可隨時透過 `PERSO_NO_TELEMETRY` 選擇停用。

---

## 儲存庫結構

```text
.claude-plugin/    Claude Code 外掛程式 + 市集資訊清單
.codex-plugin/     Codex 外掛程式資訊清單
.cursor-plugin/    Cursor 外掛程式資訊清單
docs/              GitHub Pages 導覽頁 + 翻譯版 README · FAQ（12 種語言）
skills/dubbing/    配音技能本體（SKILL.md · lib/ · scripts/）——自成一體
skills/srt/        SRT 字幕技能（SKILL.md · scripts/）——使用 dubbing 技能的 lib/
scripts/           儲存庫層級的安裝程式（install.mjs）
```

## 授權條款

此技能的程式碼以 **[MIT 授權](../../LICENSE)** 方式發布。實際的配音處理是透過 Perso Dubbing API 執行，因此 API 的使用須遵循 [Perso AI 服務條款](https://perso.ai) 及其計費方式。
