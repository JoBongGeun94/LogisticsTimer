// ==================== 기본 인터페이스 (Interface Segregation Principle) ====================

export interface LapTime {
  id: number;
  time: number;
  timestamp: string;
  operator: string;
  target: string;
  sessionId: string;
}

export interface SessionData {
  id: string;
  name: string;
  workType: string;
  operators: string[];
  targets: string[];
  lapTimes: LapTime[];
  startTime: string;
  endTime?: string;
  isActive: boolean;
}

export interface GageRRAnalysis {
  repeatability: number;
  reproducibility: number;
  gageRR: number;
  partVariation: number;
  totalVariation: number;
  gageRRPercent: number;
  ndc: number;
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  cpk: number;
  anova: ANOVAResult;
  interpretation: AnalysisInterpretation;
}

export interface ANOVAResult {
  operator: number;
  part: number;
  interaction: number;
  error: number;
  total: number;
  operatorPercent: number;
  partPercent: number;
  interactionPercent: number;
  errorPercent: number;
}

export interface AnalysisInterpretation {
  overall: string;
  repeatability: string;
  reproducibility: string;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
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

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  canAnalyze: boolean;
  analysisMessage?: string;
}
