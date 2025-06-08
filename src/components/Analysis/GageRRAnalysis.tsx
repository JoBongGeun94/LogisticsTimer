import React, { useState } from 'react';
import { LapTime } from '../../types';
import { AnalysisService, GageRRResult } from '../../services/AnalysisService';
import { LOG_TRANSFORM_OPTIONS, LogTransformType } from '../../constants/analysis';

interface GageRRAnalysisProps {
  measurements: LapTime[];
  onAnalysisComplete?: (result: GageRRResult) => void;
}

export const GageRRAnalysis: React.FC<GageRRAnalysisProps> = ({
  measurements,
  onAnalysisComplete
}) => {
  const [transformType, setTransformType] = useState<LogTransformType>(LOG_TRANSFORM_OPTIONS.NONE);
  const [result, setResult] = useState<GageRRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performAnalysis = () => {
    try {
      setError(null);
      const analysisResult = AnalysisService.calculateGageRR(measurements, transformType);
      setResult(analysisResult);
      onAnalysisComplete?.(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
      setResult(null);
    }
  };

  const getStatusColor = (status: GageRRResult['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'acceptable': return 'text-yellow-600 bg-yellow-100';
      case 'marginal': return 'text-orange-600 bg-orange-100';
      case 'unacceptable': return 'text-red-600 bg-red-100';
    }
  };

  const getStatusText = (status: GageRRResult['status']) => {
    switch (status) {
      case 'excellent': return '우수';
      case 'acceptable': return '허용 가능';
      case 'marginal': return '제한적 사용';
      case 'unacceptable': return '사용 불가';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">Gage R&R 분석 (MSA 규격 준수)</h3>
      
      {/* 로그 변환 옵션 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          데이터 변환 방법
        </label>
        <select
          value={transformType}
          onChange={(e) => setTransformType(e.target.value as LogTransformType)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value={LOG_TRANSFORM_OPTIONS.NONE}>변환 없음</option>
          <option value={LOG_TRANSFORM_OPTIONS.NATURAL}>자연로그 (ln)</option>
          <option value={LOG_TRANSFORM_OPTIONS.BASE10}>상용로그 (log10)</option>
          <option value={LOG_TRANSFORM_OPTIONS.SQRT}>제곱근 (√)</option>
        </select>
      </div>

      <button
        onClick={performAnalysis}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        disabled={measurements.length < 10}
      >
        {measurements.length < 10 ? '최소 10회 측정 필요' : 'Gage R&R 분석 실행'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className={`p-4 rounded-lg ${getStatusColor(result.status)}`}>
            <h4 className="font-semibold">측정시스템 상태: {getStatusText(result.status)}</h4>
            <p className="text-sm">Gage R&R: {result.gageRRPercent.toFixed(2)}%</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <h5 className="font-medium">반복성 (Repeatability)</h5>
              <p className="text-2xl font-bold">{result.repeatability.toFixed(4)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h5 className="font-medium">재현성 (Reproducibility)</h5>
              <p className="text-2xl font-bold">{result.reproducibility.toFixed(4)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h5 className="font-medium">구별 범주 수 (NDC)</h5>
              <p className="text-2xl font-bold">{result.ndc}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h5 className="font-medium">P/T 비율</h5>
              <p className="text-2xl font-bold">{result.ptRatio.toFixed(3)}</p>
            </div>
          </div>

          {result.recommendations.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <h5 className="font-medium text-yellow-800 mb-2">권장사항</h5>
              <ul className="list-disc list-inside text-yellow-700 text-sm">
                {result.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
