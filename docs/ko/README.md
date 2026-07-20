# 🎬 /dubbing — Perso AI 영상 자동 더빙

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ **한국어** ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

[Perso AI](https://perso.ai)의 AI 더빙을 여러분의 에이전트로 가져오는 코딩 에이전트 스킬입니다. 한 번 설치한 뒤 *"이 영상 영어로 더빙해줘"* 라고 말하기만 하면 됩니다.

- **더빙** — 파일 하나, 폴더 전체, URL 모두 가능
- **립싱크** — 더빙된 음성에 맞춰 입 모양까지 자연스럽게
- **음원 분리** — 음성과 배경음을 각각의 트랙으로
- **자막**(`/srt`) — 음성 인식으로 SRT를 추출하고, 에이전트가 원하는 언어로 번역
- 용량이 크거나 아주 긴 영상은 자동으로 분할·처리 후 다시 합쳐집니다

**Node.js 18+** 에서 동작하며 **Perso Dubbing API 키**가 필요합니다. Agent Skills 표준(`SKILL.md`) 기반이라 Claude·Codex·Cursor·Antigravity 어디서나 동일하게 동작합니다.

![Perso Dubbing demo](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/dubbing_plugin_demo.gif)

---

## 설치

> 📖 **[설치 튜토리얼 →](https://perso-ai.github.io/perso-dubbing-plugin/)** — 에이전트를 고르고 명령을 복사하세요.

### Claude 데스크톱 앱 — 가장 쉬움, 터미널 불필요 (약 3분)

<a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude 데스크톱 앱</a>(유료 플랜)에서:

1. **Code 탭**(상단 중앙)을 열고 아무 폴더나 고른 뒤 **Local** 환경을 선택하세요 — 클라우드 세션에서는 플러그인을 쓸 수 없습니다.
2. 아래 명령을 하나씩 프롬프트 입력창에 붙여넣고 Enter를 누르세요:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *클릭이 편하다면? 첫 명령 실행 후 **+** 버튼 → **Plugins** → **Add plugin** → **perso-dubbing**.*
3. 더빙을 요청하세요 — *"이 영상 영어로 더빙해줘 — C:\videos\clip.mp4"*. 유튜브 URL이나 폴더도 됩니다. `--out`을 지정하지 않으면 결과는 원본 영상 옆에 저장됩니다.

**Claude Code CLI**에서는 `/plugin marketplace add perso-ai/perso-dubbing-plugin` 과 `/plugin install perso-dubbing@perso-ai` 를 사용하세요.

### 그 외 모든 호스트

```bash
npx perso-dubbing
```

설치된 호스트를 감지해 두 스킬을 각각에 설치하고, 설치된 위치를 출력합니다. 특정 호스트만 설치하려면 `--claude` / `--codex` / `--cursor` / `--antigravity`, 전체는 `--all`, 현재 프로젝트에만 설치하려면 `--project`를 붙이세요. 이미 저장소를 클론했다면 루트에서 `node scripts/install.mjs`가 네트워크 없이 똑같이 동작합니다.

> **🤖 에이전트에게:** 이 저장소 URL만 전달받았다면:
>
> - **Claude Code(데스크톱 또는 CLI)** — 사용자가 "이거 설치해줘"라고 해도 **npx를 실행하지 마세요**. 위 `claude …` 명령 두 개를 보여주고 사용자가 직접 하나씩 입력하도록 안내하세요(사용자가 입력하는 슬래시 명령이라 대신 실행할 수 없습니다). 클릭 경로도 함께: **+** 버튼 → **Plugins** → **Add plugin**. 이를 보고도 설치를 맡기려 할 때만 npx로 넘어가세요.
> - **Codex · Cursor · Antigravity, 또는 사용자가 설치를 위임한 경우** — `npx perso-dubbing`을 실행하세요(저장소가 이미 클론돼 있다면 `node scripts/install.mjs`).

### 첫 실행 — API 키

브라우저 페이지가 열립니다. 로그인하고 한 번 클릭하면 키가 발급되어 이 PC에 암호화 저장됩니다. 복사할 것이 없습니다. 브라우저를 열 수 없는 환경이라면 대신 키 파일이 열립니다 — 거기에 키를 붙여넣고 저장하면 암호화된 뒤 파일은 삭제됩니다.

**API 키를 채팅에 붙여넣지 마세요.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">API 키 발급받기</a> · 확인은 `npm run key:check`

---

## 사용법

원하는 것을 에이전트에게 말하면 됩니다:

> "이 영상 영어로 더빙해줘 — C:\videos\clip.mp4"
>
> "이 폴더 영상 전부 일본어랑 스페인어로 더빙해줘"
>
> "이 유튜브 링크 영어로 더빙하고 립싱크까지 해줘"
>
> "이 클립에서 목소리랑 배경음 분리해줘"
>
> "이 영상으로 영어 SRT 만들어줘"

또는 **`/dubbing`** / **`/srt`** 를 입력해 시작하세요. CLI 옵션 전체가 필요하면 에이전트에게 사용법을 묻거나 `npm run dub -- --help`를 실행하세요.

---

## 문제 해결

더 궁금한 점은 **[FAQ](FAQ.md)** 를 참고하세요.

| 증상 | 해결 |
|---|---|
| `node`를 찾을 수 없음 | <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>에서 LTS를 설치하거나 에이전트에게 *"Node.js 설치해줘"* 라고 요청한 뒤 다시 시도하세요. |
| Claude 데스크톱 앱이 Git을 요구함 (Windows) | Code 탭은 최초 사용 시 <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a>가 필요합니다. 설치 후 앱을 재시작하세요. |
| `claude` 명령이나 Plugins 메뉴가 반응 없음 | **클라우드 세션**입니다 — 플러그인은 **Local**(및 SSH) 세션에서만 동작합니다. |
| 키가 없거나 거부됨 | 다시 등록하세요: `node skills/dubbing/scripts/connect.mjs`. 저장된 키 확인은 `npm run key:check`. |
| ffmpeg 관련 오류 | ffmpeg는 보통 자동 설치됩니다. 실패하면 `npm run doctor`를 실행하세요. |
| 중간에 멈춤 (크레딧 소진, 크래시, 프로세스 종료) | 진행 상태는 계속 저장됩니다. 안내에 표시된 **`--resume "<state-file>"`** 명령을 실행하면 남은 부분만 이어서 처리합니다 — 완료된 부분은 건너뛰며 재과금되지 않습니다. |

---

## 개인정보 & 텔레메트리

`/dubbing`과 `/srt`는 스킬 개선을 위해 사용 이벤트를 전송합니다 — 예: 실행한 동작, 성공 여부, 미디어 길이, 앱 버전, OS. 각 이벤트에는 설치별 랜덤 ID와 워크스페이스 번호가 함께 담깁니다. API 키와 미디어 내용은 포함되지 않습니다. `PERSO_NO_TELEMETRY` 환경 변수로 언제든 옵트아웃할 수 있습니다.

---

## 저장소 구조

```text
.claude-plugin/    Claude Code 플러그인 + 마켓플레이스 매니페스트
.codex-plugin/     Codex 플러그인 매니페스트
.cursor-plugin/    Cursor 플러그인 매니페스트
docs/              GitHub Pages 랜딩 + 번역된 README · FAQ (12개 언어)
skills/dubbing/    더빙 스킬 본체 (SKILL.md · lib/ · scripts/) — 자체 완결형
skills/srt/        SRT 자막 스킬 (SKILL.md · scripts/) — dubbing 스킬의 lib/를 사용
scripts/           저장소 레벨 설치 스크립트 (install.mjs)
```

## 라이선스

스킬 코드는 **[MIT 라이선스](../../LICENSE)** 로 배포됩니다. 실제 더빙은 Perso Dubbing API를 통해 수행되므로, API 사용 자체는 [Perso AI 이용약관](https://perso.ai) 및 요금 정책의 적용을 받습니다.
