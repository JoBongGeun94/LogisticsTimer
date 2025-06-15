import { ANOVAResult, VarianceComponents } from './Analysis';

export interface GageRRResult {
  gageRRPercent: number;
  repeatability: number;
  reproducibility: number;
  partVariation: number;
  totalVariation: number;
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
  dataQuality?: {
    originalCount: number;
    validCount: number;
    outliersDetected: number;
    isNormalDistribution: boolean;
    normalityTest: {
      statistic: number;
      pValue: number;
      method: string;
    } | null;
    outlierMethod: string;
    preprocessingApplied: boolean;
  };
}
