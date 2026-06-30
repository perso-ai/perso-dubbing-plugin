---
name: dubbing
description: 영상을 다른 언어로 자동 더빙(음성 번역)하고 립싱크까지 입히는 스킬 (Perso AI Dubbing).
---

# /dubbing

영상을 Perso AI Dubbing API로 자동 더빙하는 스킬.

## 핵심 규칙 (반드시 준수)

- **키 원문은 워커만 본다.** 키를 `Read`로 열거나, echo하거나, 명령행 인자로 넘기지 않는다. 실제 키는 `lib/`·`scripts/` 워커가 `XP-API-KEY` 헤더에만 사용한다.
- 언어 미지정 시 출발어 `auto`·도착어 `en`.
- **여러 언어는 한 번의 명령으로** — `--target en,zh,ja` 처럼 쉼표로 묶는다. 언어마다 따로 실행하면 같은 원본을 **언어 수만큼 중복 분할·업로드**한다. 한 명령이면 분할·업로드는 (영상당) 1번, 그 mediaSeq를 언어별 번역에 재사용한다.
- **진행 알림은 사용자에게 전달.** 더빙은 시간이 걸리므로 `dubbing.mjs`는 **백그라운드로 실행**한다. 다만 워커가 stdout에 내보내는 **`[진행]` 줄**(분할 시작 / 분할 완료 / 번역 시작 / 병합 시작)은 백그라운드 로그에만 묻어두지 말고 **그대로(또는 요약해) 사용자 채팅에 노출**한다. (`  `들여쓰기된 stderr 상세 로그는 전달 불필요.)
- **미지원 형식은 자동 건너뜀.** 업로드가 지원하지 않는 형식이면 그 파일을 건너뛰고("지원하지 않는 형식이라 건너뜁니다…") 나머지 파일은 계속 처리한다. 이 건너뜀 안내도 사용자에게 전달한다.

## 사용 전 1회 준비

1. **API 키 등록** — `node scripts/resolve_key.mjs --check`. 없으면 아래 "키 게이트"의 자동 등록 흐름(`--watch`)을 따른다(키를 채팅에 붙여넣지 않는다). 키 발급: https://developers.perso.ai/
2. **ffmpeg/ffprobe** — 미리 깔 필요 없음. **영상이 플랜 길이 한도를 넘어 자르기가 필요할 때만** 자동 설치된다(권한 필요 시에만 승인). 수동 확인: `node scripts/check_deps.mjs`.

## 실행 흐름

1. **키 게이트** — `node scripts/resolve_key.mjs --check`. 키 없으면(exit 2) **자동 등록**: `node scripts/resolve_key.mjs --watch`를 백그라운드로 실행 → 출력된 키 파일 경로를 사용자에게 **클릭 가능하게**(경로 그대로) 보여주고 "클릭해 열어 키만 붙여넣고 저장"을 안내. 사용자가 저장하면 자동 감지→실시간 암호화 저장→키 파일 삭제로 등록이 끝나고(`✅`) 워커가 종료된다. 완료 확인 후 더빙 진행(키를 채팅에 붙여넣지 않는다).
2. **입력 수집** — 유저에게 영상의 로컬 경로 또는 URL을 받는다(없으면 재질문).
3. **입력 정규화** — `node scripts/prepare_input.mjs "<입력>"` → JSON.
   - `source: local|url` → `localPath`로 다음 단계(업로드·분할 결정).
   - `source: external`(YouTube·TikTok·Drive·Vimeo) → API external 흐름으로 업로드.

4. **업로드 우선 분할 결정** — `node scripts/probe_split.mjs '<JSON|경로>'`. 통째 업로드를 먼저 시도해서 한도 내면 단일 청크(이미 업로드됨, ffmpeg/ffprobe 불필요), 초과면 업로드가 `F4008`(maxLengthMs)을 반환 → **그때만** ffmpeg/ffprobe 설치 → segment 무손실 분할(`-c copy`, SEG=한도−GOP−여유; 무손실 불가 시에만 재인코딩). `notice` 있으면 분할 고지. (`source: external`은 서버가 처리)

5. **스케줄러(전역 풀)** — `lib/scheduler.mjs`가 **모든 입력 × 조각 × 언어**를 하나의 풀로 모아 한 큐를 채운다. 시작 시 `getQueueStatus`로 **빈 슬롯만큼만 제출**하고, 슬롯이 비면 추가 제출. 빈 슬롯이 없으면(외부/선행 작업이 큐 점유) **5분 간격으로 재확인**하며 우리 작업으로 Concurrent+Queue가 찰 때까지 채운다. 같은 조각의 엔진오류는 형제 언어를 cancel, 음성 없는 구간은 원본 통과(분할 조각만), 사용량 부족 시 중단(완료분 보존), 무한 대기 가드.
6. **병합·안내** — 입력별·언어별로 묶어 `lib/merge.mjs`로 연속 성공 구간 concat(분할된 입력만), HARD_FAIL은 그룹 경계 + 실패 리포트. 결과물은 (입력 × 언어)당 1개 파일.

**한 번에 실행 (입력은 여러 개 가능 — URL·파일·폴더 혼합):**
- 단일: `node scripts/dubbing.mjs "<파일|URL>" [--source auto] [--target en] [--space N] [--out result.mp4]`
- 다국어: `node scripts/dubbing.mjs "<파일|URL>" --target en,zh,ja` — 분할·업로드 1번 후 mediaSeq를 언어마다 재사용, 언어별 파일로 저장.
- **여러 입력**: `node scripts/dubbing.mjs "<URL1>" "<URL2>" "<파일>" --target en,ja` — 각 입력을 1번 업로드·분할 후, **모든 입력×조각×언어를 한 큐로** 동시 처리. 결과는 입력별·언어별 파일로 각 원본 옆에 저장(`--out <폴더>` 주면 그 폴더에 모음).
- 폴더(배치): `node scripts/dubbing.mjs "<폴더>" [--target en,zh] [--recursive] [--out 출력폴더]` — 폴더 안 미디어를 모두 펼쳐 위와 동일한 전역 풀로 처리.
- 출력명: 분할 없는 단일은 **Perso 다운로드 파일명 그대로**(언어·시각 포함), 분할 병합은 `<원본명>.dubbed.<언어>.<ext>`, 이름 충돌 시 `_2`,`_3`…

**사용량(크레딧) 부족으로 중단되면**, 완료분을 전달하고 **워커가 출력한 업그레이드/추가 크레딧(Get credits) URL과 이어하기 안내를 생략·요약 없이 그대로 사용자에게 노출**한다. (이 URL 줄은 `[진행]`이 아니라 일반 stdout이라 요약 중 누락되기 쉬움 — 충전·업그레이드 경로 없이 "크레딧 충전 후 재실행"만 안내하지 말 것. 반드시 URL 포함.) 이어하기는 `--resume <statefile>` (단일·다중입력·배치 공통, 완료분 자동 건너뜀).

## 설정 (env)

- `PERSO_API_BASE` — API Base URL (기본 `https://api.perso.ai`).
- `PERSO_MEDIA_BASE` — 결과 파일 미디어 호스트 (기본 `https://portal-media.perso.ai`). 응답이 상대경로일 때 prepend.
- `PERSO_SPACE_SEQ` — 사용할 space 고정 (미지정 시 자동: video_translator 중 free 아닌 것·작은 spaceSeq 우선).
- `XP_API_KEY` — 키 직접 지정(최우선). 없으면 `~/.perso/credentials`에서 해석(Windows는 DPAPI 암호화).
