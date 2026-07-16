# 🎬 /dubbing — Perso AI 影片自動配音

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ **繁體中文** ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

這是一款編碼代理（coding-agent）技能，將 [Perso AI](https://perso.ai) 的**配音（AI 配音）**功能帶入你的代理程式。它能將影片**自動配音**成其他語言——單一檔案或整個資料夾皆可，即使是過大或過長的媒體檔案，也會自動分割、處理後再合併回來。它還能為配音後的影片**進行對嘴（lip-sync）**，並能**將人聲從背景音訊中分離**。

此套件還包含 **`/srt`**——第二個技能，可透過 Perso 的語音轉文字技術，從影片／音訊／網址中擷取 **SRT 字幕**，接著由你的代理程式將字幕翻譯成你指定的任何語言（或者直接提供原始語言的逐字稿）。

它在幕後呼叫 Perso Dubbing API，因此**需要一組 Perso Dubbing API 金鑰**（一組金鑰可同時用於兩個技能）。 → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">取得 API 金鑰</a>

由於每個宿主環境都採用相同的 **Agent Skills 標準**（`SKILL.md`），無論安裝在哪裡，使用方式都一樣——只要執行 `/dubbing`，或直接說「幫我配音這個影片」即可（或執行 `/srt`——說「幫我做一份這個影片的英文 SRT 字幕」）。

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## 🖥️ 最簡單的方式 — Claude 桌面應用程式（約 3 分鐘）

> 📖 **想要圖文教學？**請在**[安裝教學 →](https://dubbing-plugin.perso.ai/en/)**中選擇你使用的工具並複製指令。

不需要終端機。在 <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude 桌面應用程式</a>（付費方案）中：

1. **開啟 Code 分頁**（畫面上方中央），選擇任一資料夾——請選擇 **Local** 環境（雲端工作階段無法使用外掛程式）。
2. **依序貼上以下每個指令**至提示輸入框並按下 Enter：

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *偏好點選操作？在輸入第一個指令後，按下提示輸入框旁的 **+** 按鈕 → **Plugins** → **Add plugin** → 安裝 **perso-dubbing**。*
3. **提出配音需求**——例如「把這個影片配音成英文——C:\videos\clip.mp4」（YouTube 網址或整個資料夾也可以）。第一次執行時會自動開啟金鑰檔案，供你貼上 <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Perso API 金鑰</a>——請將金鑰貼在該檔案中，**而非聊天視窗**。除非指定 `--out`，否則結果會儲存在原始影片旁邊。

> 💡 此技能本身需要 **Node.js 18+** 才能執行。如果你的電腦尚未安裝，代理程式會提示找不到 `node`——只要回覆「幫我安裝 Node.js」即可（或至 <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> 下載 LTS 版本），然後再試一次。

在 **Claude Code CLI** 中，請改用 `/plugin marketplace add perso-ai/perso-dubbing-plugin` 與 `/plugin install perso-dubbing@perso-ai`。

---

## 在其他宿主環境安裝

到處通用的捷徑：將本儲存庫的網址貼給你的代理程式，並說「安裝這個」。

> **🤖 給代理程式的提示：** 若你只拿到本儲存庫的網址，請依照你所在的宿主環境選擇對應路徑：
>
> - **Claude Code（桌面應用程式或 CLI）：** 即使使用者說「安裝這個」，也**不要**立即執行 npx。請將上方 *Claude 桌面應用程式* 段落中的兩個 指令展示給使用者，並請他們自行逐一輸入（這些是使用者需要親自輸入的斜線指令，你無法代為執行）。同時也可提及桌面應用程式的點選操作路徑：輸入第一個指令後，**+ 按鈕 → Plugins → Add plugin**。若需要調整措辭，shell 環境變數中的 `CLAUDE_CODE_ENTRYPOINT=cli` 暗示這是終端機工作階段（此為非官方文件記載的訊號——不確定時，請兩種路徑都呈現）。只有在使用者看過上述說明後仍要求你代為安裝時，才退回改用 npx。
> - **Codex、Cursor、Antigravity，或使用者已將安裝工作委託給你：** 執行以下這一個指令即可——它會取得套件、自動偵測所有已安裝的宿主環境，並將技能安裝到每一個環境中：
>
> ```bash
> npx perso-dubbing
> ```
>
> 若儲存庫已經複製到本機，改為在儲存庫根目錄執行 `node scripts/install.mjs`（不需要網路連線）。

<details>
<summary><b>Codex</b></summary>

Codex 會從共用的 Agent Skills 資料夾讀取技能。執行 `npx perso-dubbing --codex`，或手動複製至：

```text
~/.agents/skills/dubbing/        # 個人使用（所有儲存庫）— 目前版本的 Codex
~/.codex/skills/dubbing/         # 舊版 Codex（安裝程式會同時寫入兩處）
<repo>/.agents/skills/dubbing/   # 僅限本儲存庫
```

本儲存庫也提供 Codex 外掛程式清單（`.codex-plugin/plugin.json`），供以市集（marketplace）方式安裝使用。

</details>

<details>
<summary><b>Cursor</b></summary>

執行 `npx perso-dubbing --cursor`，或複製至：

```text
~/.cursor/skills/dubbing/        # 全域
.cursor/skills/dubbing/          # 僅限本專案
```

本儲存庫提供 Cursor 外掛程式清單（`.cursor-plugin/plugin.json`），供 Cursor 外掛程式市集使用。

</details>

<details>
<summary><b>Antigravity</b></summary>

執行 `npx perso-dubbing --antigravity`，或複製至以下任一位置：

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+（共用的 Agent Skills 資料夾）
```

</details>

<details>
<summary><b>⚡ 一行指令安裝（適用任何宿主環境）</b></summary>

自動偵測你所使用的宿主環境並全部安裝——不需要先複製儲存庫：

```bash
npx perso-dubbing
```

- 僅安裝特定宿主環境：`--claude` / `--antigravity` / `--codex` / `--cursor`；全部安裝：`--all`
- 僅限目前專案（`./.claude`、`./.agents` 等）：`--project`

已經複製好儲存庫了嗎？在儲存庫根目錄執行 `node scripts/install.mjs` 即可達到相同效果，且不需要網路連線。

</details>

<details>
<summary><b>🔧 手動安裝</b></summary>

請將**兩個**技能資料夾一併複製到你的宿主環境的技能目錄下（`srt` 技能會從旁邊的資料夾匯入 `dubbing` 技能的函式庫）。從儲存庫根目錄執行：

```bash
# macOS / Linux
mkdir -p <skills_folder> && cp -r skills/dubbing skills/srt <skills_folder>/
```

> 💡 Windows（PowerShell）：`New-Item -ItemType Directory -Force <skills_folder>; Copy-Item .\skills\dubbing,.\skills\srt <skills_folder>\ -Recurse`

</details>

安裝完成後，在你的代理程式中輸入 **`/dubbing`**，或直接說**「幫我配音這個影片」**即可執行——若要製作字幕，則輸入 **`/srt`** 或說**「幫我做一份這個影片的英文 SRT 字幕」**。（以上每種安裝方式都會同時安裝兩個技能。）

---

## 範例

最簡單的方式——只要告訴你的代理程式：

> 「把這個影片配音成英文——C:\videos\clip.mp4」

你也可以直接從儲存庫根目錄執行 CLI：

```bash
# 單一影片（自動偵測來源語言 → 英文）
npm run dub -- "clip.mp4" --target en --out result.mp4

# 一次配音多種語言（僅上傳/分割一次，各語言重複使用）
npm run dub -- "clip.mp4" --target en,ja,zh

# 一次處理多個輸入項目（可混合網址、檔案與資料夾）
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# 配音 + 對嘴（將嘴型對齊配音後的音訊；需額外點數）
npm run dub -- "clip.mp4" --target en --lipsync

# 分離人聲／背景音訊軌（不進行配音）
npm run dub -- "clip.mp4" --separate

# 擷取字幕並由代理程式進行翻譯（/srt 技能）
npm run srt -- "clip.mp4" --target en,ja

# 僅擷取逐字稿——原始語言 SRT，不進行翻譯
npm run srt -- "clip.mp4" --transcribe-only
```

*（等效的直接呼叫方式：`node skills/dubbing/scripts/dubbing.mjs …`——若在已安裝的技能資料夾內，則為 `node scripts/dubbing.mjs …`。）*

---

## 疑難排解

還有其他問題？請參考**[常見問答（FAQ）](FAQ.md)**。

| 症狀 | 解決方式 |
|---|---|
| Claude 桌面應用程式要求安裝 Git（Windows） | Code 分頁首次使用時需要 <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a>。安裝後請重新啟動應用程式。 |
| `claude` 指令或 Plugins 選單沒有反應 | 你目前處於**雲端工作階段**——外掛程式僅能在 **Local**（及 SSH）工作階段中使用。請將環境切換為 Local 後再試一次。 |
| 找不到 `node`／安裝或執行失敗 | 此技能需要 **Node.js 18+** 才能執行——可用 `node -v` 確認版本。若尚未安裝，請至 <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> 下載 LTS 版本，或直接在工作階段中請 Claude 幫你安裝，再重新啟動應用程式。 |
| 尚未設定 API 金鑰 | 只要執行任一配音指令，就會自動開啟金鑰檔案；貼上你的金鑰並儲存即可（會自動加密，且檔案隨後會被刪除）。手動檢查方式：`npm run key:check`。**請勿將金鑰貼到聊天視窗中。** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">取得 API 金鑰</a> |
| ffmpeg 相關錯誤 | ffmpeg 通常會自動安裝。若安裝失敗，請執行 `npm run doctor`。 |
| 執行到一半中止（點數用盡、當機、程序被終止） | 執行過程中，進度會持續儲存至狀態檔案中（`/dubbing` 為 `*.dubresume.json`，`/srt` 為 `*.srtresume.json`）。請執行提示訊息中顯示的 **`--resume "<state-file>"`** 指令，僅完成剩餘的部分（已完成的部分會自動略過）。 |

---

## 隱私權與遙測

`/dubbing` 與 `/srt` 會傳送**匿名**使用事件以協助改善這些技能——例如執行了哪個動作（配音／對嘴／分離／字幕擷取）、是否成功、語言配對、媒體長度、應用程式版本以及作業系統。這些資料僅以隨機產生的每次安裝專屬 ID 標記，絕不包含你的 API 金鑰、檔案名稱或媒體內容、帳號／電子郵件，或工作區 ID。可隨時透過 `PERSO_NO_TELEMETRY` 環境變數選擇停用。

---

## 儲存庫結構

```text
.claude-plugin/    Claude Code 外掛程式與市集清單
.codex-plugin/     Codex 外掛程式清單
.cursor-plugin/    Cursor 外掛程式清單
docs/              GitHub Pages 到達頁 + 多語言 README·FAQ（12 種語言）
skills/dubbing/    配音技能（SKILL.md · lib/ · scripts/）— 自成一體
skills/srt/        SRT 字幕技能（SKILL.md · scripts/）— 使用 dubbing 技能的 lib/
scripts/           儲存庫層級的安裝程式（install.mjs）
```

## 授權條款

此技能的程式碼以 **[MIT 授權](../../LICENSE)** 方式發布。實際的配音處理是透過 Perso Dubbing API 執行，因此 API 的使用本身須遵循 [Perso AI 服務條款](https://perso.ai) 及其計費方式。
