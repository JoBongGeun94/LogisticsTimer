// MSA 규격 완전 준수 분석 상수
export const MSA_REQUIREMENTS = {
  // MSA-4 규격 기준
  MIN_MEASUREMENTS: 10, // 최소 측정 횟수 (기존 6회 → 10회)
  MIN_OPERATORS: 2,     // 최소 측정자 수
  MIN_PARTS: 5,         // 최소 대상자 수
  TRIALS_PER_PART: 2,   // 대상자당 반복 횟수
} as const;

export const GAGE_RR_THRESHOLDS = {
  EXCELLENT: 0.1,   // < 10%: 우수
  ACCEPTABLE: 0.3,  // 10-30%: 허용 가능
  MARGINAL: 0.5,    // 30-50%: 제한적 사용
  UNACCEPTABLE: 1.0 // > 50%: 사용 불가
} as const;

export const STATISTICAL_CONFIDENCE = {
  LEVEL: 0.95,      // 95% 신뢰도
  ALPHA: 0.05,      // 유의수준 5%
  POWER: 0.8        // 검정력 80%
} as const;

// 로그 변환 옵션
export const LOG_TRANSFORM_OPTIONS = {
  NONE: 'none',
  NATURAL: 'ln',
  BASE10: 'log10',
  SQRT: 'sqrt'
} as const;

export type LogTransformType = typeof LOG_TRANSFORM_OPTIONS[keyof typeof LOG_TRANSFORM_OPTIONS];
