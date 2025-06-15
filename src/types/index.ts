// ==================== 기본 타입 정의 ====================
export interface LapTime {
  readonly id: number;
  readonly time: number;
  readonly timestamp: string;
  readonly operator: string;
  readonly target: string;
  readonly sessionId: string;
}

export interface SessionData {
  readonly id: string;
  readonly name: string;
  readonly workType: string;
  readonly operators: readonly string[];
  readonly targets: readonly string[];
  readonly lapTimes: readonly LapTime[];
  readonly startTime: string;
  readonly isActive: boolean;
}

export interface Theme {
  bg: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  input: string;
  surface: string;
  surfaceHover: string;
}

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

export interface FilterOptions {
  operator: string;
  target: string;
}

export type TransformType = 'none' | 'ln' | 'log10' | 'sqrt';

// ==================== 분석 관련 타입 ====================
export interface GageRRResult {
  gageRRPercent: number;
  repeatability: number;
  reproducibility: number;
  partVariation: number;
  totalVariation: number;
  // 작업시간 분석용 추가 지표
  icc: number;
  cv: number;
  q95: number;
  q99: number;
  q999: number;
  isReliableForStandard: boolean;
  thresholds?: {
    cv: number;
    icc: number;
  };
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  anova?: ANOVAResult;
  varianceComponents?: VarianceComponents;
}

export interface ANOVAResult {
  partSS: number;
  operatorSS: number;
  interactionSS: number;
  equipmentSS: number;
  totalSS: number;
  partMS: number;
  operatorMS: number;
  interactionMS: number;
  equipmentMS: number;
  fStatistic: number;
  pValue: number;
}

export interface VarianceComponents {
  part: number;
  operator: number;
  interaction: number;
  equipment: number;
  total: number;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  canAnalyze?: boolean;
  analysisMessage?: string;
}