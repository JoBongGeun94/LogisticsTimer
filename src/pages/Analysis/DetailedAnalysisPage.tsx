import React, { useState } from 'react';
import { ArrowLeft, Download, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { GageRRResult } from '../../services/AnalysisService';
import { LapTime } from '../../types';

interface DetailedAnalysisPageProps {
  analysisResult: GageRRResult;
  measurements: LapTime[];
  sessionName: string;
  onBack: () => void;
}

export const DetailedAnalysisPage: React.FC<DetailedAnalysisPageProps> = ({
  analysisResult,
  measurements,
  sessionName,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '개요' },
    { id: 'operators', label: '측정자 분석' },
    { id: 'parts', label: '대상자 분석' }
  ];

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

  const operatorStats = measurements.reduce((acc, measurement) => {
    if (!acc[measurement.operatorId]) {
      acc[measurement.operatorId] = [];
    }
    acc[measurement.operatorId].push(measurement.time);
    return acc;
  }, {} as Record<string, number[]>);

  const partStats = measurements.reduce((acc, measurement) => {
    if (!acc[measurement.partId]) {
      acc[measurement.partId] = [];
    }
    acc[measurement.partId].push(measurement.time);
    return acc;
  }, {} as Record<string, number[]>);

  const calculateStats = (values: number[]) => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev, count: values.length };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">상세 분석 결과</h1>
                <p className="text-gray-600">{sessionName}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Printer className="w-4 h-4" />
                인쇄
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Download className="w-4 h-4" />
                보고서
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 좌측: 주요 지표 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(analysisResult.status)}`}>
                {analysisResult.status === 'excellent' || analysisResult.status === 'acceptable' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="font-semibold">{getStatusText(analysisResult.status)}</span>
              </div>
              
              <div className="mt-4">
                <div className="text-3xl font-bold text-gray-900">
                  {analysisResult.gageRRPercent.toFixed(1)}%
                </div>
                <div className="text-gray-600">Gage R&R 비율</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">핵심 지표</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">반복성</span>
                  <span className="font-semibold">{analysisResult.repeatability.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">재현성</span>
                  <span className="font-semibold">{analysisResult.reproducibility.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">NDC</span>
                  <span className="font-semibold">{analysisResult.ndc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">P/T 비율</span>
                  <span className="font-semibold">{analysisResult.ptRatio.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 우측: 상세 분석 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="flex border-b border-gray-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">분석 개요</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">변동 구성요소</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Gage R&R</span>
                            <span>{((analysisResult.gageRR / analysisResult.totalVariation) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>부품 변동</span>
                            <span>{(100 - (analysisResult.gageRR / analysisResult.totalVariation) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">측정 정보</h4>
                        <div className="space-y-2 text-sm">
                          <div>총 측정: {measurements.length}회</div>
                          <div>측정자: {Object.keys(operatorStats).length}명</div>
                          <div>대상자: {Object.keys(partStats).length}개</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'operators' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">측정자별 분석</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">측정자</th>
                            <th className="px-3 py-2 text-left">측정 수</th>
                            <th className="px-3 py-2 text-left">평균</th>
                            <th className="px-3 py-2 text-left">표준편차</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(operatorStats).map(([operator, times]) => {
                            const stats = calculateStats(times);
                            return (
                              <tr key={operator} className="border-t">
                                <td className="px-3 py-2 font-medium">{operator}</td>
                                <td className="px-3 py-2">{stats.count}</td>
                                <td className="px-3 py-2">{stats.mean.toFixed(3)}s</td>
                                <td className="px-3 py-2">{stats.stdDev.toFixed(3)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'parts' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">대상자별 분석</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">대상자</th>
                            <th className="px-3 py-2 text-left">측정 수</th>
                            <th className="px-3 py-2 text-left">평균</th>
                            <th className="px-3 py-2 text-left">표준편차</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(partStats).map(([part, times]) => {
                            const stats = calculateStats(times);
                            return (
                              <tr key={part} className="border-t">
                                <td className="px-3 py-2 font-medium">{part}</td>
                                <td className="px-3 py-2">{stats.count}</td>
                                <td className="px-3 py-2">{stats.mean.toFixed(3)}s</td>
                                <td className="px-3 py-2">{stats.stdDev.toFixed(3)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 권장사항 */}
            {analysisResult.recommendations.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">개선 권장사항</h3>
                <div className="space-y-3">
                  {analysisResult.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-yellow-800">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
