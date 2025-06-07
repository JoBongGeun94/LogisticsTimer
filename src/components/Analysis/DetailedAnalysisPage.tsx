import React, { memo, useMemo } from 'react';
import { ArrowLeft, Download, Info, Target, BarChart3, Calculator, Clock, Activity, PieChart } from 'lucide-react';
import { Theme } from '../../types/Theme';

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
  anova: {
    operator: number;
    part: number;
    interaction: number;
    error: number;
    total: number;
    operatorPercent: number;
    partPercent: number;
    interactionPercent: number;
    errorPercent: number;
  };
  interpretation: {
    overall: string;
    repeatability: string;
    reproducibility: string;
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
}

interface DetailedAnalysisPageProps {
  analysis: GageRRAnalysis;
  lapTimes: LapTime[];
  session: SessionData;
  theme: Theme;
  isDark: boolean;
  onBack: () => void;
  onDownload: () => void;
}

const formatTime = (ms: number): string => {
  if (ms < 0) return '00:00.00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

/**
 * 상세 분석 페이지
 * SRP: 상세 분석 결과 표시만 담당
 * OCP: 새로운 분석 항목 추가 가능
 */
export const DetailedAnalysisPage = memo<DetailedAnalysisPageProps>(({ 
  analysis, 
  lapTimes, 
  session, 
  theme, 
  isDark, 
  onBack, 
  onDownload 
}) => {
  const basicStats = useMemo(() => {
    const times = lapTimes.map(lap => lap.time);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / Math.max(1, times.length - 1);
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
    
    return {
      mean,
      stdDev,
      cv,
      min: Math.min(...times),
      max: Math.max(...times),
      range: Math.max(...times) - Math.min(...times)
    };
  }, [lapTimes]);

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      {/* 헤더 */}
      <div className={`${theme.card} shadow-sm border-b ${theme.border} sticky top-0 z-40`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <button
                onClick={onBack}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover} flex-shrink-0`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className={`text-lg font-bold ${theme.text} truncate`}>상세 분석 보고서</h1>
                <p className={`text-sm ${theme.textMuted} truncate`}>
                  {session.name} - {session.workType}
                </p>
              </div>
            </div>
            <button
              onClick={onDownload}
              className="bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 flex-shrink-0 transition-colors"
              title="상세 보고서 다운로드"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 max-w-4xl mx-auto">
        {/* 종합 평가 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className={`text-xl font-bold ${theme.text}`}>종합 평가</h2>
            <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
              analysis.interpretation.riskLevel === 'high' 
                ? isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-800'
                : analysis.interpretation.riskLevel === 'medium'
                ? isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-50 text-yellow-800'
                : isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-800'
            }`}>
              위험도: {analysis.interpretation.riskLevel === 'high' ? '높음' : 
                      analysis.interpretation.riskLevel === 'medium' ? '보통' : '낮음'}
            </div>
          </div>
          
          <div className={`${theme.surface} p-4 rounded-lg mb-4`}>
            <p className={`text-base leading-relaxed ${theme.text}`}>
              {analysis.interpretation.overall}
            </p>
          </div>
        </div>

        {/* 개선 권장사항 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <h3 className={`text-lg font-bold ${theme.text} mb-4 flex items-center gap-2`}>
            <Info className="w-5 h-5 text-green-500" />
            개선 권장사항
          </h3>
          
          <div className="space-y-3">
            {analysis.interpretation.recommendations.map((recommendation, index) => (
              <div key={index} className={`${theme.surface} p-4 rounded-lg border-l-4 border-green-500`}>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-50'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <span className={`text-xs font-bold ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                      {index + 1}
                    </span>
                  </div>
                  <p className={`${theme.text} leading-relaxed text-sm`}>
                    {recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-8"></div>
      </div>
    </div>
  );
});

DetailedAnalysisPage.displayName = 'DetailedAnalysisPage';
