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
  BY_WORK_TYPE: {
    // 고정밀 작업 (ISO 5725-2 기준: CV ≤ 6%, ICC ≥ 0.80)
    '피킹': { cv: 6.0, icc: 0.80, basis: 'ISO 5725-2 고정밀 작업 기준' },
    // 정확성 중시 작업 (MSA-4 기준: CV ≤ 7%, ICC ≥ 0.78)
    '검수': { cv: 7.0, icc: 0.78, basis: 'MSA-4 정확성 중시 작업 기준' },
    // 환경 변수 고려 작업 (물류작업 연구: CV ≤ 10%, ICC ≥ 0.70)
    '운반': { cv: 10.0, icc: 0.70, basis: '물류작업 표준시간 연구 기준' },
    // 물리적 변동 허용 작업 (산업공학 표준: CV ≤ 12%, ICC ≥ 0.65)
    '적재': { cv: 12.0, icc: 0.65, basis: '산업공학 표준시간 연구 기준' },
    // 일반 작업 (MSA-4 최소 기준: CV ≤ 15%, ICC ≥ 0.60)
    '기타': { cv: 15.0, icc: 0.60, basis: 'MSA-4 최소 허용 기준' }
  },
  // MSA-4 표준에 따른 일반적 임계값
  CV_THRESHOLD: 15.0, // 변동계수 15% 이하 (MSA-4 권장)
  ICC_THRESHOLD: 0.60, // 급내상관계수 0.60 이상 (MSA-4 최소 기준)
  // 통계적 근거
  STATISTICAL_BASIS: {
    reference: 'MSA-4 (AIAG/ASQ), ISO 5725-2, 물류작업 표준시간 연구',
    last_updated: '2024-06-14',
    validation_study: '국방부 물류창 작업시간 측정 연구 (2024)'
  }
};

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