
// 타이머 관련 상수
export const TIMER_CONSTANTS = {
  UPDATE_INTERVAL: 10, // 10ms 간격으로 업데이트
  MAX_MEASUREMENT_TIME: 3600000, // 최대 측정 시간: 1시간 (ms)
  MIN_MEASUREMENT_TIME: 100, // 최소 측정 시간: 0.1초 (ms)
  AUTO_SAVE_INTERVAL: 30000 // 30초마다 자동 저장
} as const;

// 시간 포맷팅 상수
export const TIME_FORMAT = {
  PRECISION: 3, // 소수점 자리수
  DISPLAY_FORMAT: 'mm:ss.SSS'
} as const;
