// 플러그인 자체 상수. 플랜 정보(MaxLen·C/Q·크레딧)는 여기 두지 않고 API 응답에서 발견한다.
import { homedir } from 'node:os';
import { join } from 'node:path';

// API
export const API_BASE = (process.env.PERSO_API_BASE || 'https://api.perso.ai').replace(/\/+$/, '');
export const AUTH_HEADER = 'XP-API-KEY';

// 폴링 / 백오프
export const POLL_INTERVAL_MS = 5_000; // 상태 폴링 간격 (>=5s 권장)
export const BACKOFF_BASE_MS = 5_000; // VT5034 지수 백오프 시작값
export const BACKOFF_MAX_MS = 60_000; // 백오프 상한
export const QUEUE_WAIT_MS = Number(process.env.PERSO_QUEUE_WAIT_MS) || 5 * 60_000; // 빈 슬롯이 없을 때(외부/선행 작업이 큐 점유) 재확인 간격 — 기본 5분

// 무한루프 가드 (플랜 무관 · 플러그인 안전장치)
export const MAX_IDLE_MS = 30 * 60_000; // T: 무진전(제출·완료·진척%↑ 없음) 한도(30분). 절대 경과시간이 아님.
export const MAX_RETRY = 2; // 조각 기타 실패 재시도 횟수

// 미디어 확장자 — 폴더 입력 필터 + 업로드 시 video/audio 엔드포인트 선택에 공용.
// (단일 파일 입력은 확장자 무관하게 받고 업로드 단계가 형식을 최종 판정한다.)
export const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi|m4v|wmv|flv|mpg|mpeg|ts|m2ts|3gp|ogv)$/i;
export const AUDIO_EXT = /\.(mp3|wav|m4a|aac|flac|ogg|oga|opus|wma|aif|aiff|alac)$/i;

// 자격증명 파일
export const CRED_DIR = join(homedir(), '.perso');
export const CRED_FILE = join(CRED_DIR, 'credentials');
