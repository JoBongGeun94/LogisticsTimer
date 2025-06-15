// MSA 규격 완전 준수 분석 상수
export const MSA_REQUIREMENTS = {
  MIN_MEASUREMENTS: 6,
  MIN_OPERATORS: 2,
  MIN_PARTS: 2,
  TRIALS_PER_PART: 2,
} as const;

export const GAGE_RR_THRESHOLDS = {
  EXCELLENT: 0.1,
  ACCEPTABLE: 0.3,
  MARGINAL: 0.5,
  UNACCEPTABLE: 1.0
} as const;

export const STATISTICAL_CONFIDENCE = {
  LEVEL: 0.95,
  ALPHA: 0.05,
  POWER: 0.8
} as const;

// 작업 유형별 임계값
export interface WorkTypeThreshold {
  icc: number;
  cv: number;
  basis?: string;
}

export const WORK_TYPE_THRESHOLDS_MAP: Record<string, WorkTypeThreshold> = {
  '물자검수팀': { icc: 0.78, cv: 7, basis: '검수 작업의 정밀성 요구' },
  '저장관리팀': { icc: 0.70, cv: 10, basis: '저장 작업의 일관성 중시' },
  '포장관리팀': { icc: 0.65, cv: 12, basis: '포장 작업의 효율성 중시' },
  '피킹': { icc: 0.80, cv: 6, basis: 'ISO 5725-2 고정밀 작업 기준' },
  '검수': { icc: 0.78, cv: 7, basis: 'MSA-4 정확성 중시 작업 기준' },
  '운반': { icc: 0.70, cv: 10, basis: '물류작업 표준시간 연구 기준' },
  '적재': { icc: 0.65, cv: 12, basis: '산업공학 표준시간 연구 기준' },
  '기타': { icc: 0.60, cv: 15, basis: 'MSA-4 최소 허용 기준' }
};

// 분석 관련 상수들
export const ANALYSIS_CONSTANTS = {
  ICC_EXCELLENT: 0.75,
  ICC_ACCEPTABLE: 0.5,
  CV_EXCELLENT: 12,
  CV_ACCEPTABLE: 20,
  MIN_OPERATORS: 2,
  MIN_TARGETS: 5,
  MIN_MEASUREMENTS: 6,
  DELTA_PAIR_THRESHOLD: 2.0
} as const;

// 분석 상태 타입
export type AnalysisStatus = 'excellent' | 'acceptable' | 'marginal' | 'unacceptable' | 'info';

// 분석 결과 평가 함수들
export const evaluateGageRR = (grrPercent: number): AnalysisStatus => {
  if (grrPercent <= 10) return 'excellent';
  if (grrPercent <= 30) return 'acceptable';
  if (grrPercent <= 50) return 'marginal';
  return 'unacceptable';
};

export const evaluateICC = (iccValue: number): AnalysisStatus => {
  if (iccValue >= 0.75) return 'excellent';
  if (iccValue >= 0.5) return 'acceptable';
  if (iccValue >= 0.25) return 'marginal';
  return 'unacceptable';
};

export const evaluateCV = (cvPercent: number): AnalysisStatus => {
  if (cvPercent <= 12) return 'excellent';
  if (cvPercent <= 20) return 'acceptable';
  if (cvPercent <= 30) return 'marginal';
  return 'unacceptable';
};

export const evaluateDeltaPair = (deltaPair: number): AnalysisStatus => {
  if (deltaPair <= 1.0) return 'excellent';
  if (deltaPair <= 2.0) return 'acceptable';
  if (deltaPair <= 3.0) return 'marginal';
  return 'unacceptable';
};

// 분석 메시지
export const ANALYSIS_MESSAGES = {
  excellent: '우수한 측정 시스템입니다',
  acceptable: '양호한 측정 시스템입니다',
  marginal: '제한적 사용을 권장합니다',
  unacceptable: '측정 시스템 개선이 필요합니다',
  info: '분석 진행 중입니다'
} as const;

// 분석 권장사항
export const ANALYSIS_RECOMMENDATIONS = {
  excellent: [
    '모든 측정에 신뢰할 수 있습니다',
    '현재 측정 절차를 유지하세요',
    '정기적인 모니터링을 계속하세요'
  ],
  acceptable: [
    '대부분의 용도로 사용 가능합니다',
    '정기적인 교정을 권장합니다',
    '측정 절차 개선을 고려하세요'
  ],
  marginal: [
    '측정 절차 개선이 필요합니다',
    '교육 및 장비 점검을 고려하세요',
    '중요한 측정에서는 신중하게 사용하세요'
  ],
  unacceptable: [
    '즉시 개선 조치가 필요합니다',
    '장비 교체나 절차 전면 개선을 고려하세요',
    '현재 상태로는 신뢰할 수 없습니다'
  ]
} as const;

// 성능 최적화 상수
export const PERFORMANCE_CONFIG = {
  CACHE_EXPIRY_MS: 5000,
  MIN_RECALC_INTERVAL: 1000,
  MAX_MEASUREMENTS_CACHE: 1000,
} as const;

// 정규분포 분위수 상수
export const NORMAL_DISTRIBUTION = {
  Q95: 1.6449,
  Q99: 2.3263,
  Q999: 3.0902
} as const;

// F-분포 임계값
export const F_DISTRIBUTION_CRITICAL = {
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