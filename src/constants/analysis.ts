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

// 임계값 설정 근거: MSA-4 표준 및 물류작업 특성 연구 기반
export const LOGISTICS_WORK_THRESHOLDS = {
  // ICC (급내상관계수) 임계값
  ICC_EXCELLENT: 0.8,
  ICC_ACCEPTABLE: 0.7,

  // 변동계수 임계값 (물류작업 특성 반영)
  CV_THRESHOLD: 0.12, // 12%

  // ΔPair 임계값 (연속 측정값 차이)
  DELTA_PAIR_THRESHOLD: 0.15, // 15%

  // Gage R&R 임계값 (MSA 표준)
  GRR_EXCELLENT: 10,   // 10% 미만: 우수
  GRR_ACCEPTABLE: 30,  // 30% 미만: 허용 가능
  GRR_MARGINAL: 50,    // 50% 미만: 제한적 사용

  // 물류작업별 특화 임계값
  WORK_TYPE_MULTIPLIERS: {
    '물자검수팀': 1.0,
    '저장관리팀': 1.1,
    '포장관리팀': 1.2
  } as const
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