// 물류 작업 특성에 맞는 임계값 설정
export const LOGISTICS_WORK_THRESHOLDS = {
  CV_THRESHOLD: 15, // 변동계수 임계값 (%)
  ICC_THRESHOLD: 0.75, // 급내상관계수 임계값
  GRR_EXCELLENT: 10, // Gage R&R 우수 기준 (%)
  GRR_ACCEPTABLE: 30, // Gage R&R 허용 기준 (%)
  MIN_MEASUREMENTS: 6, // 최소 측정 횟수
  MIN_OPERATORS: 2, // 최소 측정자 수
  MIN_PARTS: 5 // 최소 대상자 수
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