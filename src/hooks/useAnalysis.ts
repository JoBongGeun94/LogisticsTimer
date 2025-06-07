import { useMemo } from 'react';
import { GageRRAnalysis, LapTime } from '../types';
import { canPerformAnalysis } from '../utils';
import { AnalysisService } from '../services';

interface UseAnalysisReturn {
  analysis: GageRRAnalysis | null;
  isAnalysisReady: boolean;
  canAnalyze: boolean;
}

export const useAnalysis = (lapTimes: LapTime[]): UseAnalysisReturn => {
  const canAnalyze = useMemo(() => canPerformAnalysis(lapTimes.length), [lapTimes.length]);

  const analysis = useMemo(() => {
    if (!canAnalyze) return null;
    
    try {
      return AnalysisService.calculateGageRR(lapTimes);
    } catch (error) {
      console.error('Analysis failed:', error);
      return null;
    }
  }, [lapTimes, canAnalyze]);

  return {
    analysis,
    isAnalysisReady: analysis !== null,
    canAnalyze
  };
};
