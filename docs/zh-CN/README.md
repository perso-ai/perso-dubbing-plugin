# 🎬 /dubbing — Perso AI 视频自动配音

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ **简体中文** ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

这是一个编程智能体（coding agent）技能，可将 [Perso AI](https://perso.ai) 的 **Dubbing（AI 配音）**能力带入你的智能体中。它能将视频**自动配音**成其他语言——支持单个文件或整个文件夹，即便是体积过大或时长过长的媒体文件，也会被自动拆分、处理并重新合并。它还可以对配音后的视频进行**唇形同步（lip-sync）**，以及**将人声与背景音频分离**。

此外，本软件包还提供了 **`/srt`**——第二个技能，可通过 Perso 的语音转文字技术从视频、音频或 URL 中提取 **SRT 字幕**，然后让你的智能体将其翻译成你需要的任意语言（也可以直接提供未经翻译的原始语言转录文稿）。

它在后台调用 Perso Dubbing API，因此**需要一个 Perso Dubbing API 密钥**（一个密钥即可同时用于两个技能）。 → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">获取 API 密钥</a>

由于所有宿主环境都使用相同的 **Agent Skills 标准**（`SKILL.md`），因此无论安装在哪里，它的使用体验都是一致的——只需运行 `/dubbing`，或说一句*“帮我配音这个视频”*（或运行 `/srt`——说一句*“帮我做一份这个视频的英文 SRT 字幕”*）即可。

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## 🖥️ 最简单的方式 —— Claude 桌面应用（约 3 分钟）

> 📖 **想要图文教程？**在**[安装教程 →](https://dubbing-plugin.perso.ai/?lang=en)**中选择你使用的智能体并复制命令。

无需终端。在 <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude 桌面应用</a>中（付费版）：

1. **打开 Code 标签页**（顶部居中位置），选择任意文件夹——选择 **Local**（本地）环境（插件在云端会话中不可用）。
2. **依次粘贴以下每条命令**到提示框中并按回车，一次一条：

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *更喜欢点击操作？在执行第一条命令后，点击提示框旁的 **+** 按钮 → **Plugins** → **Add plugin** → 安装 **perso-dubbing**。*
3. **发起配音请求**——例如*“把这个视频配音成英语——C:\videos\clip.mp4”*（YouTube 链接或整个文件夹同样适用）。首次运行时会自动打开一个密钥文件，用于填写你的 <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Perso API 密钥</a>——请将密钥粘贴到该文件中，**而不是聊天窗口**。除非指定了 `--out`，否则结果会保存在源视频旁边。

> 💡 该技能本身运行在 **Node.js 18+** 上。如果你的电脑没有安装，智能体会提示找不到 `node`——只需回复*“帮我安装 Node.js”*即可（或从 <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> 下载 LTS 版本），然后重试。

在 **Claude Code CLI** 中，请改用 `/plugin marketplace add perso-ai/perso-dubbing-plugin` 和 `/plugin install perso-dubbing@perso-ai`。

---

## 在其他宿主环境中安装

一个通用的快捷方式：把本仓库的 URL 粘贴给你的智能体，并说*“安装这个”*即可。

> **🤖 致智能体：**如果你只拿到了本仓库的 URL，请根据所在宿主环境选择对应路径：
>
> - **Claude Code（桌面应用或 CLI）：**即使用户说了“安装这个”，也**不要**立即运行 npx。请向用户展示上文*Claude 桌面应用*小节中的两条 命令，并请他们自行逐条输入（每条消息一条），因为这些是需要用户自己输入的斜杠命令，你无法代为执行。同时也可以提及桌面应用中的点击路径：执行第一条命令后，**+ 按钮 → Plugins → Add plugin**。如需调整措辞：shell 环境变量中的 `CLAUDE_CODE_ENTRYPOINT=cli` 暗示这是一个终端会话（这是一个非官方文档记录的信号——不确定时，两种路径都展示出来）。只有当用户看过上述方式后仍希望你代为处理安装时，才退回使用 npx。
> - **Codex · Cursor · Antigravity，或用户已将安装工作交给你处理：**运行以下这一条命令即可——它会拉取安装包，自动检测已安装的所有宿主环境，并将该技能安装到每一个宿主中：
>
> ```bash
> npx perso-dubbing
> ```
>
> 如果仓库已经克隆到本地，可改为在仓库根目录运行 `node scripts/install.mjs`（无需联网）。

<details>
<summary><b>Codex</b></summary>

Codex 会从共享的 Agent Skills 文件夹中读取技能。运行 `npx perso-dubbing --codex`，或手动复制：

```text
~/.agents/skills/dubbing/        # 个人使用（所有仓库）—— 当前版本 Codex
~/.codex/skills/dubbing/         # 旧版本 Codex（安装程序会同时写入这两处）
<repo>/.agents/skills/dubbing/   # 仅限本仓库
```

本仓库同时提供了一份 Codex 插件清单文件（`.codex-plugin/plugin.json`），用于通过市场（marketplace）方式安装。

</details>

<details>
<summary><b>Cursor</b></summary>

运行 `npx perso-dubbing --cursor`，或复制到：

```text
~/.cursor/skills/dubbing/        # 全局
.cursor/skills/dubbing/          # 仅限当前项目
```

本仓库提供了一份 Cursor 插件清单文件（`.cursor-plugin/plugin.json`），用于 Cursor 插件市场。

</details>

<details>
<summary><b>Antigravity</b></summary>

运行 `npx perso-dubbing --antigravity`，或复制到以下任一位置：

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+（共享的 Agent Skills 文件夹）
```

</details>

<details>
<summary><b>⚡ 一行命令安装（适用于任意宿主环境）</b></summary>

自动检测你使用的宿主环境并安装到所有环境中——无需克隆仓库：

```bash
npx perso-dubbing
```

- 仅安装到指定宿主：`--claude` / `--antigravity` / `--codex` / `--cursor`；全部安装：`--all`
- 仅限当前项目（`./.claude`、`./.agents` 等）：`--project`

已经克隆了本仓库？在仓库根目录运行 `node scripts/install.mjs` 即可实现同样的效果，且无需联网。

</details>

<details>
<summary><b>🔧 手动安装</b></summary>

将**两个**技能文件夹一并复制到你所用宿主环境的 skills 目录下（`srt` 技能会从相邻文件夹导入 `dubbing` 技能的库文件）。从仓库根目录执行：

```bash
# macOS / Linux
mkdir -p <skills_folder> && cp -r skills/dubbing skills/srt <skills_folder>/
```

> 💡 Windows（PowerShell）：`New-Item -ItemType Directory -Force <skills_folder>; Copy-Item .\skills\dubbing,.\skills\srt <skills_folder>\ -Recurse`

</details>

安装完成后，在你的智能体中输入 **`/dubbing`**，或直接说**“帮我配音这个视频”**即可运行——如需生成字幕，可输入 **`/srt`** 或说**“帮我做一份这个视频的英文 SRT 字幕”**。（以上任意一种安装方式都会同时安装这两个技能。）

---

## 示例

最简单的方式——直接告诉你的智能体：

> “把这个视频配音成英语——C:\videos\clip.mp4”

你也可以直接在仓库根目录运行 CLI：

```bash
# 单个视频（自动检测源语言 → 英语）
npm run dub -- "clip.mp4" --target en --out result.mp4

# 一次配多种语言（只上传/拆分一次，各语言复用）
npm run dub -- "clip.mp4" --target en,ja,zh

# 一次处理多个输入（可混合使用 URL、文件和文件夹）
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# 配音 + 唇形同步（口型与配音音频匹配；需额外消耗积分）
npm run dub -- "clip.mp4" --target en --lipsync

# 分离人声 / 背景音轨（不进行配音）
npm run dub -- "clip.mp4" --separate

# 提取字幕并让智能体进行翻译（/srt 技能）
npm run srt -- "clip.mp4" --target en,ja

# 仅生成转录文本——原始语言 SRT，不进行翻译
npm run srt -- "clip.mp4" --transcribe-only
```

*（等效的直接调用方式：`node skills/dubbing/scripts/dubbing.mjs …`——或在已安装的技能文件夹内运行 `node scripts/dubbing.mjs …`。）*

---

## 故障排查

还有其他疑问？请查看 **[FAQ](FAQ.md)**。

| 现象 | 解决方法 |
|---|---|
| Claude 桌面应用要求安装 Git（Windows） | Code 标签页首次使用时需要 <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a>。安装后重启应用即可。 |
| `claude` 命令或 Plugins 菜单没有反应 | 你当前处于**云端会话**——插件仅在 **Local**（本地）会话（以及 SSH 会话）中可用。请将环境切换为 Local 后重试。 |
| 找不到 `node` / 安装或运行失败 | 该技能运行在 **Node.js 18+** 上——可通过 `node -v` 检查。如未安装，请从 <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> 安装 LTS 版本，或者直接在会话中请 Claude 帮你安装，然后重启应用。 |
| 还没有 API 密钥 | 只需运行任意配音命令——密钥文件会自动打开；粘贴你的密钥并保存即可（该文件会被加密并随后删除）。手动检查：`npm run key:check`。**请勿将密钥粘贴到聊天窗口中。** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">获取 API 密钥</a> |
| ffmpeg 相关报错 | ffmpeg 通常会自动安装。如果失败，运行 `npm run doctor`。 |
| 运行到一半停止（积分不足、崩溃、进程被终止） | 运行过程中，进度会持续保存到状态文件中（`/dubbing` 对应 `*.dubresume.json`，`/srt` 对应 `*.srtresume.json`）。运行提示中给出的 **`--resume "<state-file>"`** 命令，即可仅完成剩余部分（已完成的部分会自动跳过）。 |

---

## 隐私与遥测

为了改进这些技能，`/dubbing` 和 `/srt` 会发送**匿名**使用事件——例如执行了哪个操作（配音 / 唇形同步 / 分离 / 字幕提取）、是否成功、语言对、媒体时长、应用版本以及操作系统。这些数据仅通过一个随机生成的每次安装唯一 ID 进行标记，绝不包含你的 API 密钥、文件名或媒体内容、账号/邮箱，以及工作区 ID。你可以随时通过 `PERSO_NO_TELEMETRY` 环境变量选择退出。

---

## 仓库结构

```text
.claude-plugin/    Claude Code 插件与市场清单文件
.codex-plugin/     Codex 插件清单文件
.cursor-plugin/    Cursor 插件清单文件
docs/              GitHub Pages 落地页 + 多语言 README·FAQ（12 种语言）
skills/dubbing/    配音技能（SKILL.md · lib/ · scripts/）—— 自包含
skills/srt/        SRT 字幕技能（SKILL.md · scripts/）—— 使用配音技能的 lib/
scripts/           仓库级安装脚本（install.mjs）
```

## 许可证

本技能的代码基于 **[MIT 许可证](../../LICENSE)** 发布。实际的配音处理由 Perso Dubbing API 完成，因此 API 的使用需遵循 [Perso AI 服务条款](https://perso.ai)及其定价规则。
