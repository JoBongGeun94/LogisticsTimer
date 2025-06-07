// src/utils/constants.ts (최종)
export const THEME_COLORS = {
  light: {
    bg: 'bg-gray-50',
    card: 'bg-white',
    text: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-500',
    border: 'border-gray-200',
    input: 'bg-white border-gray-300 text-gray-900',
    surfaceHover: 'hover:bg-gray-100',
  },
  dark: {
    bg: 'bg-gray-900',
    card: 'bg-gray-800',
    text: 'text-white',
    textSecondary: 'text-gray-200',
    textMuted: 'text-gray-400',
    border: 'border-gray-700',
    input: 'bg-gray-700 border-gray-600 text-white',
    surfaceHover: 'hover:bg-gray-700',
  },
} as const;

export const STORAGE_KEYS = {
  SESSIONS: 'logistics_timer_sessions',
  CURRENT_SESSION: 'logistics_timer_current_session',
  THEME: 'logistics_timer_theme',
  USER_PREFERENCES: 'logistics_timer_preferences',
} as const;

export const APP_CONFIG = {
  TIMER_INTERVAL: 10,
  TOAST_DURATION: 3000,
  AUTO_SAVE_INTERVAL: 5000,
  MAX_SESSIONS: 50,
  MAX_LAP_TIMES_PER_SESSION: 1000,
  GAGE_RR_THRESHOLD: 0.3,
  MIN_MEASUREMENTS_FOR_ANALYSIS: 10,
} as const;

export const VALIDATION_RULES = {
  SESSION_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9가-힣\s\-_]+$/,
  },
  WORK_TYPE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9가-힣\s\-_]+$/,
  },
  OPERATOR_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z가-힣]+$/,
  },
  TARGET_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9가-힣\s\-_]+$/,
  },
} as const;

export const ERROR_MESSAGES = {
  INVALID_SESSION_NAME: '세션명은 1-50자의 한글, 영문, 숫자만 입력 가능합니다.',
  INVALID_WORK_TYPE: '작업 유형은 1-30자의 한글, 영문, 숫자만 입력 가능합니다.',
  INVALID_OPERATOR_NAME: '측정자명은 1-20자의 한글, 영문만 입력 가능합니다.',
  INVALID_TARGET_NAME:
    '대상자명은 1-20자의 한글, 영문, 숫자만 입력 가능합니다.',
  NO_ACTIVE_SESSION: '활성화된 세션이 없습니다.',
  NO_OPERATOR_SELECTED: '측정자를 선택해주세요.',
  NO_TARGET_SELECTED: '대상자를 선택해주세요.',
  TIMER_NOT_STARTED: '타이머를 먼저 시작해주세요.',
  EXPORT_FAILED: '데이터 내보내기에 실패했습니다.',
  STORAGE_FAILED: '데이터 저장에 실패했습니다.',
  LOAD_FAILED: '데이터 로드에 실패했습니다.',
} as const;
