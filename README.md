# 🎬 /dubbing — Perso AI 영상 자동 더빙

[![Powered by Perso AI](https://img.shields.io/badge/Powered%20by-Perso%20AI-5A4FF3)](https://perso.ai)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-1f6feb)
![Platforms](https://img.shields.io/badge/platforms-Claude%20Code%20%C2%B7%20Antigravity%20%C2%B7%20Codex%20%C2%B7%20Cursor-555)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[Perso AI](https://perso.ai)의 **Dubbing(AI 더빙)** 기술을 코딩 에이전트의 스킬로 가져온 도구입니다. 영상을 다른 언어로 **자동 더빙**합니다 — 파일 하나든 폴더 통째든, 길이·용량이 커도 알아서 나눠 처리하고 다시 합쳐줍니다.

내부적으로 Perso Dubbing API를 호출하므로 **Perso Dubbing API 키가 필요합니다.** → [키 발급받기](https://developers.perso.ai/)

모든 호스트에서 동일한 **Agent Skills 표준**(`SKILL.md`)을 사용하므로, 어디에 설치하든 `/dubbing` 또는 *"이 영상 더빙해줘"* 로 똑같이 동작합니다.

---

## 지원 플랫폼

- [**Claude Code**](#claude-code)
- [**Antigravity**](#antigravity)
- [**Codex App**](#codex-app)
- [**Codex CLI**](#codex-cli)
- [**Cursor**](#cursor)

> 여러 호스트를 함께 쓴다면, 한 번에 설치 방법을 따라하세요.

---

## 설치

> **🤖 에이전트에게:** 지금 이 README를 저장소 안에서 읽고 있다면, 설치는 한 줄입니다. 저장소 루트에서 아래를 실행하세요 — 레포 주소도 네트워크도 필요 없습니다.
>
> ```bash
> node scripts/install.mjs
> ```

### ⚡ 한 줄 설치 (권장 · 저장소가 이미 있을 때)

저장소 루트에서:

```bash
node scripts/install.mjs        # = npm run install:skill
```

감지된 호스트(`~/.claude` · `~/.antigravity` · `~/.codex` · `~/.cursor`)의 skills 폴더에 `dubbing` 스킬을 모두 복사합니다.

- 특정 호스트만: `--claude` / `--antigravity` / `--codex` / `--cursor`
- 전부: `--all` · 현재 프로젝트(`./.claude` 등)에만: `--project`

### 📦 저장소가 아직 없을 때 (npx)

```bash
npx github:<OWNER>/perso-dubbing
```

위와 동일하게 호스트를 자동 감지해 설치합니다. *`<OWNER>`는 실제 저장소 주소로 바꾸세요. (npm 배포 시 `npx perso-dubbing`)*

### 🔧 수동 설치

자동 설치가 안 되면, 호스트의 skills 폴더에 **`dubbing`** 이름으로 직접 넣어도 됩니다. 저장소 루트에서:

```bash
# macOS / Linux — <스킬_폴더>는 아래 플랫폼별 위치 참고
mkdir -p <스킬_폴더>/dubbing && cp -r ./* <스킬_폴더>/dubbing/
```

> 💡 Windows(PowerShell): `New-Item -ItemType Directory -Force <스킬_폴더>\dubbing; Copy-Item .\* <스킬_폴더>\dubbing\ -Recurse`

플랫폼별 `<스킬_폴더>` 위치는 아래를 참고하세요.

### Claude Code

자동 설치 대상입니다. 특정 호스트로만 깔려면 `--claude`.

수동 설치 위치:

```text
~/.claude/skills/dubbing/            # 전역
.claude/skills/dubbing/              # 특정 프로젝트에만
```

### Antigravity

자동 설치 대상입니다. 특정 호스트로만 깔려면 `--antigravity`.

수동 설치 위치:

```text
~/.antigravity/skills/dubbing/
```

### Codex App

Codex App은 Codex CLI와 **같은 설정 폴더(`~/.codex`)** 를 사용합니다. 위 설치 명령에 `--codex` 를 붙이거나(`node scripts/install.mjs --codex`) 아래 위치에 직접 넣으세요.

```text
~/.codex/skills/dubbing/
```

### Codex CLI

자동 설치 대상입니다. 특정 호스트로만 깔려면 `--codex`.

수동 설치 위치:

```text
~/.codex/skills/dubbing/
```

### Cursor

자동 설치 대상입니다. 특정 호스트로만 깔려면 `--cursor`.

수동 설치 위치:

```text
~/.cursor/skills/dubbing/
```

설치 후 에이전트에서 **`/dubbing`** 입력 또는 그냥 **"이 영상 더빙해줘"** 라고 하면 자동 실행됩니다.

---

## 사용 예시

가장 쉬운 방법 — 에이전트에게 그냥 말하세요:

> "이 영상 영어로 더빙해줘 — C:\videos\clip.mp4"

CLI로 직접 실행할 수도 있습니다:

```bash
# 영상 1개 (자동 감지 → 영어)
node scripts/dubbing.mjs "clip.mp4" --target en --out result.mp4

# 여러 언어 한 번에 (한 번 업로드·분할 후 언어마다 재사용)
node scripts/dubbing.mjs "clip.mp4" --target en,ja,zh

# 여러 입력 한 번에 (URL·파일·폴더 혼합 가능)
node scripts/dubbing.mjs "https://youtu.be/..." "clip2.mp4" "C:\videos" --target en
```

---

## 문제해결

| 증상 | 해결 |
|---|---|
| 설치/실행이 안 됨 | **Node.js 18+** 가 필요합니다. `node -v` 로 확인하세요. |
| `API 키가 없습니다` 류 안내 | Perso Dubbing API 키가 필요합니다. `node scripts/resolve_key.mjs --check` 로 등록 상태를 확인하고 안내에 따라 등록하세요. **키는 채팅창에 붙여넣지 마세요.** [키 발급받기](https://developers.perso.ai/) |
| ffmpeg 관련 오류 | ffmpeg는 보통 자동으로 설치됩니다. 실패하면 `npm run doctor` (= `node scripts/check_deps.mjs`) 로 점검하세요. |
| 처리가 중간에 멈춤 (크레딧 부족) | 완료된 만큼 먼저 저장하고 멈춥니다. 크레딧 충전 후, 안내에 표시된 **`--resume "<상태파일>"`** 명령을 실행하면 남은 구간만 이어서 처리합니다(완료분은 자동 건너뜀). |

---

## 라이선스

이 스킬 코드는 **[MIT License](LICENSE)** 로 배포됩니다. 다만 실제 더빙 처리는 Perso Dubbing API를 통해 이뤄지므로, API 사용 자체는 [Perso AI 이용약관](https://perso.ai)과 요금제를 따릅니다.
