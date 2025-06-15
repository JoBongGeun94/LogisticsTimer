// 물류 작업 특성에 맞는 임계값 설정
export const LOGISTICS_WORK_THRESHOLDS = {
  CV_THRESHOLD: 15, // 변동계수 임계값 (%)
  ICC_THRESHOLD: 0.75, // 급내상관계수 임계값
  GRR_EXCELLENT: 10, // Gage R&R 우수 기준 (%)
  GRR_ACCEPTABLE: 30, // Gage R&R 허용 기준 (%)
  MIN_MEASUREMENTS: 6, // 최소 측정 횟수
  MIN_OPERATORS: 2, // 최소 측정자 수
  MIN_PARTS: 5, // 최소 대상자 수
  BY_WORK_TYPE: {
    '피킹': { cv: 6, icc: 0.8 },
    '검수': { cv: 7, icc: 0.78 },
    '운반': { cv: 10, icc: 0.7 },
    '적재': { cv: 12, icc: 0.65 },
    '기타': { cv: 15, icc: 0.75 }
  }
} as const;

// MSA-4 표준 기준값
export const MSA_STANDARDS = {
  GAGE_RR: {
    EXCELLENT: 10,
    ACCEPTABLE: 30,
    MARGINAL: 50
  },
  NDC: {
    MINIMUM: 4,
    PREFERRED: 5
  },
  ICC: {
    EXCELLENT: 0.9,
    GOOD: 0.75,
    MARGINAL: 0.5
  }
} as const;

// F-분포 임계값 (MSA-4 표준)
export const F_DISTRIBUTION_CRITICAL = {
  ALPHA_001: {
    small_df: 15.14,
    medium_df: 12.73,
    large_df: 10.92
  },
  ALPHA_01: {
    small_df: 8.40,
    medium_df: 7.08,
    large_df: 6.23
  },
  ALPHA_05: {
    small_df: 4.41,
    medium_df: 3.84,
    large_df: 3.49
  },
  ALPHA_10: {
    small_df: 2.96,
    medium_df: 2.71,
    large_df: 2.54
  }
} as const;

// 정규분포 상수값
export const NORMAL_DISTRIBUTION = {
  Q95: 1.645,
  Q99: 2.576,
  Q999: 3.291
} as const;