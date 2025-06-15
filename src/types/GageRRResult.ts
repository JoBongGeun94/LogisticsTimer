import { ANOVAResults, VarianceComponents } from './Analysis';

export interface GageRRResult {
  gageRRPercent: number;
  repeatability: number;
  reproducibility: number;
  partToPartVariation: number;
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  anovaResults?: ANOVAResults;
  varianceComponents?: VarianceComponents;
}
