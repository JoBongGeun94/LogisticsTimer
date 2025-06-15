
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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
import { ValidationService } from './services/ValidationService';
import { AnalysisService } from './services/AnalysisService';
import { ExportService } from './services/ExportService';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTimerLogic } from './hooks/useTimerLogic';
import { useStatisticsAnalysis } from './hooks/useStatisticsAnalysis';
import { useSessionManager } from './hooks/useSessionManager';
import { NotificationService } from './services/NotificationService';

// ==================== 테마 상수 (Open/Closed Principle) ====================
const THEME_COLORS = {
  light: {
    bg: 'bg-gray-50',
    card: 'bg-white',
    text: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-500',
    border: 'border-gray-200',
    accent: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
    surface: 'bg-gray-50',
    surfaceHover: 'hover:bg-gray-100'
  },
  dark: {
    bg: 'bg-gray-900',
    card: 'bg-gray-800',
    text: 'text-white',
    textSecondary: 'text-gray-200',
    textMuted: 'text-gray-400',
    border: 'border-gray-600',
    accent: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
    input: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
    surface: 'bg-gray-700',
    surfaceHover: 'hover:bg-gray-600'
  }
} as const;

const STATUS_COLORS = {
  excellent: {
    light: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: 'text-green-600' },
    dark: { bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700', icon: 'text-green-400' }
  },
  acceptable: {
    light: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: 'text-blue-600' },
    dark: { bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700', icon: 'text-blue-400' }
  },
  marginal: {
    light: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', icon: 'text-yellow-600' },
    dark: { bg: 'bg-yellow-900/30', text: 'text-yellow-300', border: 'border-yellow-700', icon: 'text-yellow-400' }
  },
  unacceptable: {
    light: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: 'text-red-600' },
    dark: { bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700', icon: 'text-red-400' }
  }
} as const;

// 작업 유형 상수
const WORK_TYPES = ['물자검수팀', '저장관리팀', '포장관리팀'] as const;

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

// 랜딩 페이지 (소개 화면 첫번째)
const ModernLandingPage = memo<{
  isDark: boolean;
  onStart: () => void;
}>(({ isDark, onStart }) => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 via-purple-500/15 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-80 h-80 bg-gradient-to-tr from-indigo-400/15 via-blue-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-full blur-2xl animate-bounce"></div>
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-gradient-to-l from-purple-400/10 to-indigo-500/10 rounded-full blur-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-6 text-center pt-20">
        <div className="transform hover:scale-105 transition-transform duration-300 mb-16 mt-16">
          <ConsolidatedSupplyLogo isDark={isDark} size="lg" />
        </div>

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

// 메인 App 컴포넌트
export default function App() {
  // 테마 및 UI 상태
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('darkMode', false);
  const [showLanding, setShowLanding] = useLocalStorage<boolean>('showLanding', true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false
  });

  // 훅들
  const { showBackWarning } = useBackButtonPrevention();
  const sessionManager = useSessionManager();
  const timerLogic = useTimerLogic();
  const statisticsAnalysis = useStatisticsAnalysis(sessionManager.lapTimes);

  // 테마 객체
  const theme = useMemo(() => THEME_COLORS[isDarkMode ? 'dark' : 'light'], [isDarkMode]);

  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        if (timerLogic.isRunning) {
          timerLogic.pause();
        } else {
          timerLogic.start();
        }
      }
      if (event.code === 'Enter' && timerLogic.isRunning) {
        event.preventDefault();
        timerLogic.stop();
      }
      if (event.code === 'KeyR' && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        timerLogic.reset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timerLogic.isRunning, timerLogic.start, timerLogic.pause, timerLogic.stop, timerLogic.reset]);

  // 토스트 메시지 표시 함수
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  // 랜딩 페이지 표시
  if (showLanding) {
    return <ModernLandingPage isDark={isDarkMode} onStart={() => setShowLanding(false)} />;
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-300`}>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* 헤더 */}
        <div className={`${theme.card} rounded-xl shadow-sm p-6 mb-6 border ${theme.border}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <ConsolidatedSupplyLogo isDark={isDarkMode} size="sm" />
              <div>
                <h1 className={`text-2xl font-bold ${theme.text}`}>물류 작업 시간 측정</h1>
                <p className={`text-sm ${theme.textMuted}`}>Gage R&R 분석 시스템</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${theme.surfaceHover} ${theme.textSecondary}`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowLanding(true)}
                className={`p-2 rounded-lg transition-colors ${theme.surfaceHover} ${theme.textSecondary}`}
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 타이머 섹션 */}
        <div className={`${theme.card} rounded-xl shadow-sm p-6 mb-6 border ${theme.border}`}>
          <div className="text-center mb-6">
            <div className={`text-6xl font-mono font-bold ${theme.text} mb-4`}>
              {timerLogic.displayTime}
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={timerLogic.isRunning ? timerLogic.pause : timerLogic.start}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  timerLogic.isRunning 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } hover:scale-105`}
              >
                {timerLogic.isRunning ? (
                  <>
                    <Pause className="w-5 h-5 inline mr-2" />
                    일시정지
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 inline mr-2" />
                    시작
                  </>
                )}
              </button>
              <button
                onClick={timerLogic.stop}
                disabled={!timerLogic.isRunning}
                className="px-6 py-3 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                <Square className="w-5 h-5 inline mr-2" />
                측정완료
              </button>
              <button
                onClick={timerLogic.reset}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 ${theme.surface} ${theme.textSecondary} hover:${theme.surfaceHover}`}
              >
                <RefreshCw className="w-5 h-5 inline mr-2" />
                리셋
              </button>
            </div>
          </div>
        </div>

        {/* 통계 분석 섹션 */}
        {statisticsAnalysis.gaugeData && (
          <div className={`${theme.card} rounded-xl shadow-sm p-6 mb-6 border ${theme.border}`}>
            <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>실시간 분석 결과</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MeasurementCard
                title="Gage R&R"
                value={`${statisticsAnalysis.gaugeData.grr.toFixed(1)}`}
                unit="%"
                icon={BarChart3}
                status={statisticsAnalysis.gaugeData.grr <= 10 ? 'success' : statisticsAnalysis.gaugeData.grr <= 30 ? 'warning' : 'error'}
                theme={theme}
                isDark={isDarkMode}
              />
              <MeasurementCard
                title="ICC (2,1)"
                value={statisticsAnalysis.iccValue.toFixed(3)}
                icon={Calculator}
                status="info"
                theme={theme}
                isDark={isDarkMode}
              />
              <MeasurementCard
                title="변동계수"
                value={`${statisticsAnalysis.gaugeData.cv.toFixed(1)}`}
                unit="%"
                icon={Activity}
                status="info"
                theme={theme}
                isDark={isDarkMode}
              />
              <MeasurementCard
                title="측정 개수"
                value={sessionManager.lapTimes.length}
                unit="개"
                icon={Package}
                status="info"
                theme={theme}
                isDark={isDarkMode}
              />
            </div>
          </div>
        )}
      </div>

      {/* 토스트 메시지 */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* 뒤로가기 경고 */}
      <BackWarning isVisible={showBackWarning} />
    </div>
  );
}
