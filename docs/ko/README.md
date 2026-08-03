# 🎬 /dubbing — Perso AI 영상 자동 더빙

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ **한국어** ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

[Perso AI](https://perso.ai)의 AI 더빙을 여러분의 에이전트로 가져오는 코딩 에이전트 스킬입니다. 한 번 설치한 뒤 *"이 영상 영어로 더빙해줘"* 라고 말하기만 하면 됩니다.

- ![무료](https://img.shields.io/badge/%E2%9C%93%20%EB%AC%B4%EB%A3%8C-2ea44f) **자막 입히기** — 기성/커스텀 스타일 자막을 영상에 인코딩. **이번 릴리스의 핵심.**
- ![무료](https://img.shields.io/badge/%E2%9C%93%20%EB%AC%B4%EB%A3%8C-2ea44f) **자막 번역** — 이미 가진 SRT를 원하는 언어로
- ![무료](https://img.shields.io/badge/%E2%9C%93%20%EB%AC%B4%EB%A3%8C-2ea44f) **숏폼 클립** — 긴 영상을 하이라이트 숏폼으로, 16:9 → 9:16 리프레임
- **더빙** — 파일 하나, 폴더 전체, URL 모두 가능
- **립싱크** — 더빙된 음성에 맞춰 입 모양까지 자연스럽게
- **음원 분리** — 음성과 배경음을 각각의 트랙으로
- **음성 인식 자막** — 음성에서 SRT 추출 (또는 내 SRT 사용 → 무료)
- 용량이 크거나 아주 긴 영상은 자동으로 분할·처리 후 다시 합쳐집니다

> **스킬 자체는 무료·오픈소스(MIT).** 내 컴퓨터에서 로컬로 도는 작업은 **계정도 크레딧도 필요 없습니다** — 자막 인코딩, 내가 가진 SRT 번역, 숏폼 클립. Perso 서버에서 도는 AI 작업(더빙·립싱크·음원 분리·음성 인식)만 Perso Dubbing API 크레딧을 쓰며 **처리한 분량만큼만** 과금됩니다.

**Node.js 18+** 에서 동작합니다. 무료 작업은 키가 필요 없고, 서버 AI 작업만 **Perso Dubbing API 키**가 필요합니다. Agent Skills 표준(`SKILL.md`) 기반이라 Claude·Codex·Antigravity 어디서나 동일하게 동작합니다.

![자막 스타일 프리셋](https://raw.githubusercontent.com/perso-ai/perso-dubbing-plugin/main/docs/media/subtitle-presets.gif)

---

## 설치

> 📖 **[설치 튜토리얼 →](https://dubbing-plugin.perso.ai/)** — 에이전트를 고르고 명령을 복사하세요.

### Claude 데스크톱 앱 — 가장 쉬움, 터미널 불필요 (약 3분)

<a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude 데스크톱 앱</a>(유료 플랜)에서:

1. **Code 탭**(상단 중앙)을 열고 아무 폴더나 고른 뒤 **Local** 환경을 선택하세요 — 클라우드 세션에서는 플러그인을 쓸 수 없습니다.
2. 아래 명령을 프롬프트 입력창에 붙여넣고 Enter를 누르세요:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin && claude install perso-dubbing@perso-ai
   ```

3. 더빙을 요청하세요 — *"이 영상 영어로 더빙해줘 — C:\videos\clip.mp4"*. 유튜브 URL이나 폴더도 됩니다. `--out`을 지정하지 않으면 결과는 원본 영상 옆에 저장됩니다.

**Claude Code CLI**에서는 `/plugin marketplace add perso-ai/perso-dubbing-plugin` 과 `/plugin install perso-dubbing@perso-ai` 를 사용하세요.

### 그 외 모든 호스트

```bash
npx perso-dubbing
```

설치된 호스트를 감지해 두 스킬을 각각에 설치하고, 설치된 위치를 출력합니다. 특정 호스트만 설치하려면 `--claude` / `--codex` / `--antigravity`, 전체는 `--all`, 현재 프로젝트에만 설치하려면 `--project`를 붙이세요. 이미 저장소를 클론했다면 루트에서 `node scripts/install.mjs`가 네트워크 없이 똑같이 동작합니다.

<details>
<summary><b>🤖 에이전트에게</b> — 이 저장소 URL만 전달받았다면</summary>

- **Claude Code(데스크톱 또는 CLI)** — 아래 설치 명령 한 줄을 직접 실행하세요(비대화형·멱등이라 재실행해도 안전합니다):

  ```bash
  claude plugin marketplace add perso-ai/perso-dubbing-plugin && claude plugin install perso-dubbing@perso-ai
  ```

  둘 다 성공하면 새 세션을 시작하라고(또는 Claude Code를 재시작하라고) 안내하세요 — `/dubbing`과 `/srt`는 다음 세션부터 로드됩니다. 셸에서 `claude` CLI를 쓸 수 없는 경우에만, 위 명령을 사용자가 직접 입력하도록 보여주는 방식으로 폴백하세요.
- **Codex · Antigravity, 또는 사용자가 설치를 위임한 경우** — `npx perso-dubbing`을 실행하세요(저장소가 이미 클론돼 있다면 `node scripts/install.mjs`).
- **ChatGPT(웹/앱 — 사용자 컴퓨터에서 터미널을 쓸 수 없는 경우)** — https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/chatgpt-setup.md 를 읽고 따라가세요: 먼저 사용자 컴퓨터에 **Codex**를 설치하게 하고, 설치는 거기서 이어집니다. (이미 터미널이 있는 Codex 안이라면 위 불릿을 따르세요.)
- **Gemini(웹/앱 — 사용자 컴퓨터에서 터미널을 쓸 수 없는 경우)** — https://github.com/perso-ai/perso-dubbing-plugin/blob/main/docs/gemini-setup.md 를 읽고 따라가세요: 먼저 **Antigravity**를 설치하게 하고, 설치는 거기서 이어집니다. (이미 Antigravity 안이라면 위 불릿을 따르세요.)

</details>

### 첫 실행 — API 키

키는 Perso API를 쓰는 작업(더빙·립싱크·음원 분리·SRT 추출)에서만 필요합니다. 오프라인 작업(로컬 영상에 자막 입히기, 직접 준 SRT 번역)은 키를 요구하지 않습니다. 키가 필요한 순간 브라우저 페이지가 열립니다. 로그인하고 한 번 클릭하면 키가 발급되어 이 PC에 암호화 저장됩니다. 복사할 것이 없습니다. 브라우저를 열 수 없는 환경이라면 대신 키 파일이 열립니다 — 거기에 키를 붙여넣고 저장하면 암호화된 뒤 파일은 삭제됩니다.

<a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">API 키 발급받기</a> · 확인은 `npm run key:check`

---

## 사용법

원하는 것을 에이전트에게 말하면 됩니다:

> "이 영상 영어로 더빙해줘 — C:\videos\clip.mp4"
>
> "이 폴더 영상 전부 일본어랑 스페인어로 더빙해줘"
>
> "이 유튜브 링크 영어로 더빙하고 립싱크까지 해줘"
>
> "이 영상으로 영어 SRT 만들어줘"
>
> "이 영상에 자막 입혀줘 — SRT 여기 있어"
>
> "이 영상 2:00~3:00 구간 숏츠로 잘라줘"

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

`/dubbing`, `/srt`, `/clip`은 스킬 개선을 위해 익명 사용 이벤트를 전송합니다 — 실행한 동작과 그 결과, 미디어 길이, 스타일 선택, 대략적 로캘, 앱 버전/OS, 그리고 Perso API 키 사용(및 등록) 여부. 각 이벤트에는 설치별 랜덤 ID와 워크스페이스 번호가 담기며, API 키·미디어·파일명·자막 텍스트는 절대 포함되지 않습니다. `PERSO_NO_TELEMETRY`로 옵트아웃할 수 있습니다.

---

## 저장소 구조

```text
.claude-plugin/    Claude Code 플러그인 + 마켓플레이스 매니페스트
.codex-plugin/     Codex 플러그인 매니페스트
docs/              GitHub Pages 랜딩 + 번역된 README · FAQ (12개 언어)
skills/dubbing/    더빙 스킬 본체 (SKILL.md · lib/ · scripts/) — 자체 완결형
skills/srt/        SRT 자막 스킬 (SKILL.md · scripts/) — dubbing 스킬의 lib/를 사용
skills/clip/       숏폼 클립 스킬 (SKILL.md · lib/ · scripts/) — dubbing 스킬의 lib/를 사용
scripts/           저장소 레벨 설치 스크립트 (install.mjs)
```

## 라이선스

스킬 코드는 **[MIT 라이선스](../../LICENSE)** 로 배포됩니다. 실제 더빙은 Perso Dubbing API를 통해 수행되므로, API 사용 자체는 [Perso AI 이용약관](https://perso.ai) 및 요금 정책의 적용을 받습니다.
