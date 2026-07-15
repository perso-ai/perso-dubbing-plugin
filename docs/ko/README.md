# 🎬 /dubbing — Perso AI 영상 자동 더빙

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

[English](../../README.md) ｜ **한국어** ｜ [Español](../es/README.md) ｜ [Português](../pt/README.md) ｜ [Русский](../ru/README.md) ｜ [Bahasa Indonesia](../id/README.md) ｜ [Deutsch](../de/README.md) ｜ [ไทย](../th/README.md) ｜ [日本語](../ja/README.md) ｜ [繁體中文](../zh-TW/README.md) ｜ [简体中文](../zh-CN/README.md) ｜ [Tiếng Việt](../vi/README.md) ｜ [Français](../fr/README.md)

[Perso AI](https://perso.ai)의 **더빙(AI 더빙)** 기능을 여러분의 에이전트로 가져오는 코딩 에이전트 스킬입니다. 영상을 다른 언어로 **자동 더빙**하며 — 파일 하나든 폴더 전체든, 심지어 용량이 크거나 아주 긴 영상도 자동으로 분할·처리한 뒤 다시 하나로 합쳐줍니다. 더빙된 영상에 **립싱크**를 입히거나 **음성과 배경음을 분리**하는 것도 가능합니다.

내부적으로 Perso Dubbing API를 호출하므로 **Perso Dubbing API 키가 필요합니다.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">API 키 발급받기</a>

모든 호스트가 동일한 **Agent Skills 표준**(`SKILL.md`)을 사용하기 때문에, 어디에 설치하든 똑같이 동작합니다 — 그냥 `/dubbing`을 실행하거나 *"이 영상 더빙해줘"* 라고 말하면 됩니다.

---

## 🖥️ 가장 쉬운 방법 — Claude 데스크톱 앱 (약 3분)

> 📖 **따라 하기 쉬운 화면이 필요하신가요?** **[설치 튜토리얼 →](https://dubbing-plugin.perso.ai/)** 에서 에이전트별 설치 명령을 복사할 수 있습니다.

터미널이 필요 없습니다. <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">Claude 데스크톱 앱</a>(유료 플랜)에서:

1. **Code 탭을 열고**(상단 중앙) 아무 폴더나 고른 뒤 — **Local** 환경을 선택하세요(클라우드 세션에서는 플러그인을 쓸 수 없습니다).
2. **아래 명령을 하나씩** 프롬프트 입력창에 붙여넣고 Enter를 누르세요:

   ```text
   claude marketplace add perso-ai/perso-dubbing-plugin
   ```

   ```text
   claude install perso-dubbing@perso-ai
   ```

   *클릭이 편하다면? 첫 명령 실행 후 프롬프트 입력창 옆 **+** 버튼 → **Plugins** → **Add plugin** → **perso-dubbing** 설치.*
3. **더빙을 요청하세요** — 예: *"이 영상 영어로 더빙해줘 — C:\videos\clip.mp4"* (유튜브 URL이나 폴더 전체도 됩니다). 첫 실행 시 <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">Perso API 키</a>를 넣을 키 파일이 열립니다 — **채팅이 아니라** 그 파일에 키를 붙여넣으세요. `--out`을 지정하지 않으면 결과는 원본 영상 옆에 저장됩니다.

> 💡 스킬 자체는 **Node.js 18+** 에서 동작합니다. PC에 없으면 에이전트가 `node`를 찾을 수 없다고 알려줄 텐데 — *"Node.js 설치해줘"* 라고 답하거나 <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>에서 LTS를 받은 뒤 다시 시도하면 됩니다.

**Claude Code CLI**(터미널)에서는 대신 `/plugin marketplace add perso-ai/perso-dubbing-plugin` 과 `/plugin install perso-dubbing@perso-ai` 를 사용하세요.

---

## 다른 호스트에 설치

어디서나 통하는 지름길: 이 저장소의 URL을 에이전트에게 붙여넣고 *"이거 설치해줘"* 라고 말하세요.

> **🤖 에이전트에게:** 이 저장소 URL만 전달받았다면, 호스트에 맞는 경로를 고르세요:
>
> - **Claude Code (데스크톱 앱 또는 CLI):** 사용자가 "이거 설치해줘"라고 해도 **바로 npx를 실행하지 마세요**. 위 *Claude 데스크톱 앱* 섹션의 명령 두 개를 사용자에게 보여주고, 한 메시지에 하나씩 직접 입력하도록 안내하세요(사용자가 입력하는 슬래시 명령이라 에이전트가 대신 실행할 수 없습니다). 데스크톱 앱 클릭 경로도 함께 안내하세요: 첫 명령 후 **+ 버튼 → Plugins → Add plugin**. 문구를 조정해야 한다면, 셸 환경변수 `CLAUDE_CODE_ENTRYPOINT=cli`는 터미널 세션을 시사합니다(문서화되지 않은 신호 — 불확실하면 두 경로를 모두 제시). 사용자가 이를 보고도 설치를 맡기려 할 때만 npx로 넘어가세요.
> - **Codex · Cursor · Antigravity, 또는 사용자가 설치를 위임한 경우:** 이 한 줄 명령을 실행하세요 — 패키지를 받아, 설치된 모든 호스트를 자동 감지해 각각에 스킬을 설치합니다:
>
> ```bash
> npx perso-dubbing
> ```
>
> 이미 저장소를 클론했다면, 저장소 루트에서 `node scripts/install.mjs`를 실행하세요(네트워크 불필요).

<details>
<summary><b>Codex</b></summary>

Codex는 공용 Agent Skills 폴더에서 스킬을 읽습니다. `npx perso-dubbing --codex`를 실행하거나 수동으로 복사하세요:

```text
~/.agents/skills/dubbing/        # 개인(모든 저장소) — 최신 Codex
~/.codex/skills/dubbing/         # 구버전 Codex (설치 스크립트는 둘 다 씀)
<repo>/.agents/skills/dubbing/   # 이 저장소에만
```

저장소에는 마켓플레이스 기반 설치를 위한 Codex 플러그인 매니페스트(`.codex-plugin/plugin.json`)도 포함돼 있습니다.

</details>

<details>
<summary><b>Cursor</b></summary>

`npx perso-dubbing --cursor`를 실행하거나 아래에 복사하세요:

```text
~/.cursor/skills/dubbing/        # 전역
.cursor/skills/dubbing/          # 이 프로젝트에만
```

저장소에는 Cursor 플러그인 마켓플레이스를 위한 Cursor 플러그인 매니페스트(`.cursor-plugin/plugin.json`)가 포함돼 있습니다.

</details>

<details>
<summary><b>Antigravity</b></summary>

`npx perso-dubbing --antigravity`를 실행하거나 두 위치 중 하나에 복사하세요:

```text
~/.antigravity/skills/dubbing/   # Antigravity 1.x
~/.agents/skills/dubbing/        # Antigravity 2.0+ (공용 Agent Skills 폴더)
```

</details>

<details>
<summary><b>⚡ 한 줄 설치 (모든 호스트)</b></summary>

어떤 호스트를 쓰는지 감지해 전부 설치합니다 — 클론 불필요:

```bash
npx perso-dubbing
```

- 특정 호스트만: `--claude` / `--antigravity` / `--codex` / `--cursor` · 전체: `--all`
- 현재 프로젝트에만 (`./.claude`, `./.agents`, …): `--project`

이미 저장소를 클론했다면? 저장소 루트에서 `node scripts/install.mjs`가 네트워크 없이 똑같이 동작합니다.

</details>

<details>
<summary><b>🔧 수동 설치</b></summary>

스킬 폴더를 호스트의 스킬 디렉터리에 **`dubbing`** 이라는 이름으로 복사하세요. 저장소 루트에서:

```bash
# macOS / Linux
mkdir -p <skills_folder>/dubbing && cp -r skills/dubbing/* <skills_folder>/dubbing/
```

> 💡 Windows (PowerShell): `New-Item -ItemType Directory -Force <skills_folder>\dubbing; Copy-Item .\skills\dubbing\* <skills_folder>\dubbing\ -Recurse`

</details>

설치 후 에이전트에 **`/dubbing`** 이라고 입력하거나 **"이 영상 더빙해줘"** 라고 말하면 실행됩니다.

---

## 예시

가장 쉬운 방법 — 그냥 에이전트에게 말하세요:

> "이 영상 영어로 더빙해줘 — C:\videos\clip.mp4"

저장소 루트에서 CLI를 직접 실행할 수도 있습니다:

```bash
# 영상 하나 (원본 언어 자동 감지 → 영어)
npm run dub -- "clip.mp4" --target en --out result.mp4

# 여러 언어를 한 번에 (한 번만 업로드/분할하고 언어별 재사용)
npm run dub -- "clip.mp4" --target en,ja,zh

# 여러 입력을 한 번에 (URL·파일·폴더를 섞어도 됨)
npm run dub -- "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en

# 더빙 + 립싱크 (입 모양을 더빙 음성에 맞춤; 추가 크레딧)
npm run dub -- "clip.mp4" --target en --lipsync

# 음성 / 배경음 트랙 분리 (더빙 없음)
npm run dub -- "clip.mp4" --separate
```

*(동일한 직접 호출: `node skills/dubbing/scripts/dubbing.mjs …` — 또는 설치된 스킬 폴더 안에서 `node scripts/dubbing.mjs …`)*

---

## 문제 해결

질문이 먼저라면 **[FAQ](FAQ.md)** 를 참고하세요.

| 증상 | 해결 |
|---|---|
| Claude 데스크톱 앱이 Git을 요구함 (Windows) | Code 탭은 최초 사용 시 <a href="https://git-scm.com/downloads/win" target="_blank" rel="noopener noreferrer">Git for Windows</a>가 필요합니다. 설치 후 앱을 재시작하세요. |
| `claude` 명령이나 Plugins 메뉴가 반응 없음 | **클라우드 세션**에 있는 것입니다 — 플러그인은 **Local**(및 SSH) 세션에서만 동작합니다. 환경을 Local로 바꾸고 다시 시도하세요. |
| `node`를 찾을 수 없음 / 설치·실행 실패 | 스킬은 **Node.js 18+** 에서 동작합니다 — `node -v`로 확인하세요. 없으면 <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>에서 LTS를 설치하거나, 세션에서 Claude에게 설치를 요청한 뒤 앱을 재시작하세요. |
| 아직 API 키가 없음 | 아무 더빙 명령이나 실행하면 키 파일이 자동으로 열립니다; 키를 붙여넣고 저장하세요(암호화되고 파일은 삭제됩니다). 수동 확인: `npm run key:check`. **키를 채팅에 붙여넣지 마세요.** → <a href="https://developers.perso.ai/api-keys" target="_blank" rel="noopener noreferrer">API 키 발급</a> |
| ffmpeg 관련 오류 | ffmpeg는 보통 자동으로 설치됩니다. 실패하면 `npm run doctor`를 실행하세요. |
| 중간에 멈춤 (크레딧 소진, 크래시, 프로세스 종료) | 실행 내내 진행 상태가 `*.dubresume.json` 상태 파일에 저장됩니다. 안내에 표시된 **`--resume "<state-file>"`** 명령을 실행하면 남은 부분만 이어서 처리합니다(완료된 부분은 자동으로 건너뜁니다). |

---

## 저장소 구조

```text
.claude-plugin/    Claude Code 플러그인 + 마켓플레이스 매니페스트
.codex-plugin/     Codex 플러그인 매니페스트
.cursor-plugin/    Cursor 플러그인 매니페스트
docs/              GitHub Pages 랜딩 + 번역된 README · FAQ (12개 언어)
skills/dubbing/    스킬 본체 (SKILL.md · lib/ · scripts/) — 자체 완결형
scripts/           저장소 레벨 설치 스크립트 (install.mjs)
```

## 개인정보 & 텔레메트리

`/dubbing`은 스킬 개선을 위해 **익명** 사용 이벤트를 전송합니다 — 예: 어떤 동작을 실행했는지(더빙 / 립싱크 / 분리), 성공 여부, 언어 쌍, 앱 버전, OS. 설치별 랜덤 ID로만 태깅되며, API 키·파일명이나 미디어 내용·계정/이메일·워크스페이스 ID는 절대 포함하지 않습니다.

## 라이선스

이 스킬의 코드는 **[MIT 라이선스](../../LICENSE)** 로 배포됩니다. 실제 더빙은 Perso Dubbing API를 통해 수행되므로, API 사용 자체는 [Perso AI 이용약관](https://perso.ai) 및 요금 정책의 적용을 받습니다.
