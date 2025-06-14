
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

// 임계값 설정 (단순 구조로 변경)
export const LOGISTICS_WORK_THRESHOLDS = {
  ICC_EXCELLENT: 0.8,
  ICC_ACCEPTABLE: 0.7,
  CV_THRESHOLD: 0.12,
  DELTA_PAIR_THRESHOLD: 0.15,
  GRR_EXCELLENT: 10,
  GRR_ACCEPTABLE: 30,
  GRR_MARGINAL: 50
} as const;

// 측정자별 보정 계수
export const OPERATOR_ADJUSTMENT = {
  '6급': 1.0,
  '7급': 1.1,
  '8급': 1.2,
  '9급': 1.3,
  '기타': 1.15
} as const;

// 작업별 보정 계수
export const WORK_COMPLEXITY = {
  '물자검수팀': 1.0,
  '저장관리팀': 1.1,
  '포장관리팀': 1.2
} as const;

// 정규분포 분위수 상수
export const NORMAL_DISTRIBUTION = {
  Q90: 1.282,
  Q95: 1.645,
  Q99: 2.326,
  Q999: 3.090,
  Q9999: 3.719
} as const;

// F-분포 임계값
export const F_DISTRIBUTION_CRITICAL = {
  ALPHA_001: { 
    base: 6.63, 
    adjustment_factor: 1.2,
    min_df_threshold: 10
  },
  ALPHA_01: { 
    base: 4.61, 
    adjustment_factor: 1.15,
    min_df_threshold: 10
  },
  ALPHA_05: { 
    base: 3.84, 
    adjustment_factor: 1.1,
    min_df_threshold: 10
  },
  ALPHA_10: { 
    base: 2.71, 
    adjustment_factor: 1.05,
    min_df_threshold: 10
  }
} as const;

// 작업 유형별 세부 임계값 (단순 구조)
export const WORK_TYPE_THRESHOLDS = {
  '피킹': { 
    icc: 0.8, 
    cv: 6, 
    description: '정밀한 선별 작업' 
  },
  '검수': { 
    icc: 0.78, 
    cv: 7, 
    description: '품질 검증 작업' 
  },
  '운반': { 
    icc: 0.7, 
    cv: 10, 
    description: '물리적 이동 작업' 
  },
  '적재': { 
    icc: 0.65, 
    cv: 12, 
    description: '적재 및 보관 작업' 
  },
  '기타': { 
    icc: 0.7, 
    cv: 12, 
    description: '일반 물류 작업' 
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

// 동적 임계값 계산 함수 (완전 분리)
export const getDynamicThreshold = (workType: string, baseCV: number, measurementCount: number) => {
  // 하드코딩된 매핑으로 순환 참조 방지
  const workTypeMap: Record<string, { icc: number; cv: number }> = {
    '피킹': { icc: 0.8, cv: 6 },
    '검수': { icc: 0.78, cv: 7 },
    '운반': { icc: 0.7, cv: 10 },
    '적재': { icc: 0.65, cv: 12 },
    '기타': { icc: 0.7, cv: 12 },
    '물자검수팀': { icc: 0.8, cv: 6 },
    '저장관리팀': { icc: 0.78, cv: 7 },
    '포장관리팀': { icc: 0.7, cv: 10 }
  };
  
  const typeThreshold = workTypeMap[workType] || workTypeMap['기타'];

  // 측정 횟수에 따른 보정
  const countAdjustment = measurementCount >= 20 ? 0.9 : 
                         measurementCount >= 10 ? 0.95 : 1.0;

  return {
    icc: typeThreshold.icc * countAdjustment,
    cv: typeThreshold.cv * countAdjustment
  };
};
