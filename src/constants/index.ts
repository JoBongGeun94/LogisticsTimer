export * from './analysis';
export * from './timer';
export * from './workTypes';

// 분석 설정 상수
export const ANALYSIS_CONFIG = {
  MIN_MEASUREMENTS: 10,
  MIN_OPERATORS: 2,
  MIN_PARTS: 5,
  CONFIDENCE_LEVEL: 0.95,
  SIGNIFICANCE_LEVEL: 0.05
} as const;

// 검증 설정
export const VALIDATION_CONFIG = {
  MIN_SESSION_NAME_LENGTH: 3,
  MAX_SESSION_NAME_LENGTH: 50,
  MIN_OPERATORS: 2,
  MIN_TARGETS: 5,
  MAX_OPERATORS: 20,
  MAX_TARGETS: 50
} as const;
