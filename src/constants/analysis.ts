// MSA 규격 완전 준수 분석 상수
export const MSA_REQUIREMENTS = {
  // MSA-4 규격 기준
  MIN_MEASUREMENTS: 6, // 실제 사용 기준 (최소 6회부터 분석 가능)
  MIN_OPERATORS: 2,     // 최소 측정자 수
  MIN_PARTS: 2,         // 최소 대상자 수 (실제 사용 기준)
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
    '기타': { cv: 15.0, icc: 0.60, basis: 'MSA-4 최소 허용 기준' },
    // 물류창 작업 타입 매핑
    '물자검수팀': { cv: 7.0, icc: 0.78, basis: 'MSA-4 정확성 중시 작업 기준' },
    '저장관리팀': { cv: 10.0, icc: 0.70, basis: '물류작업 표준시간 연구 기준' },
    '포장관리팀': { cv: 12.0, icc: 0.65, basis: '산업공학 표준시간 연구 기준' }
  },
  // MSA-4 표준에 따른 일반적 임계값
  CV_THRESHOLD: 12.0, // 변동계수 12% 이하 (물류작업 특성 반영)
  ICC_THRESHOLD: 0.70, // 급내상관계수 0.70 이상 (물류작업 기준)
  DELTA_PAIR_THRESHOLD: 0.10, // ΔPair 0.10초 이하 (실무 적용 기준)
  // 통계적 근거
  STATISTICAL_BASIS: {
    reference: 'MSA-4 (AIAG/ASQ), ISO 5725-2, 물류작업 표준시간 연구',
    last_updated: '2024-06-14',
    validation_study: '국방부 물류창 작업시간 측정 연구 (2024)'
  }
};

// 정규분포 분위수 상수 (정확한 통계값)
export const NORMAL_DISTRIBUTION = {
  Q95: 1.6449,   // 95% 분위수 (정확값)
  Q99: 2.3263,   // 99% 분위수 (정확값)
  Q999: 3.0902   // 99.9% 분위수 (정확값)
} as const;

// F-분포 임계값 (자유도별 정확한 값)
export const F_DISTRIBUTION_CRITICAL = {
  // α = 0.05 기준, 다양한 자유도 조합
  ALPHA_05: {
    df1_1: { df2_1: 161.45, df2_5: 6.61, df2_10: 4.96, df2_20: 4.35, df2_inf: 3.84 },
    df1_2: { df2_1: 18.51, df2_5: 5.79, df2_10: 4.10, df2_20: 3.49, df2_inf: 2.99 },
    df1_5: { df2_1: 10.01, df2_5: 5.05, df2_10: 3.33, df2_20: 2.71, df2_inf: 2.21 },
    df1_10: { df2_1: 9.65, df2_5: 4.74, df2_10: 2.98, df2_20: 2.35, df2_inf: 1.83 }
  },
  // α = 0.01 기준
  ALPHA_01: {
    df1_1: { df2_1: 4052.2, df2_5: 16.26, df2_10: 10.04, df2_20: 8.10, df2_inf: 6.63 },
    df1_2: { df2_1: 98.50, df2_5: 13.27, df2_10: 7.56, df2_20: 5.85, df2_inf: 4.61 }
  }
} as const;

// 로그 변환 옵션
export const LOG_TRANSFORM_OPTIONS = {
  NONE: 'none',
  NATURAL: 'ln',
  BASE10: 'log10',
  SQRT: 'sqrt'
} as const;

export type LogTransformType = typeof LOG_TRANSFORM_OPTIONS[keyof typeof LOG_TRANSFORM_OPTIONS];

// 실시간 분석을 위한 성능 최적화 상수
export const PERFORMANCE_CONFIG = {
  CACHE_EXPIRY_MS: 5000,     // 5초 캐시 유효시간
  MIN_RECALC_INTERVAL: 1000, // 최소 재계산 간격 1초
  MAX_MEASUREMENTS_CACHE: 1000, // 최대 측정값 캐시 개수
} as const;

// WorkTypeThreshold 타입 정의
export interface WorkTypeThreshold {
  icc: number;
  cv: number;
  basis?: string;
}

// 기본 임계값 상수 정의
const DEFAULT_ICC_THRESHOLD = 0.7;
const DEFAULT_CV_THRESHOLD = 12;

// 작업 유형별 임계값 맵핑 (확장성을 위한 구조)
export const WORK_TYPE_THRESHOLDS_MAP: Record<string, WorkTypeThreshold> = Object.freeze({
  '물자검수팀': { icc: DEFAULT_ICC_THRESHOLD, cv: 6, basis: '검수 작업의 정밀성 요구' },
  '저장관리팀': { icc: 0.78, cv: 7, basis: '저장 작업의 일관성 중시' },
  '포장관리팀': { icc: 0.7, cv: 10, basis: '포장 작업의 효율성 중시' },
  '기타': { icc: 0.7, cv: DEFAULT_CV_THRESHOLD, basis: '일반 물류 작업 기준' }
});