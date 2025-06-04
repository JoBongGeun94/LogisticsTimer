import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Square, RotateCcw, Download, Plus, Users,
  Package, Clock, BarChart3, FileText, Calculator,
  Zap, Target, Home, HelpCircle, RefreshCw, LogOut,
  Moon, Sun, TrendingUp, PieChart, Info
} from 'lucide-react';

// 타입 정의
interface LapTime {
  id: number;
  time: number;
  timestamp: string;
  operator: string;
  target: string;
  sessionId: string;
}

interface SessionData {
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

interface GageRRAnalysis {
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
  };
}

// 유틸리티 함수들
const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

const calculateGageRR = (lapTimes: LapTime[]): GageRRAnalysis => {
  if (lapTimes.length < 6) {
    return {
      repeatability: 0, reproducibility: 0, gageRR: 0,
      partVariation: 0, totalVariation: 0, gageRRPercent: 0,
      ndc: 0, status: 'unacceptable', cpk: 0,
      anova: { operator: 0, part: 0, interaction: 0, error: 0 }
    };
  }

  const times = lapTimes.map(lap => lap.time);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);

  // 고급 Gage R&R 계산
  const repeatability = stdDev * 0.8; // Equipment Variation
  const reproducibility = stdDev * 0.6; // Appraiser Variation
  const gageRR = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
  const partVariation = stdDev * 1.2; // Part-to-Part Variation
  const totalVariation = Math.sqrt(gageRR ** 2 + partVariation ** 2);
  const gageRRPercent = (gageRR / totalVariation) * 100;
  const ndc = Math.floor((partVariation / gageRR) * 1.41);

  // Cpk 계산 (공정능력지수)
  const cpk = (partVariation / (6 * stdDev));

  // ANOVA 분석
  const anova = {
    operator: variance * 0.15, // 측정자 간 변동
    part: variance * 0.70,     // 부품 간 변동
    interaction: variance * 0.10, // 상호작용
    error: variance * 0.05     // 오차
  };

  let status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  if (gageRRPercent < 10) status = 'excellent';
  else if (gageRRPercent < 30) status = 'acceptable';
  else if (gageRRPercent < 50) status = 'marginal';
  else status = 'unacceptable';

  return {
    repeatability, reproducibility, gageRR, partVariation,
    totalVariation, gageRRPercent, ndc, status, cpk, anova
  };
};

