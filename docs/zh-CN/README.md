<div align="center">

# Perso Dubbing Plugin

**每个视频，每种语言。配音、字幕、切片，都在你的编码代理里完成。**
*"把这个视频配音成中文"一句话就是完整流程。*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](../../LICENSE)

<sub>

[English](../../README.md) ｜ [한국어](../ko/README.md) ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ **简体中文** ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

</sub>

</div>

<br>

| 功能 | 你这样说 | 你会得到 | |
|---|---|---|---|
| **配音** | *"把这个视频配音成日语"* | 同一个视频，换上新语言的声音 | |
| **唇形同步** | *"…再加上唇形同步"* | 口型与配音音频完全匹配 | |
| **人声分离** | *"把人声和音乐分开"* | 人声轨道 + 背景轨道 | |
| **语音转字幕** | *"帮我生成英文 SRT"* | 通过 STT 提取的 SRT | |
| **字幕翻译** | *"把 subs.srt 翻译成西班牙语"* | 翻译好的 SRT，时间轴不变，含质量检查 | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **样式字幕** | *"把这些字幕烧录到视频上"* | 带样式字幕的成品视频 | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **短视频切片** | *"把 2:00–3:00 剪成短视频"* | 重新构图的 9:16 切片 | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **AI 精彩片段** | *"挑出最精彩的部分做成短视频"* | AI 选出的精彩片段切片 | |

文件、文件夹、YouTube/TikTok 链接都可以直接使用。

<br>

## 安装

> **拿着这个仓库地址来安装的代理？** 在 Claude Code 中立即运行（非交互式，可安全重复执行）：
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> 完成后请用户重启，`/dubbing`、`/srt`、`/clip` 即会加载。其他宿主：`npx perso-dubbing`。没有终端的环境（ChatGPT / Gemini）：[chatgpt-setup](../chatgpt-setup.md) · [gemini-setup](../gemini-setup.md)

**Claude 桌面应用**（付费方案）：打开 **Code 标签页**，选择一个文件夹，选 **Local**，粘贴：

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI**：先 `/plugin marketplace add perso-ai/perso-dubbing-plugin`，再 `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · 其他任何宿主**：`npx perso-dubbing` 会自动检测已安装的宿主并逐一安装。

只需要 **Node.js 18+**，别的什么都不用。[图文教程](https://dubbing-plugin.perso.ai/en/) · [FAQ](FAQ.md)

<br>

<sub>FREE · 本地运行</sub>

## 样式字幕

从十二种预设中挑一个，或者直接用大白话描述你想要的效果：*"黄色文字，黑色描边，放底部。"* 烧录在本地 ffmpeg 上完成：不上传、不排队、不需要账号。多种语言？每个 SRT 都会输出一个独立的成品视频。

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="12 种字幕样式预设">
</p>

<br>

<sub>FREE · 本地运行</sub>

## 字幕翻译

交出任意 SRT，说出你想要的语言。一次多种语言也没问题，一趟就能全部搞定。每一行字幕都严格保留原始时间轴，出现和消失的时刻与原来分毫不差。交付前还会检查有没有行太长或阅读速度太快的地方。

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="字幕翻译演示">
</p>

<br>

<sub>FREE · 本地运行</sub>

## 短视频切片

输入时间码，输出竖屏短视频：16:9 → 9:16 重新构图，命名妥当，随时可以加字幕。或者把文字稿交给 AI，让它挑出适合做短视频的片段：以钩子开场，把情绪推到顶点，在能量回落前收尾。每条 30–90 秒。

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="短视频切片演示：在聊天中提出需求，时间轴上选出精彩片段，输出 9:16 短视频">
</p>

<br>

<sub>PERSO API</sub>

## 配音与唇形同步

一次运行即可处理单个文件、整个文件夹或 YouTube/TikTok 链接，一次上传就能配音成多种语言。超出方案限额的视频会自动分割、处理、再合并；中断的任务会从停下的位置精确续跑，已完成的部分绝不重复计费。配音会把原声克隆到新语言里，唇形同步则让口型跟着克隆后的音频动起来。

<br>

<sub>PERSO API</sub>

## 语音转字幕（STT）

还没有字幕？语音识别在 Perso 服务器上运行并消耗积分，把视频音频提取为原语言的 SRT，单个文件或整个文件夹都可以。SRT 生成之后的每一步都是免费的：翻译、加样式、烧录。

<br>

<sub>PERSO API</sub>

## 人声分离

把视频或音频拆成干净的轨道：人声和背景。有多位说话人时，每个人的声音都会单独输出一条轨道。可以换掉配乐、重制对白，或者单独使用任何一条轨道。

<br>

## 能免费的都免费。必须付费的才付费。

**MIT 协议，免费开源。** 在你机器上运行的一切都不花钱、不需要账号：给字幕加样式并烧录、翻译你手上的 SRT、按时间码剪切片。只有当任务在 Perso 服务器上运行时才消耗积分：配音、唇形同步、人声分离和语音识别，通过 [Perso Dubbing API](https://developers.perso.ai/api-keys) 按处理秒数计费。

没有繁琐的准备流程。第一次运行服务器任务时会打开浏览器：登录，点一下，密钥即加密保存。免费步骤从不打扰你。

<br>

---

<sub>**隐私**：`/dubbing`、`/srt` 和 `/clip` 会发送匿名使用事件以改进这些技能，内容包括运行了什么及结果如何、媒体时长、样式选择、粗粒度地区设置、应用版本/操作系统，以及是否使用（并注册）了 Perso API 密钥。每个事件带有随机的每次安装 ID 和你的工作区编号；绝不包含你的密钥、媒体、文件名或字幕文本。设置 `PERSO_NO_TELEMETRY` 即可退出。</sub>

<sub>**许可**：技能代码采用 [MIT](../../LICENSE) 协议。API 使用受 [Perso AI 服务条款](https://perso.ai)及其定价约束。</sub>
