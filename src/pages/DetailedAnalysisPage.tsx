import React, { useMemo, useState } from 'react';
import { 
  ArrowLeft, Download, Settings, BarChart3, 
  Target, Calculator, Info, HelpCircle 
} from 'lucide-react';
import { LapTime, SessionData } from '../types';
import { EnhancedMSAService, MSAOptions } from '../services/EnhancedMSAService';
import { ExportService } from '../services/ExportService';

interface DetailedAnalysisPageProps {
  lapTimes: LapTime[];
  currentSession: SessionData | null;
  onBack: () => void;
  isDark: boolean;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DetailedAnalysisPage: React.FC<DetailedAnalysisPageProps> = ({
  lapTimes,
  currentSession,
  onBack,
  isDark,
  onShowToast
}) => {
  const [msaOptions, setMsaOptions] = useState<MSAOptions>({
    logTransform: false,
    confidenceLevel: 0.95,
    strictMode: true,
    outlierDetection: false
  });
  
  const [showHelp, setShowHelp] = useState(false);

  const theme = useMemo(() => ({
    bg: isDark ? 'bg-gray-900' : 'bg-gray-50',
    card: isDark ? 'bg-gray-800' : 'bg-white',
    text: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-200' : 'text-gray-700',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
    border: isDark ? 'border-gray-600' : 'border-gray-200',
    surface: isDark ? 'bg-gray-700' : 'bg-gray-50',
  }), [isDark]);

  // 강화된 MSA 분석 실행
  const analysis = useMemo(() => {
    if (lapTimes.length === 0) return null;
    return EnhancedMSAService.calculateEnhancedGageRR(lapTimes, msaOptions);
  }, [lapTimes, msaOptions]);

  const handleDownloadReport = () => {
    if (!currentSession || !analysis) {
      onShowToast('다운로드할 분석 결과가 없습니다.', 'warning');
      return;
    }

    const success = ExportService.exportEnhancedAnalysis(currentSession, lapTimes, analysis);
    if (success) {
      onShowToast('상세 분석 보고서가 다운로드되었습니다.', 'success');
    } else {
      onShowToast('다운로드에 실패했습니다.', 'error');
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      {/* 헤더 */}
      <div className={`${theme.card} shadow-sm border-b ${theme.border} sticky top-0 z-40`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary}`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className={`text-lg font-bold ${theme.text}`}>상세 분석 결과</h1>
                <p className={`text-sm ${theme.textMuted}`}>
                  {currentSession?.name} - 고급 MSA 분석
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowHelp(true)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary}`}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownloadReport}
                className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 flex items-center space-x-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>보고서</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* MSA 옵션 설정 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 text-blue-500" />
            <h2 className={`font-semibold ${theme.text}`}>분석 옵션</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={msaOptions.logTransform}
                onChange={(e) => setMsaOptions(prev => ({...prev, logTransform: e.target.checked}))}
                className="rounded"
              />
              <span className={`text-sm ${theme.textSecondary}`}>로그 변환</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={msaOptions.strictMode}
                onChange={(e) => setMsaOptions(prev => ({...prev, strictMode: e.target.checked}))}
                className="rounded"
              />
              <span className={`text-sm ${theme.textSecondary}`}>엄격 모드</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={msaOptions.outlierDetection}
                onChange={(e) => setMsaOptions(prev => ({...prev, outlierDetection: e.target.checked}))}
                className="rounded"
              />
              <span className={`text-sm ${theme.textSecondary}`}>이상치 제거</span>
            </label>
            
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${theme.textSecondary}`}>신뢰도:</span>
              <select
                value={msaOptions.confidenceLevel}
                onChange={(e) => setMsaOptions(prev => ({...prev, confidenceLevel: parseFloat(e.target.value)}))}
                className={`text-sm border rounded px-2 py-1 ${theme.border} ${theme.textSecondary}`}
              >
                <option value={0.90}>90%</option>
                <option value={0.95}>95%</option>
                <option value={0.99}>99%</option>
              </select>
            </div>
          </div>
        </div>

        {analysis && (
          <>
            {/* 주요 지표 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  <span className={`text-xs px-2 py-1 rounded ${
                    analysis.status === 'excellent' ? 'bg-green-100 text-green-800' :
                    analysis.status === 'acceptable' ? 'bg-blue-100 text-blue-800' :
                    analysis.status === 'marginal' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {analysis.status === 'excellent' ? '우수' :
                     analysis.status === 'acceptable' ? '양호' :
                     analysis.status === 'marginal' ? '보통' : '불량'}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${theme.text} mb-1`}>
                  {analysis.gageRRPercent.toFixed(1)}%
                </div>
                <div className={`text-sm ${theme.textMuted}`}>Gage R&R</div>
              </div>

              <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-green-500" />
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <div className={`text-2xl font-bold ${theme.text} mb-1`}>
                  {analysis.ptRatio.toFixed(3)}
                </div>
                <div className={`text-sm ${theme.textMuted}`}>P/T 비율</div>
              </div>

              <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <Calculator className="w-5 h-5 text-blue-500" />
                  <span className={`text-xs px-2 py-1 rounded ${
                    analysis.ndc >= 5 ? 'bg-green-100 text-green-800' :
                    analysis.ndc >= 3 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {analysis.ndc >= 5 ? '양호' : analysis.ndc >= 3 ? '보통' : '부족'}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${theme.text} mb-1`}>
                  {analysis.ndc}
                </div>
                <div className={`text-sm ${theme.textMuted}`}>NDC</div>
              </div>
            </div>

            {/* 신뢰구간 정보 */}
            <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
              <h3 className={`font-semibold ${theme.text} mb-4`}>
                {(msaOptions.confidenceLevel * 100).toFixed(0)}% 신뢰구간
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className={`text-sm ${theme.textMuted} mb-1`}>Gage R&R</div>
                  <div className={`text-sm ${theme.textSecondary}`}>
                    [{analysis.confidenceIntervals.gageRR.lower.toFixed(3)}, {analysis.confidenceIntervals.gageRR.upper.toFixed(3)}]
                  </div>
                </div>
                <div>
                  <div className={`text-sm ${theme.textMuted} mb-1`}>반복성</div>
                  <div className={`text-sm ${theme.textSecondary}`}>
                    [{analysis.confidenceIntervals.repeatability.lower.toFixed(3)}, {analysis.confidenceIntervals.repeatability.upper.toFixed(3)}]
                  </div>
                </div>
                <div>
                  <div className={`text-sm ${theme.textMuted} mb-1`}>재현성</div>
                  <div className={`text-sm ${theme.textSecondary}`}>
                    [{analysis.confidenceIntervals.reproducibility.lower.toFixed(3)}, {analysis.confidenceIntervals.reproducibility.upper.toFixed(3)}]
                  </div>
                </div>
              </div>
            </div>

            {/* ANOVA 결과 */}
            <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
              <h3 className={`font-semibold ${theme.text} mb-4`}>ANOVA 분산분석</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${theme.border}`}>
                      <th className={`text-left py-2 ${theme.textSecondary}`}>변동 요인</th>
                      <th className={`text-right py-2 ${theme.textSecondary}`}>F값</th>
                      <th className={`text-right py-2 ${theme.textSecondary}`}>P값</th>
                      <th className={`text-center py-2 ${theme.textSecondary}`}>유의성</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={`border-b ${theme.border}`}>
                      <td className={`py-2 ${theme.text}`}>측정자</td>
                      <td className={`text-right py-2 ${theme.text}`}>{analysis.anova.operatorFValue.toFixed(3)}</td>
                      <td className={`text-right py-2 ${theme.text}`}>{analysis.anova.pValues.operator.toFixed(3)}</td>
                      <td className="text-center py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          analysis.anova.pValues.operator < 0.05 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {analysis.anova.pValues.operator < 0.05 ? '유의' : '비유의'}
                        </span>
                      </td>
                    </tr>
                    <tr className={`border-b ${theme.border}`}>
                      <td className={`py-2 ${theme.text}`}>대상자</td>
                      <td className={`text-right py-2 ${theme.text}`}>{analysis.anova.partFValue.toFixed(3)}</td>
                      <td className={`text-right py-2 ${theme.text}`}>{analysis.anova.pValues.part.toFixed(3)}</td>
                      <td className="text-center py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          analysis.anova.pValues.part < 0.05 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {analysis.anova.pValues.part < 0.05 ? '유의' : '비유의'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className={`py-2 ${theme.text}`}>상호작용</td>
                      <td className={`text-right py-2 ${theme.text}`}>{analysis.anova.interactionFValue.toFixed(3)}</td>
                      <td className={`text-right py-2 ${theme.text}`}>{analysis.anova.pValues.interaction.toFixed(3)}</td>
                      <td className="text-center py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          analysis.anova.pValues.interaction < 0.05 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {analysis.anova.pValues.interaction < 0.05 ? '유의' : '비유의'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 기본 통계 */}
            <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
              <h3 className={`font-semibold ${theme.text} mb-4`}>기본 통계량</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className={`text-sm ${theme.textMuted} mb-1`}>평균</div>
                  <div className={`text-base font-medium ${theme.text}`}>
                    {analysis.basicStatistics.mean.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div className={`text-sm ${theme.textMuted} mb-1`}>표준편차</div>
                  <div className={`text-base font-medium ${theme.text}`}>
                    {analysis.basicStatistics.stdDev.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div className={`text-sm ${theme.textMuted} mb-1`}>변동계수</div>
                  <div className={`text-base font-medium ${theme.text}`}>
                    {analysis.basicStatistics.cv.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className={`text-sm ${theme.textMuted} mb-1`}>범위</div>
                  <div className={`text-base font-medium ${theme.text}`}>
                    {analysis.basicStatistics.range.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>

            {/* 권장사항 */}
            <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
              <h3 className={`font-semibold ${theme.text} mb-4`}>개선 권장사항</h3>
              <div className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span className={`text-sm ${theme.textSecondary}`}>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 도움말 모달 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border ${theme.border}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${theme.text}`}>상세 분석 도움말</h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className={`${theme.textMuted} hover:${theme.textSecondary} transition-colors`}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className={`font-semibold ${theme.text} mb-2`}>분석 옵션 설명</h4>
                  <ul className={`space-y-1 ${theme.textSecondary}`}>
                    <li>• <strong>로그 변환:</strong> 데이터의 정규성을 확보하여 분석 정확도 향상</li>
                    <li>• <strong>엄격 모드:</strong> AIAG MSA 4th Edition 기준 적용 (최소 10회 측정)</li>
                    <li>• <strong>이상치 제거:</strong> 3-sigma 규칙으로 이상치 자동 제거</li>
                    <li>• <strong>신뢰도:</strong> 신뢰구간 계산에 사용되는 신뢰수준</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className={`font-semibold ${theme.text} mb-2`}>지표 해석</h4>
                  <ul className={`space-y-1 ${theme.textSecondary}`}>
                    <li>• <strong>Gage R&R &lt; 10%:</strong> 우수한 측정시스템</li>
                    <li>• <strong>P/T 비율 &lt; 0.1:</strong> 측정 정밀도 양호</li>
                    <li>• <strong>NDC ≥ 5:</strong> 충분한 구별 능력</li>
                    <li>• <strong>P값 &lt; 0.05:</strong> 통계적으로 유의한 차이</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