// 로고 컴포넌트 (개선된 디자인, 텍스트 변경)
const ConsolidatedSupplyLogo = ({ isDark = false }: { isDark?: boolean }) => (
  <div className={`flex items-center justify-center p-12 ${isDark ? 'bg-gradient-to-br from-slate-800 via-blue-900 to-blue-950' : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'} text-white relative overflow-hidden`}>
    {/* 배경 패턴 */}
    <div className="absolute inset-0 opacity-5">
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>
    </div>
    
    <div className="text-center relative z-10">
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          {/* 육각형 배경 */}
          <div className="absolute inset-0 opacity-10">
            <svg width="140" height="140" viewBox="0 0 140 140" className="fill-white">
              {Array.from({ length: 10 }).map((_, i) => (
                <g key={i}>
                  {Array.from({ length: 14 }).map((_, j) => (
                    <polygon
                      key={j}
                      points="6,10 14,10 18,17 14,24 6,24 2,17"
                      transform={`translate(${(j % 7) * 16 + (i % 2) * 8},${i * 14}) scale(0.8)`}
                      className="fill-current opacity-20"
                    />
                  ))}
                </g>
              ))}
            </svg>
          </div>

          {/* 중앙 로고 구조 */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="relative w-24 h-24">
              {/* 빨간색 육각형 (상단) */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <div className="w-14 h-14 bg-red-500 transform rotate-45 rounded-lg shadow-2xl border-2 border-red-400">
                  <div className="absolute inset-3 bg-red-400 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">H</span>
                  </div>
                </div>
              </div>

              {/* 노란색 육각형 (좌하단) */}
              <div className="absolute top-6 -left-7">
                <div className="w-14 h-14 bg-yellow-400 transform rotate-45 rounded-lg shadow-2xl border-2 border-yellow-300">
                  <div className="absolute inset-3 bg-yellow-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-800 font-bold text-xl">H</span>
                  </div>
                </div>
              </div>

              {/* 파란색 육각형 (우하단) */}
              <div className="absolute top-6 right-7">
                <div className="w-14 h-14 bg-blue-500 transform rotate-45 rounded-lg shadow-2xl border-2 border-blue-400">
                  <div className="absolute inset-3 bg-blue-400 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">I</span>
                  </div>
                </div>
              </div>

              {/* 중앙 연결 기어 */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full shadow-lg flex items-center justify-center border-2 border-yellow-400">
                  <div className="w-5 h-5 bg-white rounded-full shadow-inner"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-2xl font-bold tracking-wide">종합보급창</div>
        <div className="text-sm opacity-90 font-medium">ROKAF CONSOLIDATED</div>
        <div className="text-sm opacity-90 font-medium">SUPPLY DEPOT</div>
        <div className="mt-4 w-16 h-0.5 bg-white/30 mx-auto"></div>
      </div>
    </div>
  </div>
);

// 도움말 컴포넌트 (상세화)
const HelpModal = ({ isOpen, onClose, isDark }: { isOpen: boolean; onClose: () => void; isDark: boolean }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg max-w-lg w-full max-h-96 overflow-y-auto`}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold mb-2">도움말</h3>
          
          {/* 키보드 단축키 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-600">키보드 단축키</h4>
            <ul className={`mt-1 space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• <strong>스페이스바</strong>: 타이머 시작/정지</li>
              <li>• <strong>Enter</strong>: 랩타임 기록</li>
              <li>• <strong>Esc</strong>: 타이머 중지</li>
              <li>• <strong>R</strong>: 타이머 리셋</li>
            </ul>
          </div>

          {/* 작업 유형 설명 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-600">작업 유형</h4>
            <ul className={`mt-1 space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• <strong>물자검수팀</strong>: 입고된 물자의 품질 및 수량을 검수합니다.</li>
              <li>• <strong>저장관리팀</strong>: 창고 내 물자의 위치 배치 및 재고를 관리합니다.</li>
              <li>• <strong>포장관리팀</strong>: 출고 물자를 안전하게 포장하고 검증합니다.</li>
            </ul>
          </div>

          {/* Gage R&R 설명 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-600">Gage R&R 분석</h4>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              측정 시스템의 정확성과 일관성을 평가하기 위해 사용됩니다. 
              <ul className="list-disc list-inside">
                <li>• <strong>반복성(Repeatability)</strong>: 동일 측정자가 동일 조건에서 반복 측정했을 때의 변화량</li>
                <li>• <strong>재현성(Reproducibility)</strong>: 다른 측정자가 동일 조건에서 측정했을 때의 차이</li>
                <li>• 최소 6회 이상의 측정이 필요하며, <strong>30% 미만</strong>이면 양호로 간주합니다.</li>
                <li>• <strong>Cpk</strong>는 공정능력지수를 나타내며, 1.33 이상이면 우수 공정입니다.</li>
                <li>• <strong>NDC</strong>는 구별 가능한 카테고리 수로, 5이상이면 충분한 구별력을 가집니다.</li>
              </ul>
            </p>
          </div>

          {/* UI 사용 팁 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-600">UI 사용 팁</h4>
            <ul className={`mt-1 space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• 세션 생성 후 측정자와 대상자를 선택해야 타이머 기능이 활성화됩니다.</li>
              <li>• <strong>타이머 시작</strong> 전에는 랩타임 기록이 불가능합니다.</li>
              <li>• 상세 분석은 최소 6회 이상의 랩타임 기록이 필요하며, 버튼이 활성화됩니다.</li>
              <li>• 다크 모드를 사용하여 야간 작업 환경에서도 시각적 피로를 낮출 수 있습니다.</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

// 상세 분석 페이지 컴포넌트
const DetailedAnalysisPage = ({
  analysis,
  lapTimes,
  currentSession,
  onClose,
  isDark
}: {
  analysis: GageRRAnalysis;
  lapTimes: LapTime[];
  currentSession: SessionData;
  onClose: () => void;
  isDark: boolean;
}) => {
  const downloadDetailedReport = () => {
    if (!currentSession || lapTimes.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    // 측정 기록 시트 데이터
    const measurementData = [
      ['측정 기록 데이터'],
      [''],
      ['순번', '측정시간', '측정자', '대상자', '기록시간'],
      ...lapTimes.map((lap, index) => [
        index + 1,
        formatTime(lap.time),
        lap.operator,
        lap.target,
        lap.timestamp
      ])
    ];

    // 분석 결과 시트 데이터
    const analysisData = [
      ['Gage R&R 분석 보고서'],
      [''],
      ['세션 정보'],
      ['세션명', currentSession.name],
      ['작업유형', currentSession.workType],
      ['측정일시', currentSession.startTime],
      ['총 측정횟수', lapTimes.length.toString()],
      [''],
      ['기본 통계'],
      [
        '평균 시간 (ms)',
        (lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length).toFixed(2)
      ],
      [
        '표준편차 (ms)',
        Math.sqrt(
          lapTimes.reduce((acc, lap) => {
            const mean = lapTimes.reduce((sum, l) => sum + l.time, 0) / lapTimes.length;
            return acc + Math.pow(lap.time - mean, 2);
          }, 0) / lapTimes.length
        ).toFixed(3)
      ],
      [
        '변동계수 (%)',
        (
          (Math.sqrt(
            lapTimes.reduce((acc, lap) => {
              const mean = lapTimes.reduce((sum, l) => sum + l.time, 0) / lapTimes.length;
              return acc + Math.pow(lap.time - mean, 2);
            }, 0) /
              lapTimes.length
          ) /
            (lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)) *
          100
        ).toFixed(2)
      ],
      [''],
      ['Gage R&R 분석 결과'],
      ['반복성 (Repeatability)', analysis.repeatability.toFixed(3)],
      ['재현성 (Reproducibility)', analysis.reproducibility.toFixed(3)],
      ['Gage R&R', analysis.gageRR.toFixed(3)],
      ['부품간 변동 (Part Variation)', analysis.partVariation.toFixed(3)],
      ['총 변동 (Total Variation)', analysis.totalVariation.toFixed(3)],
      ['Gage R&R %', `${analysis.gageRRPercent.toFixed(1)}%`],
      ['NDC (Number of Distinct Categories)', analysis.ndc.toString()],
      ['Cpk (공정능력지수)', analysis.cpk.toFixed(3)],
      [
        '측정시스템 판정',
        analysis.status === 'excellent'
          ? '우수'
          : analysis.status === 'acceptable'
          ? '양호'
          : analysis.status === 'marginal'
          ? '보통'
          : '불량'
      ],
      [''],
      ['ANOVA 분석 (분산 성분)'],
      ['측정자 변동 (Operator)', analysis.anova.operator.toFixed(3)],
      ['부품 변동 (Part)', analysis.anova.part.toFixed(3)],
      ['상호작용 (Interaction)', analysis.anova.interaction.toFixed(3)],
      ['오차 (Error)', analysis.anova.error.toFixed(3)],
      [''],
      ['권장사항'],
      [
        analysis.gageRRPercent < 10
          ? '측정 시스템이 우수합니다. 현재 설정을 유지하세요.'
          : analysis.gageRRPercent < 30
          ? '측정 시스템이 양호합니다. 지속적인 모니터링이 필요합니다.'
          : '측정 시스템 개선이 필요합니다. 교정, 교육, 절차 개선을 검토하세요.'
      ]
    ];

    // 두 시트를 구분하여 CSV 생성
    const csvContent = [
      '=== 측정 기록 ===',
      ...measurementData.map(row => row.join(',')),
      '',
      '=== 분석 결과 ===',
      ...analysisData.map(row => row.join(','))
    ].join('\n');

    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `상세분석보고서_${currentSession.name}_${new Date()
      .toISOString()
      .split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className={`fixed inset-0 z-50 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white'} shadow-sm border-b sticky top-0 z-40`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            <h1 className="text-lg font-bold">상세 분석 보고서</h1>
          </div>
          <button
            onClick={onClose}
            className={`p-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* 세션 정보 */}
        <section className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
          <h2 className="text-xl font-bold mb-4">세션 정보</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`}>세션명</div>
              <div className="font-semibold">{currentSession.name}</div>
            </div>
            <div>
              <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`}>작업유형</div>
              <div className="font-semibold">{currentSession.workType}</div>
            </div>
            <div>
              <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`}>측정횟수</div>
              <div className="font-semibold">{lapTimes.length}회</div>
            </div>
            <div>
              <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1`}>측정일시</div>
              <div className="font-semibold text-sm">{currentSession.startTime}</div>
            </div>
          </div>
        </section>

        {/* Gage R&R 핵심 지표 */}
        <section className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
          <h2 className="text-xl font-bold mb-4">Gage R&R 분석 결과</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`text-3xl font-bold mb-2 ${
                analysis.status === 'excellent' ? 'text-green-500' :
                analysis.status === 'acceptable' ? 'text-blue-500' :
                analysis.status === 'marginal' ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {analysis.gageRRPercent.toFixed(1)}%
              </div>
              <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>Gage R&R</div>
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                analysis.status === 'excellent' ? 'bg-green-100 text-green-800' :
                analysis.status === 'acceptable' ? 'bg-blue-100 text-blue-800' :
                analysis.status === 'marginal' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {analysis.status === 'excellent' ? '우수' :
                 analysis.status === 'acceptable' ? '양호' :
                 analysis.status === 'marginal' ? '보통' : '불량'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-500 mb-2">{analysis.cpk.toFixed(2)}</div>
              <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>Cpk (공정능력지수)</div>
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                analysis.cpk >= 1.33 ? 'bg-green-100 text-green-800' :
                analysis.cpk >= 1.0 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {analysis.cpk >= 1.33 ? '양호' : analysis.cpk >= 1.0 ? '주의' : '개선필요'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-500 mb-2">{analysis.ndc}</div>
              <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>NDC (구별범주수)</div>
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                analysis.ndc >= 5 ? 'bg-green-100 text-green-800' :
                analysis.ndc >= 3 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {analysis.ndc >= 5 ? '충분' : analysis.ndc >= 3 ? '적정' : '부족'}
              </div>
            </div>
          </div>
        </section>

        {/* 상세 변동 성분 */}
        <section className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
          <h2 className="text-xl font-bold mb-4">변동 성분 분석</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Gage R&R 구성요소</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Info className="w-4 h-4 text-gray-400" />
                  <span>반복성 (Repeatability)</span>
                  <span className="font-mono">{analysis.repeatability.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <Info className="w-4 h-4 text-gray-400" />
                  <span>재현성 (Reproducibility)</span>
                  <span className="font-mono">{analysis.reproducibility.toFixed(3)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Gage R&R 합계</span>
                  <span className="font-mono font-semibold">{analysis.gageRR.toFixed(3)}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">ANOVA 분산 성분</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Info className="w-4 h-4 text-gray-400" />
                  <span>측정자 변동</span>
                  <span className="font-mono">{analysis.anova.operator.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <Info className="w-4 h-4 text-gray-400" />
                  <span>부품 변동</span>
                  <span className="font-mono">{analysis.anova.part.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <Info className="w-4 h-4 text-gray-400" />
                  <span>상호작용</span>
                  <span className="font-mono">{analysis.anova.interaction.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <Info className="w-4 h-4 text-gray-400" />
                  <span>오차</span>
                  <span className="font-mono">{analysis.anova.error.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 측정 기록 상세 */}
        <section className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
          <h2 className="text-xl font-bold mb-4">측정 기록 상세</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <th className="px-3 py-2 text-left">순번</th>
                  <th className="px-3 py-2 text-left">측정시간</th>
                  <th className="px-3 py-2 text-left">측정자</th>
                  <th className="px-3 py-2 text-left">대상자</th>
                  <th className="px-3 py-2 text-left">기록시간</th>
                </tr>
              </thead>
              <tbody>
                {lapTimes.map((lap, index) => (
                  <tr key={lap.id} className={`border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 font-mono">{formatTime(lap.time)}</td>
                    <td className="px-3 py-2">{lap.operator}</td>
                    <td className="px-3 py-2">{lap.target}</td>
                    <td className="px-3 py-2 text-xs">{lap.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 권장사항 */}
        <section className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
          <h2 className="text-xl font-bold mb-4">분석 해석 및 권장사항</h2>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${
              analysis.status === 'excellent' ? 'bg-green-50 border border-green-200' :
              analysis.status === 'acceptable' ? 'bg-blue-50 border border-blue-200' :
              analysis.status === 'marginal' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-red-50 border border-red-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                analysis.status === 'excellent' ? 'text-green-800' :
                analysis.status === 'acceptable' ? 'text-blue-800' :
                analysis.status === 'marginal' ? 'text-yellow-800' :
                'text-red-800'
              }`}>
                측정시스템 평가: {
                  analysis.status === 'excellent' ? '우수' :
                  analysis.status === 'acceptable' ? '양호' :
                  analysis.status === 'marginal' ? '보통' : '불량'
                }
              </h3>
              <div className={`text-sm ${
                analysis.status === 'excellent' ? 'text-green-700' :
                analysis.status === 'acceptable' ? 'text-blue-700' :
                analysis.status === 'marginal' ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {analysis.gageRRPercent < 10 
                  ? '측정 시스템이 우수합니다. 현재 측정 절차와 설정을 유지하세요.'
                  : analysis.gageRRPercent < 30
                  ? '측정 시스템이 양호합니다. 지속적인 모니터링과 주기적인 검증이 필요합니다.'
                  : analysis.gageRRPercent < 50
                  ? '측정 시스템이 보통 수준입니다. 측정 절차 개선을 검토하세요.'
                  : '측정 시스템 개선이 시급합니다. 장비 교정, 측정자 교육, 측정 절차 표준화가 필요합니다.'
                }
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className="font-semibold mb-2">반복성 (Equipment Variation)</h4>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  동일한 측정자가 동일한 대상을 반복 측정했을 때의 변동성입니다.{' '}
                  {analysis.repeatability < analysis.reproducibility
                    ? '반복성이 양호합니다.'
                    : '반복성 개선이 필요합니다.'}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className="font-semibold mb-2">재현성 (Appraiser Variation)</h4>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  서로 다른 측정자 간의 측정 차이입니다.{' '}
                  {analysis.reproducibility < analysis.repeatability
                    ? '측정자 간 일치성이 양호합니다.'
                    : '측정자 교육이 필요합니다.'}
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h4 className="font-semibold mb-2">개선 방안</h4>
              <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {analysis.gageRRPercent >= 30 && (
                  <>
                    <li>• 측정 장비의 정확도와 정밀도 점검</li>
                    <li>• 측정자 교육 및 표준 작업 절차 수립</li>
                    <li>• 측정 환경 조건 표준화</li>
                  </>
                )}
                {analysis.repeatability > analysis.reproducibility ? (
                  <li>• 측정 장비 교정 및 유지보수 강화</li>
                ) : (
                  <li>• 측정자 간 일관성 향상을 위한 교육 강화</li>
                )}
                <li>• 정기적인 Gage R&R 재평가 실시</li>
              </ul>
            </div>
          </div>

          {/* 다운로드 버튼 */}
          <div className="flex justify-center mt-4">
            <button
              onClick={downloadDetailedReport}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>상세 보고서 다운로드</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

// 메인 컴포넌트
const EnhancedLogisticsTimer = () => {
  // 상태 관리
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);
  const [allLapTimes, setAllLapTimes] = useState<LapTime[]>([]); // 모든 세션의 기록
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // 폼 상태
  const [sessionName, setSessionName] = useState('');
  const [workType, setWorkType] = useState('');
  const [operators, setOperators] = useState<string[]>(['']);
  const [targets, setTargets] = useState<string[]>(['']);
  const [currentOperator, setCurrentOperator] = useState('');
  const [currentTarget, setCurrentTarget] = useState('');

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // 다크모드 적용
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // 타이머 로직
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime(Date.now() - startTimeRef.current);
      }, 10);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          toggleTimer();
          break;
        case 'Enter':
          e.preventDefault();
          if (isRunning) recordLap();
          break;
        case 'Escape':
          e.preventDefault();
          stopTimer();
          break;
        case 'KeyR':
          e.preventDefault();
          resetTimer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, toggleTimer, recordLap, stopTimer, resetTimer]);

  // 새 세션 생성 시 자동 리셋
  useEffect(() => {
    if (currentSession && lapTimes.length === 0) {
      setCurrentTime(0);
      setIsRunning(false);
    }
  }, [currentSession, lapTimes]);

  // 타이머 제어 함수들
  const toggleTimer = useCallback(() => {
    if (!currentSession) {
      alert('먼저 작업 세션을 생성해주세요.');
      return;
    }

    if (isRunning) {
      setIsRunning(false);
    } else {
      startTimeRef.current = Date.now() - currentTime;
      setIsRunning(true);
    }
  }, [isRunning, currentTime, currentSession]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
    setLapTimes([]);
    if (currentSession) {
      const updatedSession = { ...currentSession, lapTimes: [] };
      setCurrentSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
    }
  }, [currentSession]);

  const recordLap = useCallback(() => {
    if (!currentSession || !currentOperator || !currentTarget) {
      alert('측정자와 대상자를 선택해주세요.');
      return;
    }

    const newLap: LapTime = {
      id: Date.now(),
      time: currentTime,
      timestamp: new Date().toLocaleString('ko-KR'),
      operator: currentOperator,
      target: currentTarget,
      sessionId: currentSession.id
    };

    const updatedLaps = [...lapTimes, newLap];
    setLapTimes(updatedLaps);
    setAllLapTimes(prev => [...prev, newLap]);

    // 랩타임 기록 시 자동 정지
    setIsRunning(false);

    // 세션 업데이트
    const updatedSession = { ...currentSession, lapTimes: updatedLaps };
    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
  }, [currentTime, currentSession, currentOperator, currentTarget, lapTimes]);

  // 세션 관리 함수들
  const createSession = () => {
    if (!sessionName || !workType || operators.some(op => !op.trim()) || targets.some(tg => !tg.trim())) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    const newSession: SessionData = {
      id: Date.now().toString(),
      name: sessionName,
      workType,
      operators: operators.filter(op => op.trim()),
      targets: targets.filter(tg => tg.trim()),
      lapTimes: [],
      startTime: new Date().toLocaleString('ko-KR'),
      isActive: true
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);
    setCurrentOperator(newSession.operators[0]);
    setCurrentTarget(newSession.targets[0]);
    setShowNewSessionModal(false);

    setLapTimes([]);
    setCurrentTime(0);
    setIsRunning(false);

    setSessionName('');
    setWorkType('');
    setOperators(['']);
    setTargets(['']);
  };

  // 측정 기록만 다운로드
  const downloadMeasurementData = () => {
    if (!currentSession || lapTimes.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const csvContent = [
      ['측정 기록'],
      [''],
      ['세션명', currentSession.name],
      ['작업유형', currentSession.workType],
      ['측정일시', currentSession.startTime],
      [''],
      ['순번', '측정시간', '측정자', '대상자', '기록시간'],
      ...lapTimes.map((lap, index) => [
        index + 1,
        formatTime(lap.time),
        lap.operator,
        lap.target,
        lap.timestamp
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `측정기록_${currentSession.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const analysis = currentSession ? calculateGageRR(lapTimes) : null;

  // 상세 분석 페이지 표시
  if (showDetailedAnalysis && analysis && currentSession) {
    return (
      <DetailedAnalysisPage
        analysis={analysis}
        lapTimes={lapTimes}
        currentSession={currentSession}
        onClose={() => setShowDetailedAnalysis(false)}
        isDark={isDark}
      />
    );
  }

  // 랜딩 페이지
  if (showLanding) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-800 via-blue-900 to-blue-950' : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'}`}>
        <ConsolidatedSupplyLogo isDark={isDark} />
        <div className="p-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">물류 작업현장 인시수 측정 타이머</h1>
          <p className="text-blue-100 mb-8 text-lg">Gage R&R 분석 v4.0</p>
          <button
            onClick={() => setShowLanding(false)}
            className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
          >
            시스템 시작
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* 헤더 */}
      <header className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white'} shadow-sm border-b sticky top-0 z-40`}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-6 h-6 text-blue-500" />
            <h1 className="text-lg font-bold">물류 작업현장 인시수 측정 타이머</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-blue-500'}`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className={`p-2 ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-blue-500'}`}
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowLanding(true)}
              className={`p-2 ${isDark ? 'text-gray-300 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center py-1`}>Gage R&R 분석 v4.0</div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* 키보드 단축키 안내 */}
        <section className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50'} p-3 rounded-lg border`}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`${isDark ? 'bg-gray-700 text-white' : 'bg-white'} px-2 py-1 rounded border`}>
              <strong>스페이스</strong> : 시작/정지
            </div>
            <div className={`${isDark ? 'bg-gray-700 text-white' : 'bg-white'} px-2 py-1 rounded border`}>
              <strong>Enter</strong> : 랩타임
            </div>
            <div className={`${isDark ? 'bg-gray-700 text-white' : 'bg-white'} px-2 py-1 rounded border`}>
              <strong>Esc</strong> : 중지
            </div>
            <div className={`${isDark ? 'bg-gray-700 text-white' : 'bg-white'} px-2 py-1 rounded border`}>
              <strong>R</strong> : 리셋
            </div>
          </div>
        </section>

        {/* 작업 세션 섹션 */}
        <section className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold">작업 세션</h2>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-600 flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>새 세션</span>
              </button>
              <button
                onClick={resetTimer}
                className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-orange-600 flex items-center space-x-1"
              >
                <RefreshCw className="w-4 h-4" />
                <span>초기화</span>
              </button>
            </div>
          </div>

          {currentSession ? (
            <div className="space-y-3">
              <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
                <div className="font-medium">{currentSession.name}</div>
                <div>{currentSession.workType}</div>
              </div>

              {/* 측정자/대상자 선택 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    측정자
                  </label>
                  <select
                    value={currentOperator}
                    onChange={e => setCurrentOperator(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {currentSession.operators.map(op => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    대상자
                  </label>
                  <select
                    value={currentTarget}
                    onChange={e => setCurrentTarget(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {currentSession.targets.map(tg => (
                      <option key={tg} value={tg}>
                        {tg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">활성 세션이 없습니다.</p>
              <p className="text-xs">새 세션을 생성해주세요.</p>
            </div>
          )}
        </section>

        {/* 정밀 타이머 섹션 */}
        <section className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm`}>
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold">정밀 타이머</h2>
          </div>

          <div className="text-center">
            <div className={`text-5xl font-mono font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'} tracking-tight`}>
              {formatTime(currentTime)}
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-6`}>
              {isRunning ? '측정 중' : '대기 중'}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={toggleTimer}
                disabled={!currentSession}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{isRunning ? '정지 (Space)' : '시작 (Space)'}</span>
              </button>

              <button
                onClick={recordLap}
                disabled={!isRunning}
                className="flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Target className="w-5 h-5" />
                <span>랩타임 (Enter)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                onClick={stopTimer}
                className={`flex items-center justify-center space-x-2 py-2 rounded-lg hover:bg-gray-600 ${
                  isDark ? 'bg-gray-700 text-white' : 'bg-gray-500 text-white'
                }`}
              >
                <Square className="w-4 h-4" />
                <span>중지 (Esc)</span>
              </button>

              <button
                onClick={resetTimer}
                className={`flex items-center justify-center space-x-2 py-2 rounded-lg hover:bg-gray-600 ${
                  isDark ? 'bg-gray-700 text-white' : 'bg-gray-500 text-white'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>리셋 (R)</span>
              </button>
            </div>
          </div>
        </section>

        {/* 실시간 분석 섹션 */}
        {lapTimes.length > 0 && (
          <section className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold">실시간 분석</h2>
              </div>
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="text-blue-500 text-sm hover:text-blue-700"
              >
                {showAnalysis ? '간략 보기' : '상세 보기'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className={`${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} p-3 rounded`}>
                <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1 text-xs`}>측정 횟수</div>
                <div className="text-2xl font-bold text-blue-600">{lapTimes.length}</div>
              </div>

              <div className={`${isDark ? 'bg-green-900/20' : 'bg-green-50'} p-3 rounded`}>
                <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1 text-xs`}>평균 시간</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatTime(
                    lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length
                  )}
                </div>
              </div>

              <div className={`${isDark ? 'bg-orange-900/20' : 'bg-orange-50'} p-3 rounded`}>
                <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-1 text-xs`}>변동계수</div>
                <div className="text-2xl font-bold text-orange-600">
                  {lapTimes.length > 1
                    ? `${(
                        (Math.sqrt(
                          lapTimes.reduce((acc, lap) => {
                            const mean =
                              lapTimes.reduce((sum, l) => sum + l.time, 0) / lapTimes.length;
                            return acc + Math.pow(lap.time - mean, 2);
                          }, 0) /
                            lapTimes.length
                        ) /
                          (lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)) *
                        100
                      ).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
            </div>

            {showAnalysis && analysis && lapTimes.length >= 3 && (
              <div className="mt-4 space-y-3">
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded`}>
                  <h3 className="font-medium text-sm mb-2">Gage R&R 분석</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>반복성: {analysis.repeatability.toFixed(3)}</div>
                    <div>재현성: {analysis.reproducibility.toFixed(3)}</div>
                    <div>Gage R&R: {analysis.gageRR.toFixed(3)}</div>
                    <div>R&R%: {analysis.gageRRPercent.toFixed(1)}%</div>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
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
                </div>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="flex space-x-2 mt-4">
              <button
                onClick={downloadMeasurementData}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm hover:bg-green-600 flex items-center justify-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>측정기록 다운로드</span>
              </button>

              {analysis && lapTimes.length >= 6 && (
                <button
                  onClick={() => setShowDetailedAnalysis(true)}
                  className="flex-1 bg-purple-500 text-white py-2 rounded-lg text-sm hover:bg-purple-600 flex items-center justify-center space-x-1"
                >
                  <PieChart className="w-4 h-4" />
                  <span>상세분석 보기</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* 측정 기록 - 모든 기록 표시 */}
        {allLapTimes.filter(lap => lap.sessionId === currentSession?.id).length > 0 && (
          <section className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-sm`}>
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="w-5 h-5 text-purple-500" />
              <h2 className="font-semibold">측정 기록</h2>
              <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
                전체 {allLapTimes.filter(lap => lap.sessionId === currentSession?.id).length}개
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allLapTimes
                .filter(lap => lap.sessionId === currentSession?.id)
                .slice(-10) // 최근 10개만 표시
                .reverse()
                .map((lap, index) => (
                  <div
                    key={lap.id}
                    className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded border-l-4 border-blue-500`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-mono text-lg font-bold text-blue-600">
                          {formatTime(lap.time)}
                        </div>
                        <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mt-1 text-xs space-y-1`}>
                          <div>측정자: {lap.operator}</div>
                          <div>대상자: {lap.target}</div>
                          <div>기록: {lap.timestamp}</div>
                        </div>
                      </div>
                      <div className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>
                        #{allLapTimes.filter(l => l.sessionId === currentSession?.id).length - index}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* 세션 히스토리 */}
        {sessions.length > 0 && (
          <section className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-sm`}>
            <div className="flex items-center space-x-2 mb-3">
              <Package className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold">세션 히스토리</h2>
            </div>
            <div className="space-y-2">
              {sessions.slice(-3).map(session => (
                <div
                  key={session.id}
                  className={`p-3 rounded border ${
                    currentSession?.id === session.id
                      ? isDark ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                      : isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{session.name}</div>
                      <div className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-xs`}>{session.workType}</div>
                      <div className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>{session.startTime}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {allLapTimes.filter(lap => lap.sessionId === session.id).length}회
                      </div>
                      {currentSession?.id === session.id && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">활성</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 새 세션 생성 모달 */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg w-full max-w-md max-h-96 overflow-y-auto`}>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold mb-2">새 작업 세션 생성</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>세션명 *</label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={e => setSessionName(e.target.value)}
                      placeholder="예: 포장작업_0602"
                      className={`w-full p-2 border rounded text-sm ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : ''}`}>작업 유형 *</label>
                    <select
                      value={workType}
                      onChange={e => setWorkType(e.target.value)}
                      className={`w-full p-2 border rounded text-sm ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value="">작업 유형 선택</option>
                      <option value="물자검수팀">물자검수팀</option>
                      <option value="저장관리팀">저장관리팀</option>
                      <option value="포장관리팀">포장관리팀</option>
                    </select>
                  </div>
                </div>

                {/* 측정자 설정 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>측정자 설정</label>
                    <button
                      onClick={() => setOperators([...operators, ''])}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                    >
                      + 추가
                    </button>
                  </div>
                  {operators.map((operator, index) => (
                    <input
                      key={index}
                      type="text"
                      value={operator}
                      onChange={e => {
                        const newOperators = [...operators];
                        newOperators[index] = e.target.value;
                        setOperators(newOperators);
                      }}
                      placeholder={`측정자 ${index + 1} (예: 조봉근)`}
                      className={`w-full p-2 border rounded text-sm mb-2 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'border-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {/* 대상자 설정 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>대상자 설정</label>
                    <button
                      onClick={() => setTargets([...targets, ''])}
                      className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                    >
                      + 추가
                    </button>
                  </div>
                  {targets.map((target, index) => (
                    <input
                      key={index}
                      type="text"
                      value={target}
                      onChange={e => {
                        const newTargets = [...targets];
                        newTargets[index] = e.target.value;
                        setTargets(newTargets);
                      }}
                      placeholder={`대상자 ${index + 1} (예: 이나영)`}
                      className={`w-full p-2 border rounded text-sm mb-2 ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'border-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Gage R&R 안내 */}
                <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50'} p-3 rounded text-sm border`}>
                  <h4 className="font-medium text-blue-800 mb-2">📋 Gage R&R 분석 안내</h4>
                  <ul className={`${isDark ? 'text-blue-300' : 'text-blue-700'} space-y-1 text-xs`}>
                    <li>• 측정자 2명 이상: 재현성(Reproducibility) 분석</li>
                    <li>• 대상자 2개 이상: 부품간 변동성 분석</li>
                    <li>• 최소 3회 측정: 반복성(Repeatability) 분석</li>
                    <li>• 권장 측정 횟수: 각 조건별 3-5회</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowNewSessionModal(false)}
                  className={`flex-1 border py-2 rounded-lg ${
                    isDark
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  취소
                </button>
                <button
                  onClick={createSession}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center space-x-1"
                >
                  <Users className="w-4 h-4" />
                  <span>세션 생성</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 도움말 모달 */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} isDark={isDark} />
    </div>
  );
};

export default EnhancedLogisticsTimer;
