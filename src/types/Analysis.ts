import { QualityStatus, RiskLevel } from './Common';

export interface StatisticalMetrics {
  readonly repeatability: number;
  readonly reproducibility: number;
  readonly gageRR: number;
  readonly partVariation: number;
  readonly totalVariation: number;
  readonly gageRRPercent: number;
  readonly ndc: number;
  readonly cpk: number;
}

export interface ANOVAResult {
  readonly operator: number;
  readonly part: number;
  readonly interaction: number;
  readonly error: number;
  readonly total: number;
  readonly operatorPercent: number;
  readonly partPercent: number;
  readonly interactionPercent: number;
  readonly errorPercent: number;
}

export interface AnalysisInterpretation {
  overall: string;
  repeatability: string;
  reproducibility: string;
  recommendations: string[];
  riskLevel: RiskLevel;
}

export interface GageRRAnalysis extends StatisticalMetrics {
  status: QualityStatus;
  anova: ANOVAResult;
  interpretation: AnalysisInterpretation;
}

// ANOVA 분석 결과 타입
export interface ANOVAResults {
  fOperators: number;
  fParts: number;
  fInteraction: number;
  pValueOperators: number;
  pValueParts: number;
}

// 분산 성분 타입
export interface VarianceComponents {
  repeatability: number;
  reproducibility: number;
  partToPart: number;
  interaction: number;
  total: number;
}
