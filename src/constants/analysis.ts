
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

// 물류 작업현장 특성에 맞는 임계값
export const LOGISTICS_WORK_THRESHOLDS = {
  // 물류작업 특성상 일반 제조업보다 완화된 기준
  CV_THRESHOLD: 8.0,        // 변동계수 기준 (5% → 8%)
  ICC_THRESHOLD: 0.75,      // 급내상관계수 기준 (0.8 → 0.75)
  
  // 작업 유형별 차등 기준
  BY_WORK_TYPE: {
    '피킹': { cv: 6.0, icc: 0.80 },      // 정밀 작업
    '패킹': { cv: 8.0, icc: 0.75 },      // 일반 작업
    '운반': { cv: 10.0, icc: 0.70 },     // 물리적 작업
    '검수': { cv: 7.0, icc: 0.78 },      // 검증 작업
    '적재': { cv: 12.0, icc: 0.65 },     // 중량 작업
    '기타': { cv: 8.0, icc: 0.75 }       // 기본값
  }
} as const;

// 정규분포 분위수 상수
export const NORMAL_DISTRIBUTION = {
  Q95: 1.645,   // 95% 분위수
  Q99: 2.326,   // 99% 분위수
  Q999: 3.090   // 99.9% 분위수
} as const;

// F-분포 임계값 (개선된 근사)
export const F_DISTRIBUTION_CRITICAL = {
  ALPHA_001: { large_df: 6.63, small_df: 8.0 },
  ALPHA_01: { large_df: 4.61, small_df: 5.5 },
  ALPHA_05: { large_df: 3.84, small_df: 4.0 },
  ALPHA_10: { large_df: 2.71, small_df: 3.0 }
} as const;

// 로그 변환 옵션
export const LOG_TRANSFORM_OPTIONS = {
  NONE: 'none',
  NATURAL: 'ln',
  BASE10: 'log10',
  SQRT: 'sqrt'
} as const;

export type LogTransformType = typeof LOG_TRANSFORM_OPTIONS[keyof typeof LOG_TRANSFORM_OPTIONS];
