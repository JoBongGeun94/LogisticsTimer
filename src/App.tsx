import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Play, Pause, Square, Download, Plus, Users,
  Package, Clock, BarChart3, FileText, Calculator,
  Zap, Target, RefreshCw, LogOut,
  Moon, Sun, PieChart, Info, CheckCircle,
  AlertCircle, XCircle, Timer, Activity,
  Trash2, Filter, X, Minus, AlertTriangle
} from 'lucide-react';

// 타입 및 서비스 import
import {
  LapTime,
  SessionData,
  Theme,
  ToastProps,
  FilterOptions
} from './types';
import { HelpModal } from './components/UI/Modal/HelpModal';
import { THEME_COLORS, STATUS_COLORS } from './constants/themes';
import { WORK_TYPES } from './constants/workTypes';
import { ValidationService } from './services/ValidationService';
import { AnalysisService } from './services/AnalysisService';
import { ExportService } from './services/ExportService';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTimerLogic } from './hooks/useTimerLogic';
import { useStatisticsAnalysis } from './hooks/useStatisticsAnalysis';
import { useSessionManager } from './hooks/useSessionManager';

// 테마 상수들이 별도 파일로 분리됨

// ==================== 유틸리티 훅 ====================
const useBackButtonPrevention = () => {
  const [backPressCount, setBackPressCount] = useState(0);
  const [showBackWarning, setShowBackWarning] = useState(false);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      if (backPressCount === 0) {
        setBackPressCount(1);
        setShowBackWarning(true);
        window.history.pushState(null, '', window.location.href);
        setTimeout(() => {
          setBackPressCount(0);
          setShowBackWarning(false);
        }, 2000);
      } else {
        window.history.back();
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [backPressCount]);

  return { showBackWarning };
};

// ==================== UI 컴포넌트들 (Single Responsibility) ====================

// 토스트 컴포넌트
const Toast = memo<ToastProps>(({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const typeConfig = {
    success: { style: 'bg-green-500 text-white', icon: CheckCircle },
    error: { style: 'bg-red-500 text-white', icon: XCircle },
    warning: { style: 'bg-yellow-500 text-white', icon: AlertCircle },
    info: { style: 'bg-blue-500 text-white', icon: Info }
  };

  const { style, icon: Icon } = typeConfig[type];

  return (
    <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-right duration-300">
      <div className={`${style} px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

// 뒤로가기 경고 컴포넌트
const BackWarning = memo<{ isVisible: boolean }>(({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[70] animate-in slide-in-from-bottom duration-300">
      <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">한 번 더 뒤로가기 하면 종료됩니다</span>
      </div>
    </div>
  );
});

// 상태 배지 컴포넌트
const StatusBadge = memo<{
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  size?: 'sm' | 'md' | 'lg';
  isDark: boolean;
}>(({ status, size = 'md', isDark }) => {
  const config = useMemo(() => {
    const statusMap = {
      excellent: { icon: CheckCircle, text: '우수' },
      acceptable: { icon: CheckCircle, text: '양호' },
      marginal: { icon: AlertCircle, text: '보통' },
      unacceptable: { icon: XCircle, text: '불량' }
    };

    return statusMap[status];
  }, [status]);

  const colors = STATUS_COLORS[status][isDark ? 'dark' : 'light'];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses[size]} ${colors.bg} ${colors.text} ${colors.border}`}>
      <Icon className={iconSizes[size]} />
      {config.text}
    </span>
  );
});

// 로고 컴포넌트
const ConsolidatedSupplyLogo = memo<{ isDark?: boolean; size?: 'sm' | 'md' | 'lg' }>(({ isDark = false, size = 'lg' }) => {
  const sizeConfig = {
    sm: { container: 'w-16 h-16' },
    md: { container: 'w-24 h-24' },
    lg: { container: 'w-64 h-64' }
  };

  const { container } = sizeConfig[size];

  return (
    <div className={`flex items-center justify-center ${container} mx-auto mb-6`}>
      <img
        src="/logo-rokaf-supply.png"
        alt="ROKAF Consolidated Supply Depot 로고"
        className="w-full h-full object-contain"
        style={{
          filter: isDark ? 'brightness(1.1)' : 'none'
        }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent && !parent.querySelector('.logo-fallback')) {
            const fallback = document.createElement('div');
            fallback.className = 'logo-fallback flex items-center justify-center w-full h-full bg-blue-600 text-white rounded-full text-sm font-bold';
            fallback.textContent = '종합보급창';
            parent.appendChild(fallback);
          }
        }}
      />
    </div>
  );
});

