<div align="center">

# Perso Dubbing Plugin

**모든 영상을 모든 언어로. 더빙, 자막, 숏츠까지 코딩 에이전트에서 바로.**
*"이 영상 한국어로 더빙해줘" 한마디면 됩니다.*

[![Perso AI](https://img.shields.io/badge/Perso%20AI-Dubbing-5A4FF3?style=flat-square)](https://perso.ai/dubbing)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-1a1a1a?style=flat-square)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1a1a1a?style=flat-square)
![Hosts](https://img.shields.io/badge/Claude%20%C2%B7%20Codex%20%C2%B7%20Antigravity-1a1a1a?style=flat-square)
[![MIT](https://img.shields.io/badge/MIT-5A4FF3?style=flat-square)](../../LICENSE)

<sub>

[English](../../README.md) ｜ **한국어** ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

</sub>

</div>

<br>

| 기능 | 이렇게 말하면 | 이렇게 나옵니다 | |
|---|---|---|---|
| **더빙** | *"이 영상 일본어로 더빙해줘"* | 같은 영상, 새 언어의 목소리 | |
| **립싱크** | *"…립싱크도 해줘"* | 더빙 음성에 맞는 입모양 | |
| **음성 분리** | *"목소리랑 배경음악 분리해줘"* | 음성 트랙 + 배경 트랙 | |
| **음성 → 자막** | *"영어 SRT 만들어줘"* | STT로 추출한 SRT | |
| **자막 번역** | *"subs.srt 스페인어로 번역해줘"* | 번역 SRT (타이밍 유지, 검수 포함) | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **스타일 자막** | *"이 자막 영상에 입혀줘"* | 스타일 자막이 입혀진 영상 | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **숏츠 컷** | *"2:00–3:00 숏츠로 잘라줘"* | 9:16으로 리프레임된 클립 | ![FREE](https://img.shields.io/badge/FREE-5A4FF3?style=flat-square) |
| **AI 하이라이트** | *"베스트 모먼트 숏츠로 골라줘"* | AI가 고른 하이라이트 클립 | |

파일, 폴더, YouTube/TikTok URL 모두 그대로 넣으면 됩니다.

<br>

## 설치

> **저장소 URL만 받고 설치하러 온 에이전트라면?** Claude Code에서 지금 실행하세요 (비대화형, 재실행 안전):
> ```bash
> claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
> ```
> 완료 후 사용자에게 재시작을 안내하면 `/dubbing`, `/srt`, `/clip`이 로드됩니다. 다른 호스트: `npx perso-dubbing`. 터미널이 없는 환경(ChatGPT / Gemini): [chatgpt-setup](../chatgpt-setup.md) · [gemini-setup](../gemini-setup.md)

**Claude 데스크톱 앱** (유료 플랜): **Code 탭**을 열고, 폴더 선택, **Local** 환경에서 붙여넣기:

```text
claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
```

**Claude Code CLI**: `/plugin marketplace add perso-ai/perso-dubbing-plugin` 후 `/plugin install perso-dubbing@perso-ai`

**Codex · Antigravity · 그 외**: `npx perso-dubbing` 하나로 설치된 호스트를 감지해 전부 설치합니다.

필요한 건 **Node.js 18+** 뿐. [설치 가이드](https://dubbing-plugin.perso.ai/ko/) · [FAQ](FAQ.md)

<br>

<sub>FREE · 로컬 실행</sub>

## 스타일 자막

12가지 프리셋에서 고르거나, 그냥 말로 설명하세요: *"노란 글씨, 검은 외곽선, 하단에."* 인코딩은 내 컴퓨터의 ffmpeg에서 끝납니다: 업로드도, 대기열도, 계정도 없습니다. 여러 언어? SRT마다 완성본이 하나씩 나옵니다.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif" width="720" alt="자막 스타일 프리셋 12종">
</p>

<br>

<sub>FREE · 로컬 실행</sub>

## 자막 번역

SRT를 건네고 원하는 언어들을 말하세요. 여러 개여도 한 번에 전부 처리됩니다. 각 자막이 뜨고 사라지는 순간은 원본과 완전히 똑같이 유지됩니다. 전달 전에는 줄이 너무 길거나 읽기에 너무 빠른 곳이 없는지까지 검토합니다.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-translate-demo.gif" width="720" alt="자막 번역 데모">
</p>

<br>

<sub>FREE · 로컬 실행</sub>

## 숏츠 클립

타임코드를 넣으면 세로 숏츠가 나옵니다. 16:9 → 9:16 리프레임과 파일명 정리, 자막 입힐 준비까지 끝난 상태로. 아니면 대본을 맡기세요: 훅으로 시작해서 리액션의 정점까지 끌고 가고, 에너지가 꺾이기 전에 끊는 순간을 AI가 고릅니다. 각 30–90초.

<p align="center">
  <img src="https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/clip-shorts-demo.gif" width="720" alt="숏츠 클립 데모: 채팅으로 요청, 타임라인에서 하이라이트 선정, 9:16 숏츠 생성">
</p>

<br>

<sub>PERSO API</sub>

## 더빙과 립싱크

파일 하나든, 폴더 전체든, YouTube/TikTok URL이든 한 번의 실행과 한 번의 업로드로 여러 언어 더빙까지 끝납니다. 플랜 한도를 넘는 영상은 알아서 분할·처리·병합되고, 중단된 작업은 멈춘 지점부터 재개되며 끝난 부분은 다시 과금되지 않습니다. 더빙은 원본 목소리를 복제(voice clone)해 새 언어로 말하게 하고, 립싱크를 더하면 입모양까지 그 음성에 맞춰 움직입니다.

<br>

<sub>PERSO API</sub>

## 음성 → 자막 (STT)

자막이 아직 없다면? 음성 인식이 Perso 서버에서 크레딧을 사용해 영상의 오디오를 원어 SRT로 추출합니다. 파일 하나든 폴더 전체든 가능합니다. SRT가 만들어진 다음 단계는 전부 무료입니다: 번역, 스타일, 영상에 굽기.

<br>

<sub>PERSO API</sub>

## 음성 분리

영상이나 오디오를 목소리와 배경음 트랙으로 나눕니다. 화자가 여러 명이면 사람별로 목소리 트랙이 하나씩 나옵니다. 사운드트랙을 갈아끼우거나, 대사만 리마스터하거나, 트랙 하나만 따로 쓸 수 있습니다.

<br>

## 무료일 수 있는 건 전부 무료로.

**MIT, 무료 오픈소스입니다.** 내 컴퓨터에서 도는 모든 단계는 비용도 계정도 필요 없습니다: 자막 스타일 입히기, 갖고 있는 SRT 번역, 타임코드 클립 컷. 크레딧은 Perso 서버를 사용할 때만 들어갑니다: 더빙, 립싱크, 음성 분리, 음성 인식이 여기에 해당하며, [Perso Dubbing API](https://developers.perso.ai/api-keys)를 통해 처리한 초 단위로 과금됩니다.

준비 절차도 없습니다. 서버 작업이 처음 실행되는 순간 브라우저가 열립니다: 로그인, 클릭 한 번, 키는 암호화되어 저장됩니다. 무료 단계는 묻지도 않습니다.

<br>

---

<sub>**개인정보**: `/dubbing`, `/srt`, `/clip`은 스킬 개선을 위해 익명 사용 이벤트를 전송합니다. 실행한 동작과 그 결과, 미디어 길이, 스타일 선택, 대략적 로캘, 앱 버전/OS, 그리고 Perso API 키 사용(및 등록) 여부가 담깁니다. 각 이벤트에는 설치별 랜덤 ID와 워크스페이스 번호가 담기며, API 키·미디어·파일명·자막 텍스트는 절대 포함되지 않습니다. `PERSO_NO_TELEMETRY`로 옵트아웃할 수 있습니다.</sub>

<sub>**라이선스**: 스킬 코드는 [MIT](../../LICENSE)입니다. API 사용에는 [Perso AI 이용약관](https://perso.ai)과 요금이 적용됩니다.</sub>
