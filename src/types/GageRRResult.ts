import { ANOVAResults, VarianceComponents } from './Analysis';

export interface GageRRResult {
  gageRRPercent: number;
  repeatability: number;
  reproducibility: number;
  partToPartVariation: number;
  ndc: number;
  ptRatio: number;
  cpk: number;
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  anovaResults?: ANOVAResults;
  varianceComponents?: VarianceComponents;
}
