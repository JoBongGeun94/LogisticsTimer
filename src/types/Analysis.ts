
import { QualityStatus, RiskLevel } from './Common';

export interface StatisticalMetrics {
  readonly repeatability: number;
  readonly reproducibility: number;
  readonly partVariation: number;
  readonly totalVariation: number;
  readonly gageRRPercent: number;
  readonly icc: number;
  readonly cv: number;
  readonly q99: number;
  readonly isReliableForStandard: boolean;
}

export interface ANOVAResult {
  readonly partSS: number;
  readonly operatorSS: number;
  readonly interactionSS: number;
  readonly equipmentSS: number;
  readonly totalSS: number;
  readonly partMS: number;
  readonly operatorMS: number;
  readonly interactionMS: number;
  readonly equipmentMS: number;
  readonly fStatistic: number;
  readonly pValue: number;
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

// 분산 성분 타입 (실제 사용 구조와 일치)
export interface VarianceComponents {
  part: number;
  operator: number;
  interaction: number;
  equipment: number;
  total: number;
}
