export const ANALYSIS_CONFIG = {
  MIN_SAMPLE_SIZE: 6,
  RECOMMENDED_TRIALS: 5,
  MIN_OPERATORS: 2,
  MIN_TARGETS: 2,
} as const;

export const QUALITY_THRESHOLDS = {
  EXCELLENT: 10,
  ACCEPTABLE: 30,
  MARGINAL: 50,
} as const;

export const CPK_THRESHOLDS = {
  EXCELLENT: 1.33,
  ACCEPTABLE: 1.0,
} as const;

export const NDC_THRESHOLDS = {
  EXCELLENT: 5,
  ACCEPTABLE: 3,
} as const;