// 랜딩 페이지 (소개 화면 첫번째 - 요구사항 1번)
const ModernLandingPage = memo<{
  isDark: boolean;
  onStart: () => void;
}>(({ isDark, onStart }) => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* 고급스러운 배경 효과 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 via-purple-500/15 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-80 h-80 bg-gradient-to-tr from-indigo-400/15 via-blue-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-full blur-2xl animate-bounce"></div>
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-gradient-to-l from-purple-400/10 to-indigo-500/10 rounded-full blur-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-6 text-center pt-20">
        {/* 로고 섹션 */}
        <div className="transform hover:scale-105 transition-transform duration-300 mb-16 mt-16">
          <ConsolidatedSupplyLogo isDark={isDark} size="lg" />
        </div>

        {/* 타이틀 섹션 */}
        <div className="mb-20 space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
            물류 작업현장<br />
            인시수 측정 타이머
          </h2>
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border border-white/20 shadow-2xl">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
            <span className="text-blue-100 text-sm font-medium tracking-wide">
              측정, 기록, 저장, 분석을 동시에
            </span>
          </div>
        </div>

        {/* 기능 하이라이트 */}
        <div className="mb-20 grid grid-cols-1 gap-6 w-full max-w-sm">
          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
            <div className="relative flex items-center space-x-4 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="text-white font-semibold text-base">정밀 측정</div>
                <div className="text-blue-200 text-sm">소수점 단위 정확한 측정</div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
            <div className="relative flex items-center space-x-4 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="text-white font-semibold text-base">실시간 분석</div>
                <div className="text-blue-200 text-sm">각종 통계도구 활용 및 결과 제공</div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
            <div className="relative flex items-center space-x-4 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="text-white font-semibold text-base">분석결과 Excel 다운로드</div>
                <div className="text-blue-200 text-sm">RAW DATA 내려받기 기능 제공</div>
              </div>
            </div>
          </div>
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={onStart}
          className="group relative overflow-hidden px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white via-blue-50 to-white rounded-2xl"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span className="relative z-10 group-hover:text-white transition-colors duration-300 flex items-center space-x-3 text-slate-800">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
              <Play className="w-4 h-4 text-white" />
            </div>
            <span>시스템 시작</span>
          </span>
          <div className="absolute inset-0 rounded-2xl border-2 border-white/20 group-hover:border-white/40 transition-colors duration-300"></div>
        </button>

        {/* 하단 상태 정보 */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-3 px-6 py-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-blue-200 text-sm font-medium">시스템 준비 완료</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// 측정 카드 컴포넌트
const MeasurementCard = memo<{
  title: string;
  value: string | number;
  unit?: string;
  icon: React.FC<any>;
  status?: 'success' | 'warning' | 'error' | 'info';
  theme: Theme;
  size?: 'sm' | 'md' | 'lg';
  isDark: boolean;
}>(({ title, value, unit, icon: Icon, status = 'info', theme, size = 'md', isDark }) => {
  const statusColors = useMemo(() => ({
    success: isDark
      ? { bg: 'bg-green-900/30', border: 'border-green-700', icon: 'text-green-400', text: 'text-green-300' }
      : { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', text: 'text-green-800' },
    warning: isDark
      ? { bg: 'bg-yellow-900/30', border: 'border-yellow-700', icon: 'text-yellow-400', text: 'text-yellow-300' }
      : { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', text: 'text-yellow-800' },
    error: isDark
      ? { bg: 'bg-red-900/30', border: 'border-red-700', icon: 'text-red-400', text: 'text-red-300' }
      : { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', text: 'text-red-800' },
    info: isDark
      ? { bg: 'bg-blue-900/30', border: 'border-blue-700', icon: 'text-blue-400', text: 'text-blue-300' }
      : { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', text: 'text-blue-800' }
  }), [isDark]);

  const sizes = {
    sm: { card: 'p-3', icon: 'w-4 h-4', title: 'text-xs', value: 'text-sm' },
    md: { card: 'p-4', icon: 'w-5 h-5', title: 'text-sm', value: 'text-base' },
    lg: { card: 'p-6', icon: 'w-6 h-6', title: 'text-base', value: 'text-xl' }
  };

  const colors = statusColors[status];

  return (
    <div className={`${sizes[size].card} rounded-xl border transition-all duration-200 ${colors.bg} ${colors.border} hover:shadow-lg hover:scale-105`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`${sizes[size].icon} ${colors.icon}`} />
      </div>
      <div className={`${sizes[size].title} font-medium ${theme.textMuted} mb-1 line-clamp-1`}>
        {title}
      </div>
      <div className={`${sizes[size].value} font-bold ${colors.text} font-mono break-all`}>
        {value}{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
});

// 분석 불가 메시지 컴포넌트
const AnalysisUnavailableMessage = memo<{
  theme: Theme;
  isDark: boolean;
  message: string;
}>(({ theme, isDark, message }) => {
  return (
    <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
      <div className="text-center py-6">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-yellow-900/30' : 'bg-yellow-50'
          }`}>
          <AlertCircle className={`w-8 h-8 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
        </div>
        <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>
          Gage R&R 분석 불가
        </h3>
        <p className={`text-sm ${theme.textMuted} leading-relaxed max-w-sm mx-auto`}>
          {message}
        </p>
        <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
          <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            💡 기본 측정 및 기록 기능은 정상적으로 사용 가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
});

// 🔧 상세분석 모달 컴포넌트 (성능 최적화 적용)
const DetailedAnalysisModal = memo<{
  isVisible: boolean;
  onClose: () => void;
  analysis: any;
  theme: Theme;
  isDark: boolean;
  statisticsAnalysis: any;
}>(({ isVisible, onClose, analysis, theme, isDark, statisticsAnalysis }) => {
  // 성능 최적화: 분석 데이터 메모이제이션
  const memoizedAnalysis = useMemo(() => {
    if (!analysis || !statisticsAnalysis) return null;
    return {
      ...analysis,
      iccValue: statisticsAnalysis.iccValue,
      deltaPairValue: statisticsAnalysis.deltaPairValue,
      gaugeData: statisticsAnalysis.gaugeData
    };
  }, [analysis, statisticsAnalysis.iccValue, statisticsAnalysis.deltaPairValue, statisticsAnalysis.gaugeData]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${theme.card} rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border ${theme.border}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-xl font-bold ${theme.text}`}>🔍 상세분석 결과</h3>
            <button
              onClick={onClose}
              className={`${theme.textMuted} hover:${theme.textSecondary} transition-colors p-1`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 종합 평가 */}
            {analysis && (
              <div className={`${theme.surface} p-4 rounded-lg border ${theme.border}`}>
                <h4 className={`font-semibold ${theme.text} mb-3`}>📊 종합 평가</h4>
                <div className="flex items-center justify-center">
                  <StatusBadge status={analysis.status} size="lg" isDark={isDark} />
                </div>
              </div>
            )}

            {/* 🔧 핵심 지표 - 메모이제이션된 분석 데이터 사용 */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`${theme.surface} p-4 rounded-lg border ${theme.border}`}>
                <h5 className={`font-medium ${theme.textSecondary} mb-2`}>Gage R&R</h5>
                <div className={`text-2xl font-bold ${theme.text}`}>
                  {memoizedAnalysis?.gaugeData ? 
                    `${memoizedAnalysis.gaugeData.grr.toFixed(1)}%` : 
                    (memoizedAnalysis ? `${memoizedAnalysis.gageRRPercent.toFixed(1)}%` : '0.0%')
                  }
                </div>
              </div>
              <div className={`${theme.surface} p-4 rounded-lg border ${theme.border}`}>
                <h5 className={`font-medium ${theme.textSecondary} mb-2`}>ICC (2,1)</h5>
                <div className={`text-2xl font-bold ${theme.text}`}>{memoizedAnalysis?.iccValue.toFixed(3) || '0.000'}</div>
              </div>
              <div className={`${theme.surface} p-4 rounded-lg border ${theme.border}`}>
                <h5 className={`font-medium ${theme.textSecondary} mb-2`}>ΔPair</h5>
                <div className={`text-2xl font-bold ${theme.text}`}>{memoizedAnalysis?.deltaPairValue.toFixed(3) || '0.000'}s</div>
              </div>
              <div className={`${theme.surface} p-4 rounded-lg border ${theme.border}`}>
                <h5 className={`font-medium ${theme.textSecondary} mb-2`}>변동계수</h5>
                <div className={`text-2xl font-bold ${theme.text}`}>
                  {memoizedAnalysis?.gaugeData ? 
                    `${memoizedAnalysis.gaugeData.cv.toFixed(1)}%` : '0.0%'
                  }
                </div>
              </div>
            </div>

            {/* 🔧 분산 구성요소 - 메모이제이션된 데이터 사용 */}
            {memoizedAnalysis && (
              <div className={`${theme.surface} p-4 rounded-lg border ${theme.border}`}>
                <h4 className={`font-semibold ${theme.text} mb-3`}>🔬 분산 구성요소</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>반복성 (Repeatability)</span>
                    <span className={theme.text}>
                      {memoizedAnalysis.gaugeData ? 
                        memoizedAnalysis.gaugeData.repeatability.toFixed(4) : 
                        (memoizedAnalysis.repeatability?.toFixed(4) || '0.0000')
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>재현성 (Reproducibility)</span>
                    <span className={theme.text}>
                      {memoizedAnalysis.gaugeData ? 
                        memoizedAnalysis.gaugeData.reproducibility.toFixed(4) : 
                        (memoizedAnalysis.reproducibility?.toFixed(4) || '0.0000')
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>대상자 변동 (Part Variation)</span>
                    <span className={theme.text}>
                      {memoizedAnalysis.gaugeData ? 
                        memoizedAnalysis.gaugeData.partVariation.toFixed(4) : 
                        (memoizedAnalysis.partVariation?.toFixed(4) || '0.0000')
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>총 변동 (Total Variation)</span>
                    <span className={theme.text}>
                      {memoizedAnalysis.gaugeData ? 
                        memoizedAnalysis.gaugeData.totalVariation.toFixed(4) : 
                        (memoizedAnalysis.totalVariation?.toFixed(4) || '0.0000')
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 작업시간 분석 지표 - 메모이제이션된 데이터 사용 */}
            {memoizedAnalysis && memoizedAnalysis.gaugeData && (
              <div className={`${theme.surface} p-4 rounded-lg border ${theme.border}`}>
                <h4 className={`font-semibold ${theme.text} mb-3`}>⏱️ 작업시간 분석</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>급내상관계수 (ICC)</span>
                    <span className={theme.text}>{memoizedAnalysis.iccValue.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>변동계수 (CV)</span>
                    <span className={theme.text}>
                      {memoizedAnalysis.gaugeData ? 
                        `${memoizedAnalysis.gaugeData.cv.toFixed(1)}%` : '0.0%'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>99% 달성시간 (Q99)</span>
                    <span className={theme.text}>{(memoizedAnalysis.gaugeData.q99 / 1000).toFixed(2)}초</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme.textSecondary}>표준시간 설정 가능</span>
                    <span className={`font-medium ${memoizedAnalysis.gaugeData.isReliableForStandard ? 'text-green-600' : 'text-red-600'}`}>
                      {memoizedAnalysis.gaugeData.isReliableForStandard ? '✅ 가능' : '❌ 불가'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 해석 및 권장사항 */}
            <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg border`}>
              <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">💡 해석 및 권장사항</h4>
              <div className={`${isDark ? 'text-blue-300' : 'text-blue-700'} space-y-1 text-sm`}>
                {analysis ? (
                  <>
                    {analysis.status === 'excellent' && (
                      <>
                        <div>✅ 우수한 측정 시스템입니다</div>
                        <div>• 모든 측정에 신뢰할 수 있습니다</div>
                        <div>• 현재 측정 절차를 유지하세요</div>
                      </>
                    )}
                    {analysis.status === 'acceptable' && (
                      <>
                        <div>👍 양호한 측정 시스템입니다</div>
                        <div>• 대부분의 용도로 사용 가능합니다</div>
                        <div>• 정기적인 교정을 권장합니다</div>
                      </>
                    )}
                    {analysis.status === 'marginal' && (
                      <>
                        <div>⚠️ 제한적 사용을 권장합니다</div>
                        <div>• 측정 절차 개선이 필요합니다</div>
                        <div>• 교육 및 장비 점검을 고려하세요</div>
                      </>
                    )}
                    {analysis.status === 'unacceptable' && (
                      <>
                        <div>❌ 측정 시스템 개선이 필요합니다</div>
                        <div>• 즉시 개선 조치가 필요합니다</div>
                        <div>• 장비 교체나 절차 전면 개선을 고려하세요</div>
                      </>
                    )}
                  </>
                ) : (
                  <div>기본 통계 분석을 통해 측정 시스템의 일관성을 평가하고 있습니다.</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// 메인 애플리케이션
const EnhancedLogisticsTimer = () => {
  // 기본 다크모드로 설정 (요구사항 3번)
  const [isDark, setIsDark] = useState(true);
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);

  // 수정된 useLocalStorage 사용 (무한 렌더링 방지)
  const [allLapTimes, setAllLapTimes] = useLocalStorage<LapTime[]>('logisticsTimer_allLapTimes', []);

  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showLanding, setShowLanding] = useState(true); // 소개 화면 첫번째 (요구사항 1번)
  const [selectedSessionHistory, setSelectedSessionHistory] = useState<SessionData | null>(null);

  // 🔧 상세분석 모달 상태 (최소 변경 - 새로 추가)
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  
  // 도움말 모달 상태
  const [showHelpModal, setShowHelpModal] = useState(false);

  // 토스트 상태
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'info',
    isVisible: false
  });

  // 필터 상태 (요구사항 8번)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    operator: '',
    target: ''
  });

  // 폼 상태
  const [sessionName, setSessionName] = useState('');
  const [workType, setWorkType] = useState('');
  const [operators, setOperators] = useState<string[]>(['']);
  const [targets, setTargets] = useState<string[]>(['']);

  // 뒤로가기 방지 훅
  const { showBackWarning } = useBackButtonPrevention();

  const theme = useMemo(() => THEME_COLORS[isDark ? 'dark' : 'light'], [isDark]);

  // 토스트 메시지 표시 함수
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  // 세션 관리 훅
  const {
    sessions,
    currentSession,
    currentOperator,
    currentTarget,
    setCurrentOperator,
    setCurrentTarget,
    createSession: createSessionFromManager,
    updateSessionLapTimes,
    deleteSession,
    switchToSession,
    resetAllSessions
  } = useSessionManager({ showToast });

  // 통계 분석 훅
  const statisticsAnalysis = useStatisticsAnalysis(lapTimes);

  // 랩타임 기록 콜백
  const handleLapRecorded = useCallback((newLap: LapTime) => {
    const updatedLaps = [...lapTimes, newLap];
    setLapTimes(updatedLaps);
    setAllLapTimes(prev => [...prev, newLap]);
    updateSessionLapTimes(updatedLaps);

    // 통계 업데이트
    statisticsAnalysis.updateStatistics(newLap, updatedLaps);
  }, [lapTimes, setAllLapTimes, updateSessionLapTimes, statisticsAnalysis]);

  // 타이머 로직 훅
  const {
    currentTime,
    isRunning,
    toggleTimer,
    stopTimer,
    resetTimer: resetTimerLogic,
    recordLap
  } = useTimerLogic({
    currentSession,
    currentOperator,
    currentTarget,
    onLapRecorded: handleLapRecorded,
    showToast
  });

  

  // 다크모드 적용
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // 리셋 함수 (기존 로직과 통합)
  const resetTimer = useCallback(() => {
    resetTimerLogic();
    setLapTimes([]);
    setAllLapTimes(prev => prev.filter(lap => lap.sessionId !== currentSession?.id));

    if (currentSession) {
      updateSessionLapTimes([]);
    }

    showToast('측정 기록이 모두 초기화되었습니다.', 'success');
  }, [resetTimerLogic, currentSession, showToast, setAllLapTimes, updateSessionLapTimes]);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showNewSessionModal || selectedSessionHistory || showLanding || showDetailedAnalysis || showHelpModal) return;

      // F1 키 (도움말)
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelpModal(true);
        return;
      }

      // Ctrl+E (데이터 내보내기)
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        downloadMeasurementData();
        return;
      }

      // Ctrl+H (소개 페이지)
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setShowLanding(true);
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          toggleTimer();
          break;
        case 'Enter':
          e.preventDefault();
          recordLap();
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
  }, [isRunning, currentSession, currentOperator, currentTarget, showNewSessionModal, selectedSessionHistory, showLanding, showDetailedAnalysis, showHelpModal, toggleTimer, recordLap, stopTimer, resetTimer, downloadMeasurementData]);

  // 개별 측정 기록 삭제
  const deleteLapTime = useCallback((lapId: number) => {
    const updatedLaps = lapTimes.filter(lap => lap.id !== lapId);
    const updatedAllLaps = allLapTimes.filter(lap => lap.id !== lapId);

    setLapTimes(updatedLaps);
    setAllLapTimes(updatedAllLaps);

    if (currentSession) {
      updateSessionLapTimes(updatedLaps);
    }

    showToast('측정 기록이 삭제되었습니다.', 'success');
  }, [lapTimes, allLapTimes, currentSession, showToast, setAllLapTimes, updateSessionLapTimes]);

  // 세션 생성 함수 (훅과 연동)
  const createSession = useCallback(() => {
    const success = createSessionFromManager(sessionName, workType, operators, targets);

    if (success) {
      setShowNewSessionModal(false);
      setLapTimes([]);

      // 폼 리셋
      setSessionName('');
      setWorkType('');
      setOperators(['']);
      setTargets(['']);
    }
  }, [createSessionFromManager, sessionName, workType, operators, targets]);

  // 세션 삭제 함수 (요구사항 8번)
  const handleDeleteSession = useCallback((sessionId: string) => {
    deleteSession(sessionId);
    setAllLapTimes(prev => prev.filter(lap => lap.sessionId !== sessionId));

    if (currentSession?.id === sessionId) {
      setLapTimes([]);
    }
  }, [deleteSession, currentSession, setAllLapTimes]);

  // 전체 데이터 초기화 함수 (요구사항 8번)
  const resetAllData = useCallback(() => {
    resetAllSessions();
    setLapTimes([]);
    setAllLapTimes([]);
    setFilterOptions({ operator: '', target: '' });
  }, [resetAllSessions, setAllLapTimes]);

  // 측정자/대상자 추가/삭제 함수
  const addOperator = useCallback(() => setOperators(prev => [...prev, '']), []);
  const removeOperator = useCallback((index: number) => {
    if (operators.length > 1) {
      setOperators(operators.filter((_, i) => i !== index));
    }
  }, [operators]);

  const addTarget = useCallback(() => setTargets(prev => [...prev, '']), []);
  const removeTarget = useCallback((index: number) => {
    if (targets.length > 1) {
      setTargets(targets.filter((_, i) => i !== index));
    }
  }, [targets]);

  // 다운로드 함수들 (요구사항 10, 11번 - 오류 수정)
  const downloadMeasurementData = useCallback(() => {
    if (lapTimes.length === 0) {
      showToast('다운로드할 측정 기록이 없습니다.', 'warning');
      return;
    }

    if (!currentSession) {
      showToast('활성 세션이 없습니다.', 'error');
      return;
    }

    const success = ExportService.exportMeasurementData(currentSession, lapTimes);
    if (success) {
      showToast('측정 기록이 다운로드되었습니다.', 'success');
    } else {
      showToast('다운로드에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  }, [lapTimes, currentSession, showToast]);

  // 상세분석 다운로드
  const downloadDetailedAnalysis = useCallback(() => {
    const validation = ValidationService.validateGageRRAnalysis(lapTimes);
    if (!validation.isValid) {
      showToast(validation.message!, 'warning');
      return;
    }

    if (!currentSession) {
      showToast('활성 세션이 없습니다.', 'error');
      return;
    }

    try {
      const analysis = AnalysisService.calculateGageRR(lapTimes, 'none');
      const success = ExportService.exportDetailedAnalysis(currentSession, lapTimes, analysis);
      if (success) {
        showToast('상세 분석 보고서가 다운로드되었습니다.', 'success');
      } else {
        showToast('다운로드에 실패했습니다. 다시 시도해주세요.', 'error');
      }
    } catch (error) {
      console.error('분석 오류:', error);
      showToast('분석 중 오류가 발생했습니다.', 'error');
    }
  }, [lapTimes, currentSession, showToast]);

  // 필터링된 측정 기록 (요구사항 8번)
  const filteredLapTimes = useMemo(() => {
    return lapTimes.filter(lap => {
      return (!filterOptions.operator || lap.operator === filterOptions.operator) &&
        (!filterOptions.target || lap.target === filterOptions.target);
    });
  }, [lapTimes, filterOptions]);

  // Gage R&R 분석
  const analysis = useMemo(() => {
    const validation = ValidationService.validateGageRRAnalysis(lapTimes);
    if (!validation.isValid) return null;

    try {
      return AnalysisService.calculateGageRR(lapTimes, 'none');
    } catch (error) {
      console.error('분석 오류:', error);
      return null;
    }
  }, [lapTimes]);

  // 분석 가능 여부 확인 (요구사항 6번)
  const canAnalyze = useMemo(() => {
    if (!currentSession) return { canAnalyze: false, message: '' };

    const operatorCount = currentSession.operators.length;
    const targetCount = currentSession.targets.length;

    if (operatorCount < 2 && targetCount < 5) {
      return {
        canAnalyze: false,
        message: 'Gage R&R 분석을 위해서는 측정자 2명 이상, 대상자 5개 이상이 필요합니다.'
      };
    } else if (operatorCount < 2) {
      return {
        canAnalyze: false,
        message: 'Gage R&R 분석을 위해서는 측정자 2명 이상이 필요합니다.'
      };
    } else if (targetCount < 5) {
      return {
        canAnalyze: false,
        message: 'Gage R&R 분석을 위해서는 대상자 5개 이상이 필요합니다.'
      };
    }

    return { canAnalyze: true, message: '' };
  }, [currentSession]);

  // 랜딩 페이지 표시 (요구사항 1번)
  if (showLanding) {
    return <ModernLandingPage isDark={isDark} onStart={() => setShowLanding(false)} />;
  }

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      {/* 토스트 메시지 */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      {/* 뒤로가기 경고 */}
      <BackWarning isVisible={showBackWarning} />

      {/* 🔧 상세분석 모달 (현재 분석 방식에 맞게 수정) */}
      <DetailedAnalysisModal
        isVisible={showDetailedAnalysis}
        onClose={() => setShowDetailedAnalysis(false)}
        analysis={analysis}
        theme={theme}
        isDark={isDark}
        statisticsAnalysis={statisticsAnalysis}
      />

      {/* 도움말 모달 */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* 헤더 */}
      <div className={`${theme.card} shadow-sm border-b ${theme.border} sticky top-0 z-40`}>
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Zap className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className={`text-base font-bold ${theme.text} truncate`}>
                  물류 인시수 측정 타이머
                </h1>
                <div className={`text-xs ${theme.textMuted} truncate`}>
                  측정부터 분석까지 한번에
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => setShowHelpModal(true)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}
                title="도움말 (F1)"
              >
                <Info className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowLanding(true)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:text-red-500 ${theme.surfaceHover}`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 작업 세션 섹션 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className={`font-semibold ${theme.text}`}>작업 세션</h2>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>새 세션</span>
              </button>
              <button
                onClick={resetTimer}
                className="bg-orange-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-600 flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>초기화</span>
              </button>
            </div>
          </div>

          {currentSession ? (
            <div className="space-y-3">
              <div className={`text-sm ${theme.textMuted}`}>
                <div className={`font-medium ${theme.text} mb-1 truncate`}>{currentSession.name}</div>
                <div className="truncate">{currentSession.workType}</div>
              </div>

              {/* 측정자/대상자 선택 (세션 분리 개선 - 요구사항 4번) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>측정자</label>
                  <select
                    value={currentOperator}
                    onChange={(e) => setCurrentOperator(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${theme.input}`}
                  >
                    {currentSession.operators.map(op => (
                      <option key={`${currentSession.id}-${op}`} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>대상자</label>
                  <select
                    value={currentTarget}
                    onChange={(e) => setCurrentTarget(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${theme.input}`}
                  >
                    {currentSession.targets.map(tg => (
                      <option key={`${currentSession.id}-${tg}`} value={tg}>{tg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className={`text-sm ${theme.textMuted}`}>활성 세션이 없습니다.</p>
              <p className={`text-xs ${theme.textMuted}`}>새 세션을 생성해주세요.</p>
            </div>
          )}
        </div>

        {/* 정밀 타이머 섹션 */}
        <div className={`${theme.card} rounded-lg p-6 shadow-sm border ${theme.border}`}>
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-6 h-6 text-blue-500" />
            <h2 className={`font-semibold ${theme.text}`}>정밀 타이머</h2>
          </div>

          <div className="text-center">
            <div className={`text-4xl sm:text-5xl font-mono font-bold mb-6 ${theme.text} tracking-wider`}>
              {ExportService.formatTime(currentTime)}
            </div>

            <div className={`text-sm ${theme.textMuted} mb-6`}>
              {isRunning ? '측정 중...' : '대기 중'}
            </div>

            {/* 버튼 레이아웃 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={toggleTimer}
                disabled={!currentSession}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-colors ${isRunning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
                  } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span className="text-sm">{isRunning ? '정지' : '시작'}</span>
              </button>

              <button
                onClick={recordLap}
                disabled={!currentSession}
                className="flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Target className="w-5 h-5" />
                <span className="text-sm">랩타임</span>
              </button>

              <button
                onClick={stopTimer}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'
                  }`}
              >
                <Square className="w-5 h-5" />
                <span className="text-sm">중지</span>
              </button>
            </div>
          </div>
        </div>

        {/* 실시간 분석 섹션 */}
        {lapTimes.length > 0 && (

          <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <h2 className={`font-semibold ${theme.text}`}>실시간 분석</h2>
              </div>
            </div>



            <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
              <MeasurementCard
                title="측정 횟수"
                value={lapTimes.length}
                icon={Timer}
                status="info"
                theme={theme}
                size="sm"
                isDark={isDark}
              />
              <MeasurementCard
                title="평균 시간"
                value={ExportService.formatTime(lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)}
                icon={Clock}
                status="success"
                theme={theme}
                size="sm"
                isDark={isDark}
              />
              <MeasurementCard
                title="변동계수"
                value={statisticsAnalysis.gaugeData ?
                  `${statisticsAnalysis.gaugeData.cv.toFixed(1)}%` : '0.0%'
                }
                icon={Activity}
                status={statisticsAnalysis.gaugeData && statisticsAnalysis.gaugeData.cv <= 12 ? 'success' :
                       statisticsAnalysis.gaugeData && statisticsAnalysis.gaugeData.cv <= 20 ? 'warning' : 'error'}
                theme={theme}
                size="sm"
                isDark={isDark}
              />
            </div>

            {/* === NEW 3-카드 영역 시작 === */}
            {!canAnalyze.canAnalyze ? (
              <AnalysisUnavailableMessage
                theme={theme}
                isDark={isDark}
                message={canAnalyze.message}
              />
            ) : lapTimes.length >= 6 ? (
              <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
                <MeasurementCard
                  title="Gage R&R"
                  value={`${statisticsAnalysis.gaugeData.grr.toFixed(1)}%`}
                  icon={BarChart3}
                  status={statisticsAnalysis.statisticsStatus.grr}
                  theme={theme}
                  size="sm"
                  isDark={isDark}
                />
                <MeasurementCard
                  title="ICC (2,1)"
                  value={statisticsAnalysis.iccValue.toFixed(2)}
                  icon={Target}
                  status={statisticsAnalysis.statisticsStatus.icc}
                  theme={theme}
                  size="sm"
                  isDark={isDark}
                />
                <MeasurementCard
                  title="ΔPair"
                  value={`${statisticsAnalysis.deltaPairValue.toFixed(3)}s`}
                  icon={Calculator}
                  status={statisticsAnalysis.statisticsStatus.deltaPair}
                  theme={theme}
                  size="sm"
                  isDark={isDark}
                />
              </div>
            ) : null}
            {/* === NEW 3-카드 영역 끝 === */}

            {/* 간략한 상태 표시 */}
            {analysis && lapTimes.length >= 6 && canAnalyze.canAnalyze && (
              <div className={`${theme.surface} p-3 rounded-lg border ${theme.border} text-center`}>
                <StatusBadge status={analysis.status} size="md" isDark={isDark} />
                <p className={`text-sm ${theme.textMuted} mt-2`}>
                  상세한 분석과 해석은 상세분석 페이지에서 확인하세요
                </p>
              </div>
            )}
          </div>
        )}

        {/* 🔧 액션 버튼들 (상세분석 버튼 수정) */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={downloadMeasurementData}
            disabled={lapTimes.length === 0}
            className="bg-green-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            onClick={downloadDetailedAnalysis}
            disabled={!canAnalyze.canAnalyze || lapTimes.length < 6}
            className="bg-purple-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
          >
            <PieChart className="w-4 h-4" />
            <span>분석</span>
          </button>

          {/* 🔧 상세분석 모달 버튼 (새로 추가) */}
          <button
            onClick={() => setShowDetailedAnalysis(true)}
            disabled={lapTimes.length === 0}
            className="bg-blue-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
          >
            <Info className="w-4 h-4" />
            <span>상세</span>
          </button>
        </div>

        {/* 측정 기록 섹션 (필터링 기능 포함 - 요구사항 8번) */}
        {currentSession && (
          <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-500" />
                <h2 className={`font-semibold ${theme.text}`}>측정 기록</h2>
                <span className={`text-sm ${theme.textMuted}`}>
                  {filteredLapTimes.length}개
                </span>
              </div>
              <button
                onClick={() => setFilterOptions(prev => ({
                  ...prev,
                  operator: prev.operator ? '' : currentSession.operators[0]
                }))}
                className={`text-blue-500 text-sm hover:text-blue-700 transition-colors p-1 rounded ${theme.surfaceHover}`}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* 필터 섹션 (요구사항 8번) */}
            {filterOptions.operator && (
              <div className={`mb-4 p-3 rounded-lg border ${theme.border} ${theme.surface}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>측정자 필터</label>
                    <select
                      value={filterOptions.operator}
                      onChange={(e) => setFilterOptions(prev => ({ ...prev, operator: e.target.value }))}
                      className={`w-full p-2 border rounded text-sm ${theme.input}`}
                    >
                      <option value="">전체</option>
                      {currentSession.operators.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>대상자 필터</label>
                    <select
                      value={filterOptions.target}
                      onChange={(e) => setFilterOptions(prev => ({ ...prev, target: e.target.value }))}
                      className={`w-full p-2 border rounded text-sm ${theme.input}`}
                    >
                      <option value="">전체</option>
                      {currentSession.targets.map(tg => (
                        <option key={tg} value={tg}>{tg}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(filterOptions.operator || filterOptions.target) && (
                  <button
                    onClick={() => setFilterOptions({ operator: '', target: '' })}
                    className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            )}

            {filteredLapTimes.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredLapTimes
                  .slice()
                  .reverse()
                  .map((lap, index) => (
                    <div key={lap.id} className={`${theme.surface} p-3 rounded-lg border-l-4 border-blue-500 transition-all hover:shadow-md ${theme.surfaceHover}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-lg font-bold text-blue-600 mb-2">
                            {ExportService.formatTime(lap.time)}
                          </div>
                          <div className={`text-xs ${theme.textMuted} space-y-1`}>
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">측정자: <span className={`font-medium ${theme.textSecondary}`}>{lap.operator}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">대상자: <span className={`font-medium ${theme.textSecondary}`}>{lap.target}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{lap.timestamp}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className={`text-xs ${theme.textMuted} text-right`}>
                            #{filteredLapTimes.length - index}
                          </div>
                          <button
                            onClick={() => deleteLapTime(lap.id)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="측정 기록 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className={`text-sm ${theme.textMuted}`}>
                  {lapTimes.length === 0 ? '측정 기록이 없습니다.' : '필터 조건에 맞는 기록이 없습니다.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 세션 히스토리 (요구사항 8번 - 세션 삭제 기능 포함) */}
        {sessions.length > 0 && (
          <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-gray-500" />
                <h2 className={`font-semibold ${theme.text}`}>세션 히스토리</h2>
              </div>
              <button
                onClick={resetAllData}
                className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                title="모든 세션 히스토리 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {sessions.slice(-5).reverse().map(session => {
                const sessionLapCount = allLapTimes.filter(lap => lap.sessionId === session.id).length;

                return (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg border transition-all hover:shadow-md ${currentSession?.id === session.id
                      ? isDark ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                      : `${theme.border} ${theme.surface} ${theme.surfaceHover}`
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedSessionHistory(session)}
                      >
                        <div className={`font-medium text-sm ${theme.text} truncate`}>{session.name}</div>
                        <div className={`text-xs ${theme.textMuted} truncate`}>{session.workType}</div>
                        <div className={`text-xs ${theme.textMuted} truncate`}>{session.startTime}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className={`text-sm font-medium ${theme.text}`}>
                            {sessionLapCount}회
                          </div>
                          {currentSession?.id === session.id && (
                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded">
                              활성
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="세션 삭제"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 하단 여백 */}
        <div className="h-8"></div>
      </div>

      {/* 새 세션 생성 모달 */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border ${theme.border}`}>
            <div className="p-6">
              <h3 className={`text-xl font-bold mb-4 ${theme.text}`}>새 작업 세션 생성</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textSecondary}`}>세션명 *</label>
                    <input
                      type="text"value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="예: 검수-000-001"
                      className={`w-full p-3 border rounded-lg text-sm ${theme.input}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textSecondary}`}>작업 유형 *</label>
                    <select
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      className={`w-full p-3 border rounded-lg text-sm ${theme.input}`}
                    >
                      <option value="">작업 유형 선택</option>
                      {WORK_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${theme.textSecondary}`}>측정자 설정</label>
                    <button
                      onClick={addOperator}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      추가
                    </button>
                  </div>
                  {operators.map((operator, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={operator}
                        onChange={(e) => {
                          const newOperators = [...operators];
                          newOperators[index] = e.target.value;
                          setOperators(newOperators);
                        }}
                        placeholder={`측정자 ${index + 1} (예: 6급 조봉근)`}
                        className={`flex-1 p-2 border rounded text-sm ${theme.input}`}
                      />
                      {operators.length > 1 && (
                        <button
                          onClick={() => removeOperator(index)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${theme.textSecondary}`}>대상자 설정</label>
                    <button
                      onClick={addTarget}
                      className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-600 transition-colors"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      추가
                    </button>
                  </div>
                  {targets.map((target, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={target}
                        onChange={(e) => {
                          const newTargets = [...targets];
                          newTargets[index] = e.target.value;
                          setTargets(newTargets);
                        }}
                        placeholder={`대상자 ${index + 1} (예: 7급 김공군)`}
                        className={`flex-1 p-2 border rounded text-sm ${theme.input}`}
                      />
                      {targets.length > 1 && (
                        <button
                          onClick={() => removeTarget(index)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg border`}>
                  <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Gage R&R 분석 안내
                  </h4>
                  <ul className={`${isDark ? 'text-blue-300' : 'text-blue-700'} space-y-1 text-xs`}>
                    <li>• 측정자 2명 이상: 재현성(Reproducibility) 분석</li>
                    <li>• 대상자 5개 이상: 대상자간 변동성 분석</li>
                    <li>• 최소 6회 측정: 신뢰성 있는 분석 결과</li>
                    <li>• 권장 측정 횟수: 각 조건별 3-5회</li>
                    <li>• ⚠️ 조건 미달 시: 기본 측정은 가능하나 Gage R&R 분석 불가</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowNewSessionModal(false)}
                  className={`flex-1 border py-3 rounded-lg font-medium transition-colors ${theme.border} ${theme.textSecondary} ${theme.surfaceHover}`}
                >
                  취소
                </button>
                <button
                  onClick={createSession}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center space-x-2 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>세션 생성</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === NEW 재측정 모달 시작 === */}
      {statisticsAnalysis.showRetakeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} rounded-xl w-full max-w-sm shadow-2xl border ${theme.border}`}>
            <div className="p-6 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
                <AlertTriangle className={`w-8 h-8 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
              </div>
              <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>
                측정 차이 과다
              </h3>
              <p className={`text-sm ${theme.textMuted} mb-4`}>
                연속 측정값의 차이가 임계치를 초과했습니다. 재측정을 권장합니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => statisticsAnalysis.setShowRetakeModal(false)}
                  className={`flex-1 border py-2 rounded-lg font-medium transition-colors ${theme.border} ${theme.textSecondary} ${theme.surfaceHover}`}
                >
                  무시
                </button>
                <button
                  onClick={() => {
                    statisticsAnalysis.setShowRetakeModal(false);
                    // 마지막 측정 제거
                    const newLaps = lapTimes.slice(0, -1);
                    setLapTimes(newLaps);
                    setAllLapTimes(prev => prev.filter(lap => lap.id !== lapTimes[lapTimes.length - 1]?.id));
                    if (currentSession) {
                      updateSessionLapTimes(newLaps);
                    }
                  }}
                  className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  재측정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* === NEW 재측정 모달 끝 === */}

      {/* 세션 히스토리 상세 모달 */}
      {selectedSessionHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border ${theme.border}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${theme.text}`}>세션 상세 정보</h3>
                <button
                  onClick={() => setSelectedSessionHistory(null)}
                  className={`${theme.textMuted} hover:${theme.textSecondary} transition-colors p-1`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>세션명</div>
                    <div className={`font-medium ${theme.text} truncate`}>{selectedSessionHistory.name}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>작업유형</div>
                    <div className={`font-medium ${theme.text} truncate`}>{selectedSessionHistory.workType}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>측정자</div>
                    <div className={`font-medium ${theme.text} break-words`}>{selectedSessionHistory.operators.join(', ')}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>대상자</div>
                    <div className={`font-medium ${theme.text} break-words`}>{selectedSessionHistory.targets.join(', ')}</div>
                  </div>
                </div>

                <div>
                  <div className={`text-sm ${theme.textMuted} mb-2`}>측정 기록</div>
                  <div className={`${theme.surface} p-3 rounded-lg`}>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${theme.text}`}>
                        {allLapTimes.filter(lap => lap.sessionId === selectedSessionHistory.id).length}
                      </div>
                      <div className={`text-sm ${theme.textMuted}`}>총 측정 횟수</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    switchToSession(selectedSessionHistory);
                    setLapTimes(allLapTimes.filter(lap => lap.sessionId === selectedSessionHistory.id));
                    setSelectedSessionHistory(null);
                  }}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  이 세션으로 전환
                </button>
                <button
                  onClick={() => setSelectedSessionHistory(null)}
                  className={`flex-1 border py-2 rounded-lg font-medium transition-colors ${theme.border} ${theme.textSecondary} ${theme.surfaceHover}`}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



export default EnhancedLogisticsTimer;