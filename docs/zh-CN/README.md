# 🎬 /dubbing — Perso Dubbing 视频翻译

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ **简体中文** ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

这是一个编程智能体（coding agent）技能，可将 [Perso Dubbing](https://perso.ai/dubbing) 的 AI 配音能力带入你的智能体。安装一次，之后只需说一句*“把这个视频配音成英语”*即可。

- **配音**成其他语言——单个文件、整个文件夹，或一个 URL
- 对配音后的视频进行**唇形同步**，让口型与新音频相匹配
- **分离**人声与背景音频
- **字幕**（`/srt`）——通过语音转文字提取 SRT，再由你的智能体进行翻译
- 体积过大或时长过长的媒体会被自动拆分、处理并重新合并

运行环境为 **Node.js 18+**，并需要一个 **Perso Dubbing API 密钥**。它基于 Agent Skills 标准（`SKILL.md`）构建，因此在 Claude、Codex 和 Antigravity 上的行为完全一致。

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## 安装

> 📖 **[图文教程 →](https://dubbing-plugin.perso.ai/en/)**——选择你使用的智能体并复制命令。

### Claude 桌面应用 —— 最简单，无需终端（约 3 分钟）

在 <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude 桌面应用</a>中（付费版）：

1. 打开 **Code 标签页**（顶部居中位置），选择任意文件夹，并选择 **Local**（本地）环境——插件在云端会话中不可用。
2. 将以下每条命令粘贴到提示框中并按回车，一次一条：

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

3. 发起配音请求——*“把这个视频配音成英语——C:\videos\clip.mp4”*。YouTube 链接或整个文件夹同样适用。除非指定了 `--out`，否则结果会保存在源视频旁边。

**Claude Code CLI：**请改用 `/plugin marketplace add perso-ai/perso-dubbing-plugin` 和 `/plugin install perso-dubbing@perso-ai`。

### 其他所有宿主环境

```bash
npx perso-dubbing
```

它会检测你已安装的宿主环境，把两个技能都安装进去，并打印各自的安装位置。使用 `--claude` / `--codex` / `--antigravity` 可只安装到某一个宿主，`--all` 安装到全部宿主，`--project` 则仅限当前项目。已经克隆了本仓库？在仓库根目录运行 `node scripts/install.mjs` 可实现同样的效果，且无需联网。

<details>
<summary><b>🤖 致智能体</b> — 如果你只拿到了本仓库的 URL</summary>

- **Claude Code（桌面应用或 CLI）**——请自行运行以下一行安装命令（非交互且幂等，重复运行也安全）：

  ```bash
  claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
  ```

  两条命令都成功后，请告知用户开始新会话（或重启 Claude Code）——`/dubbing` 和 `/srt` 将从下一个会话开始加载。只有当你的 shell 中无法使用 `claude` CLI 时，才回退为向用户展示上面的命令、由其自行输入。
- **Codex · Antigravity，或用户已将安装工作交给你处理**——运行 `npx perso-dubbing`（如果仓库已克隆到本地，则运行 `node scripts/install.mjs`）。
- **ChatGPT（网页/应用 — 无法在用户电脑上使用终端）**——阅读 https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/chatgpt-setup.md 并照做：先让用户电脑装上 **Codex**，安装将在那里继续。（已经在带终端的 Codex 里？请按上面那条执行。）
- **Gemini（网页/应用 — 无法在用户电脑上使用终端）**——阅读 https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/gemini-setup.md 并照做：先安装 **Antigravity**，安装将在那里继续。（已经在 Antigravity 里？请按上面那条执行。）

</details>

### 首次运行 —— 你的 API 密钥

浏览器会打开一个页面：登录并点击一次，你的密钥便会签发并加密保存在本机。无需复制任何内容。如果无法打开浏览器，则会改为打开一个密钥文件——将密钥粘贴进去并保存，该文件会被加密并随后删除。

<a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">获取 API 密钥</a> · 随时可用 `npm run key:check` 进行验证

---

## 使用方法

只需告诉你的智能体你想要什么：

> “把这个视频配音成英语——C:\videos\clip.mp4”
>
> “把这个文件夹里的所有视频配音成日语和西班牙语”
>
> “把这个 YouTube 链接配音成英语，并做唇形同步”
>
> “把这段素材里的人声和背景音乐分离出来”
>
> “帮我做一份这个视频的英文 SRT 字幕”

或者输入 **`/dubbing`** / **`/srt`** 开始。如需完整的 CLI 选项列表，可询问你的智能体，或运行 `npm run dub -- --help`。

---

## 故障排查

还有其他疑问？请查看 **[FAQ](FAQ.md)**。

| 现象 | 解决方法 |
|---|---|
| 找不到 `node` | 从 <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a> 安装 LTS 版本（或请你的智能体*“帮我安装 Node.js”*），然后重试。 |
| Claude 桌面应用要求安装 Git（Windows） | Code 标签页首次使用时需要 <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a>。安装后重启应用即可。 |
| `claude` 命令或 Plugins 菜单没有反应 | 你当前处于**云端会话**——插件需要 **Local**（本地）会话或 SSH 会话。 |
| 密钥被拒绝或缺失 | 重新注册：`node skills/dubbing/scripts/connect.mjs`。可用 `npm run key:check` 检查已保存的密钥。 |
| ffmpeg 相关报错 | ffmpeg 通常会自动安装；如果失败，运行 `npm run doctor`。 |
| 运行到一半停止（积分不足、崩溃、进程被终止） | 进度会持续保存。运行提示中给出的 **`--resume "<state-file>"`** 命令——已完成的部分会被跳过，且不会重复计费。 |

---

## 隐私与遥测

为了改进这些技能，`/dubbing` 和 `/srt` 会发送使用事件——例如执行了哪个操作、是否成功、媒体时长、应用版本以及操作系统。每个事件都带有一个随机生成的每次安装唯一 ID 和你的工作区编号。你的 API 密钥和媒体内容绝不会包含在内。你可以随时通过 `PERSO_NO_TELEMETRY` 选择退出。

---

## 仓库结构

```text
.claude-plugin/    Claude Code 插件 + 市场清单
.codex-plugin/     Codex 插件清单
docs/              GitHub Pages 落地页 + 翻译版 README · FAQ（12 种语言）
skills/dubbing/    配音技能本体（SKILL.md · lib/ · scripts/）——自成一体
skills/srt/        SRT 字幕技能（SKILL.md · scripts/）——使用 dubbing 技能的 lib/
scripts/           仓库级安装脚本（install.mjs）
```

## 许可证

本技能的代码基于 **[MIT 许可证](../../LICENSE)** 发布。实际的配音处理由 Perso Dubbing API 完成，因此 API 的使用需遵循 [Perso AI 服务条款](https://perso.ai)及其定价规则。
