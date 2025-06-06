import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  Play, Pause, RotateCcw, Download, Plus, Users, Clock,
  BarChart3, Calculator, Target, HelpCircle, ArrowLeft, XCircle,
  AlertCircle, CheckCircle, AlertTriangle, Search, Loader2, Sun, Moon, Zap, Trash2, Activity,
  Timer
} from 'lucide-react';

// ==================== 타입 정의 (SRP) ====================
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

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
  ptRatio: number;
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

interface Theme {
  bg: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  input: string;
  surface: string;
  surfaceHover: string;
}

// ==================== 상수 및 테마 (OCP) ====================
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

// ==================== 유틸리티 함수 (Pure Functions) ====================
const formatTime = (ms: number): string => {
  if (ms < 0) return '00:00.00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds
    .toString()
    .padStart(2, '0')}`;
};

const generateFileName = (prefix: string, sessionName: string): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const timestamp = `${year}${month}${day}${hour}${minute}`;
  const safeName = sessionName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  return `${prefix}-${safeName}-(${timestamp}).csv`;
};

const createCSVContent = (data: (string | number)[][]): string => {
  const csvRows = data.map((row) =>
    row.map((cell) => {
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  );
  return '\ufeff' + csvRows.join('\n');
};

const downloadCSVFile = (content: string, filename: string): boolean => {
  try {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error('CSV download failed:', error);
    return false;
  }
};

// 뒤로가기 방지 훅
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
    return () => window.removeEventListener('popstate', handlePopState);
  }, [backPressCount]);

  return { showBackWarning };
};

// ==================== Gage R&R 분석 로직 ====================
const calculateGageRR = (lapTimes: LapTime[], useLogTransform: boolean): GageRRAnalysis => {
  const defaultResult: GageRRAnalysis = {
    repeatability: 0,
    reproducibility: 0,
    gageRR: 0,
    partVariation: 0,
    totalVariation: 0,
    gageRRPercent: 100,
    ndc: 0,
    ptRatio: 0,
    anova: {
      operator: 0,
      part: 0,
      interaction: 0,
      error: 0,
      total: 0,
      operatorPercent: 0,
      partPercent: 0,
      interactionPercent: 0,
      errorPercent: 0
    },
    interpretation: {
      overall: '분석을 위한 데이터가 부족합니다.',
      repeatability: '반복성 분석 불가',
      reproducibility: '재현성 분석 불가',
      recommendations: ['최소 6개 이상의 측정 데이터가 필요합니다.'],
      riskLevel: 'high'
    }
  };

  if (!lapTimes || lapTimes.length < 6) return defaultResult;

  try {
    // (1) 전체 데이터 → 배열로 추출
    let values = lapTimes.map((lap) => lap.time).filter((time) => time > 0);
    if (useLogTransform) {
      values = values.map((v) => Math.log(v));
    }
    if (values.length < 6) return defaultResult;

    // (2) 전체 평균 및 분산
    const meanAll = values.reduce((a, b) => a + b, 0) / values.length;
    const varianceAll =
      values.reduce((acc, v) => acc + Math.pow(v - meanAll, 2), 0) / Math.max(1, values.length - 1);
    const stdDevAll = Math.sqrt(varianceAll);

    // (3) operator + part 조합별 그룹화
    const groupMap: Record<string, number[]> = {};
    lapTimes.forEach((lap) => {
      if (lap.time > 0) {
        const key = `${lap.operator.trim()}||${lap.target.trim()}`;
        let val = lap.time;
        if (useLogTransform) val = Math.log(val);
        if (!groupMap[key]) groupMap[key] = [];
        groupMap[key].push(val);
      }
    });
    const numGroups = Object.keys(groupMap).length;
    if (numGroups === 0) return defaultResult;

    // (4) 반복성 계산
    let repeatVarSum = 0;
    let repeatCount = 0;
    Object.values(groupMap).forEach((arr) => {
      if (arr.length > 1) {
        const m = arr.reduce((a, b) => a + b, 0) / arr.length;
        arr.forEach((v) => {
          repeatVarSum += Math.pow(v - m, 2);
        });
        repeatCount += arr.length - 1;
      }
    });
    const repeatability = repeatCount > 0 ? Math.sqrt(repeatVarSum / repeatCount) : stdDevAll * 0.8;

    // (5) operator별 평균 및 분산
    const operatorMap: Record<string, number[]> = {};
    lapTimes.forEach((lap) => {
      if (lap.time > 0) {
        const key = lap.operator.trim();
        let val = lap.time;
        if (useLogTransform) val = Math.log(val);
        if (!operatorMap[key]) operatorMap[key] = [];
        operatorMap[key].push(val);
      }
    });
    const operatorMeans = Object.values(operatorMap).map(
      (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
    );
    const operatorCount = operatorMeans.length;
    const operatorVar =
      operatorMeans.length > 1
        ? operatorMeans.reduce((acc, m) => acc + Math.pow(m - meanAll, 2), 0) / Math.max(1, operatorCount - 1)
        : 0;
    const trialsPerGroup = Math.max(1, values.length / numGroups);
    const reproducibility = Math.sqrt(
      Math.max(0, operatorVar - (repeatability * repeatability) / trialsPerGroup)
    );

    // (6) part별 평균 및 분산
    const partMap: Record<string, number[]> = {};
    lapTimes.forEach((lap) => {
      if (lap.time > 0) {
        const key = lap.target.trim();
        let val = lap.time;
        if (useLogTransform) val = Math.log(val);
        if (!partMap[key]) partMap[key] = [];
        partMap[key].push(val);
      }
    });
    const partMeans = Object.values(partMap).map(
      (arr) => arr.reduce((a, b) => a + b, 0) / arr.length
    );
    const partCount = partMeans.length;
    const partVar =
      partMeans.length > 1
        ? partMeans.reduce((acc, m) => acc + Math.pow(m - meanAll, 2), 0) / Math.max(1, partCount - 1)
        : varianceAll;
    const partVariation = Math.sqrt(
      Math.max(0, partVar - (repeatability * repeatability) / trialsPerGroup)
    );

    // (7) Gage R&R, 전체 변동, %, NDC 및 P/T 계산
    const gageRR = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
    const totalVariation = Math.sqrt(gageRR ** 2 + partVariation ** 2);
    const gageRRPercent = totalVariation > 0 ? Math.min(100, (gageRR / totalVariation) * 100) : 100;
    const ndc = partVariation > 0 && gageRR > 0 ? Math.max(0, Math.floor(1.41 * (partVariation / gageRR))) : 0;
    const ptRatio = partVariation > 0 ? Math.max(0, gageRR / (6 * partVariation)) : 0;

    // (8) ANOVA: Two-way nested 개략 분해
    const interaction = Math.max(0, varianceAll * 0.1);
    const error = repeatability ** 2;
    const totalANOVA = operatorVar + partVar + interaction + error;
    const anova = {
      operator: Math.max(0, operatorVar),
      part: Math.max(0, partVar),
      interaction,
      error,
      total: Math.max(0, totalANOVA),
      operatorPercent: totalANOVA > 0 ? (operatorVar / totalANOVA) * 100 : 0,
      partPercent: totalANOVA > 0 ? (partVar / totalANOVA) * 100 : 0,
      interactionPercent: totalANOVA > 0 ? (interaction / totalANOVA) * 100 : 0,
      errorPercent: totalANOVA > 0 ? (error / totalANOVA) * 100 : 0
    };

    let status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
    if (gageRRPercent < 10) status = 'excellent';
    else if (gageRRPercent < 30) status = 'acceptable';
    else if (gageRRPercent < 50) status = 'marginal';
    else status = 'unacceptable';

    const interpretation = generateInterpretation(
      gageRRPercent,
      repeatability,
      reproducibility,
      ptRatio,
      ndc,
      anova
    );
    return {
      repeatability,
      reproducibility,
      gageRR,
      partVariation,
      totalVariation,
      gageRRPercent,
      ndc,
      ptRatio,
      anova,
      interpretation
    };
  } catch (error) {
    console.error('calculateGageRR error:', error);
    return defaultResult;
  }
};

const generateInterpretation = (
  gageRRPercent: number,
  repeatability: number,
  reproducibility: number,
  ptRatio: number,
  ndc: number,
  anova: any
): GageRRAnalysis['interpretation'] => {
  const overall =
    gageRRPercent < 10
      ? '측정 시스템이 우수합니다. 제품 변동을 정확하게 구별할 수 있으며, 측정 오차가 매우 낮습니다.'
      : gageRRPercent < 30
      ? '측정 시스템이 양호합니다. 대부분의 상황에서 사용 가능하나 지속적인 모니터링이 필요합니다.'
      : gageRRPercent < 50
      ? '측정 시스템이 보통 수준입니다. 제한적으로 사용 가능하나 개선이 권장됩니다.'
      : '측정 시스템에 심각한 문제가 있습니다. 즉시 개선이 필요하며, 현재 상태로는 신뢰할 수 없습니다.';

  const repeatabilityInterpretation =
    repeatability < reproducibility
      ? '반복성이 우수합니다. 동일한 측정자가 동일한 조건에서 측정할 때 일관된 결과를 얻을 수 있습니다.'
      : '반복성에 문제가 있습니다. 장비의 정밀도나 측정 환경을 점검해야 합니다.';

  const reproducibilityInterpretation =
    reproducibility < repeatability
      ? '재현성이 우수합니다. 서로 다른 측정자가 측정해도 일관된 결과를 얻을 수 있습니다.'
      : '재현성에 문제가 있습니다. 측정자 간 교육이나 표준 절차 개선이 필요합니다.';

  const recommendations: string[] = [];
  if (gageRRPercent >= 30) {
    recommendations.push('측정 시스템 전반적인 재검토 필요');
    recommendations.push('측정 장비의 교정 및 정밀도 점검');
  }
  if (repeatability > reproducibility) {
    recommendations.push('측정 장비의 안정성 및 정밀도 개선');
    recommendations.push('측정 환경 조건 표준화');
  } else {
    recommendations.push('측정자 교육 프로그램 강화');
    recommendations.push('표준 작업 절차서 개선');
  }
  if (ptRatio < 0.1) {
    recommendations.push('측정 시스템 P/T 비율이 낮습니다. 개선 필요');
  }
  if (ndc < 5) {
    recommendations.push('측정 시스템의 구별 능력 향상 필요');
  }
  if (anova.operatorPercent > 30) {
    recommendations.push('측정자 간 변동 감소를 위한 교육 강화');
  }

  const riskLevel: 'low' | 'medium' | 'high' =
    gageRRPercent < 10 ? 'low' : gageRRPercent < 30 ? 'medium' : 'high';

  return {
    overall,
    repeatability: repeatabilityInterpretation,
    reproducibility: reproducibilityInterpretation,
    recommendations,
    riskLevel
  };
};

// ==================== UI 컴포넌트들 (SRP) ====================
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
    <div className="fixed top-4 right-4 z-60 animate-in slide-in-from-right duration-300">
      <div className={`${style} px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1">
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

const BackWarning = memo<{ isVisible: boolean }>(({ isVisible }) => {
  if (!isVisible) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-70 animate-in slide-in-from-bottom duration-300">
      <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">한 번 더 뒤로가기 하면 종료됩니다</span>
      </div>
    </div>
  );
});

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

const ConsolidatedSupplyLogo = memo<{ isDark?: boolean; size?: 'sm' | 'md' | 'lg' }>(({ isDark = false, size = 'lg' }) => {
  const sizeConfig = { sm: { container: 'w-16 h-16' }, md: { container: 'w-24 h-24' }, lg: { container: 'w-64 h-64' } };
  const { container } = sizeConfig[size];
  return (
    <div className={`flex items-center justify-center ${container} mx-auto mb-6`}>
      <img
        src="/logo-rokaf-supply.png"
        alt="공군 종합보급창 로고"
        className="w-full h-full object-contain"
        style={{ filter: isDark ? 'brightness(1.1)' : 'none' }}
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

const ModernLandingPage = memo<{ isDark: boolean; onStart: () => void }>(({ isDark, onStart }) => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 via-purple-500/15 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-80 h-80 bg-gradient-to-tr from-indigo-400/15 via-blue-500/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-full blur-2xl animate-bounce"></div>
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-gradient-to-l from-purple-400/10 to-indigo-500/10 rounded-full blur-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      </div>
      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-6 text-center pt-20">
        <div className="transform hover:scale-105 transition-transform duration-300 mb-16 mt-16">
          <ConsolidatedSupplyLogo isDark={isDark} size="lg" />
        </div>
        <div className="mb-20 space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">물류 작업현장<br />인시수 측정 타이머</h2>
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border border-white/20 shadow-2xl">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
            <span className="text-blue-100 text-sm font-medium tracking-wide">측정, 기록, 저장, 분석을 동시에</span>
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
                <div className="text-blue-200 text-sm">소수수점 단위 정확한 측정 </div>
              </div>
            </div>
          </div>
          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
            <div className="relative flex items-center space-x-4 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex	items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="text-white font-semibold text-base">실시간 분석</div>
                <div className="text-blue-200 text-sm">각종 통계도구 활용 및 결과 제공 </div>
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
                <div className="text-blue-200 text-sm">RAW DATA 내려받기 기능 제공 </div>
              </div>
            </div>
          </div>
        </div>
        <button onClick={onStart} className="group relative overflow-hidden px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2">
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

// ==================== 도움말 모달 ====================
const HelpModal = memo<{ isOpen: boolean; onClose: () => void; theme: Theme }>(({ isOpen, onClose, theme }) => {
  const helpSections = useMemo(
    () => [
      {
        title: '⌨️ 키보드 단축키',
        icon: Settings,
        items: [
          { key: '스페이스바', desc: '타이머 시작/정지', shortcut: 'SPACE' },
          { key: 'Enter', desc: '랩타임 기록 (측정 완료)', shortcut: '⏎' },
          { key: 'Esc', desc: '타이머 중지', shortcut: 'ESC' },
          { key: 'R', desc: '타이머 리셋', shortcut: 'R' }
        ]
      },
      {
        title: '👥 작업 유형 상세',
        icon: Users,
        items: [
          { key: '물자검수팀', desc: '입고 물자의 품질 및 수량 검수 작업' },
          { key: '저장관리팀', desc: '창고 내 물자 보관 및 관리 작업' },
          { key: '포장관리팀', desc: '출고 물자 포장 및 배송 준비 작업' }
        ]
      },
      {
        title: '📊 Gage R&R 분석 가이드',
        icon: BarChart3,
        items: [
          { key: '측정 준비', desc: '최소 2명 측정자, 2개 이상 대상자 설정' },
          { key: '측정 횟수', desc: '각 조건별 최소 3회, 권장 5-10회 측정' },
          { key: '분석 기준', desc: 'R&R < 10%: 우수, 10-30%: 양호, >30%: 개선 필요' },
          { key: '상세 분석', desc: '별도 페이지에서 ANOVA 및 전문 해석 제공' }
        ]
      },
      {
        title: '🎯 측정 모범 사례',
        icon: Target,
        items: [
          { key: '일관성', desc: '동일한 조건과 방법으로 측정' },
          { key: '정확성', desc: '측정 시작과 끝 지점을 명확히 정의' },
          { key: '재현성', desc: '측정자 간 동일한 절차 준수' },
          { key: '기록', desc: '측정 조건과 특이사항 상세 기록' }
        ]
      }
    ],
    []
  );

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${theme.card} rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border ${theme.border}`}>
        <div className={`${theme.accent} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-white" />
              <h3 className="text-xl font-bold text-white">사용자 가이드</h3>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-8">
          {helpSections.map((section, idx) => {
            const IconComp = section.icon;
            return (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-3">
                  <IconComp className={`w-5 h-5 ${theme.textSecondary}`} />
                  <h4 className={`text-lg font-semibold ${theme.text}`}>{section.title}</h4>
                </div>
                <div className="grid gap-3">
                  {section.items.map((item, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${theme.border} ${theme.surface} hover:shadow-md transition-shadow`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className={`font-medium ${theme.text} mb-1`}>{item.key}</div>
                          <div className={`text-sm ${theme.textMuted}`}>{item.desc}</div>
                        </div>
                        {item.shortcut && (
                          <div className={`px-2 py-1 rounded text-xs font-mono font-medium ${theme.surface} ${theme.textSecondary} border ${theme.border}`}>
                            {item.shortcut}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className={`px-6 py-4 border-t ${theme.border}`}>
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className={`${theme.accent} text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center gap-2`}
            >
              <CheckCircle className="w-4 h-4" />
              확인했습니다
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// 분류 기능: 정렬 키 타입
type SortKey = 'timestamp' | 'operator' | 'target' | 'time';

// 배치 편집 모달
interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: number[];
  lapTimesMap: Record<number, LapTime>;
  onApply: (newOperator: string, newTarget: string) => void;
}

const BatchEditModal = memo<BatchEditModalProps>(({ isOpen, onClose, selectedIds, lapTimesMap, onApply }) => {
  const [newOperator, setNewOperator] = useState('');
  const [newTarget, setNewTarget] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">일괄 편집</h3>
        <p className="text-sm text-gray-600">
          선택된 레코드 수: {selectedIds.length}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">새로운 측정자</label>
            <input
              type="text"
              value={newOperator}
              onChange={(e) => setNewOperator(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">새로운 대상자</label>
            <input
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            취소
          </button>
          <button
            onClick={() => {
              onApply(newOperator.trim(), newTarget.trim());
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:bg-gray-300"
            disabled={!newOperator.trim() && !newTarget.trim()}
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
});

// 측정 기록 목록 (정렬 + 검색 + 선택 기능)
interface HistoryListProps {
  lapTimes: LapTime[];
  filterOperator: string;
  filterTarget: string;
  sortKey: SortKey;
  onDelete: (id: number) => void;
  onToggleSelect: (id: number) => void;
  selectedIds: Set<number>;
  theme: Theme;
  isDark: boolean;
}

const HistoryList = memo<HistoryListProps>(({
  lapTimes,
  filterOperator,
  filterTarget,
  sortKey,
  onDelete,
  onToggleSelect,
  selectedIds,
  theme,
  isDark
}) => {
  // 필터링 + 정렬
  const filtered = useMemo(() => {
    let arr = lapTimes;
    if (filterOperator) {
      arr = arr.filter((lap) => lap.operator.includes(filterOperator));
    }
    if (filterTarget) {
      arr = arr.filter((lap) => lap.target.includes(filterTarget));
    }
    arr = [...arr].sort((a, b) => {
      switch (sortKey) {
        case 'operator':
          return a.operator.localeCompare(b.operator);
        case 'target':
          return a.target.localeCompare(b.target);
        case 'time':
          return a.time - b.time;
        case 'timestamp':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });
    return arr;
  }, [lapTimes, filterOperator, filterTarget, sortKey]);

  return (
    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
      <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="px-2 py-1"><input type="checkbox" disabled /></th>
            <th className="px-2 py-1">시간</th>
            <th className="px-2 py-1">측정자</th>
            <th className="px-2 py-1">대상자</th>
            <th className="px-2 py-1">날짜</th>
            <th className="px-2 py-1">삭제</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((lap) => (
            <tr key={lap.id} className="border-t border-gray-200 dark:border-gray-700">
              <td className="px-2 py-1 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(lap.id)}
                  onChange={() => onToggleSelect(lap.id)}
                />
              </td>
              <td className="px-2 py-1 font-mono">{formatTime(lap.time)}</td>
              <td className="px-2 py-1">{lap.operator}</td>
              <td className="px-2 py-1">{lap.target}</td>
              <td className="px-2 py-1">{lap.timestamp}</td>
              <td className="px-2 py-1 text-center">
                <button onClick={() => onDelete(lap.id)}>
                  <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                </button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-3 text-center text-gray-500">
                검색 결과가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

// 상세 분석 페이지 (모바일 최적화 + 로딩 표시 + 로그 변환 토글)
interface DetailedAnalysisPageProps {
  analysis: GageRRAnalysis;
  lapTimes: LapTime[];
  session: SessionData;
  theme: Theme;
  isDark: boolean;
  onBack: () => void;
  onDownload: () => void;
  isLoading: boolean;
  useLogTransform: boolean;
  setUseLogTransform: (val: boolean) => void;
}

const DetailedAnalysisPage = memo<DetailedAnalysisPageProps>(({
  analysis,
  lapTimes,
  session,
  theme,
  isDark,
  onBack,
  onDownload,
  isLoading,
  useLogTransform,
  setUseLogTransform
}) => {
  const basicStats = useMemo(() => {
    const times = lapTimes.map((lap) => lap.time);
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
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className={`p-2 rounded-lg ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-lg font-bold ${theme.text}`}>상세 분석 보고서</h1>
          <button
            onClick={onDownload}
            className={`flex items-center px-3 py-1 rounded-lg ${theme.accent} text-white hover:opacity-90`}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Download className="w-5 h-5 mr-1" />}
            다운로드
          </button>
        </div>
        <div className="px-4 pb-2 flex items-center justify-between">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={useLogTransform}
              onChange={(e) => setUseLogTransform(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className={`text-sm ${theme.text}`}>로그 변환 사용</span>
          </label>
          <span className={`text-sm ${theme.textMuted}`}>{session.name} | {session.workType}</span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 max-w-4xl mx-auto">
        {/* 종합 평가 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${theme.text}`}>종합 평가</h2>
            <div className="flex items-center gap-2">
              <StatusBadge status={analysis.gageRRPercent < 10 ? 'excellent' : analysis.gageRRPercent < 30 ? 'acceptable' : analysis.gageRRPercent < 50 ? 'marginal' : 'unacceptable'} size="md" isDark={isDark} />
              <div
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  analysis.interpretation.riskLevel === 'high'
                    ? isDark
                      ? 'bg-red-900/30 text-red-300'
                      : 'bg-red-50 text-red-800'
                    : analysis.interpretation.riskLevel === 'medium'
                    ? isDark
                      ? 'bg-yellow-900/30 text-yellow-300'
                      : 'bg-yellow-50 text-yellow-800'
                    : isDark
                    ? 'bg-green-900/30 text-green-300'
                    : 'bg-green-50 text-green-800'
                }`}
              >
                위험도: {analysis.interpretation.riskLevel === 'high' ? '높음' : analysis.interpretation.riskLevel === 'medium' ? '보통' : '낮음'}
              </div>
            </div>
          </div>
          <div className={`${theme.surface} p-4 rounded-lg mb-4`}>
            <p className={`text-base leading-relaxed ${theme.text}`}>{analysis.interpretation.overall}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border ${theme.border} ${theme.surface} hover:shadow-lg">
              <div className="flex justify-between mb-2">
                <BarChart3 className={`w-5 h-5 ${theme.textSecondary}`} />
              </div>
              <div className={`font-medium ${theme.textMuted} text-sm mb-1`}>Gage R&R 비율</div>
              <div className={`font-bold text-lg ${theme.text}`}>{analysis.gageRRPercent.toFixed(1)}%</div>
              <p className={`text-xs ${theme.textMuted} mt-2`}>
                {analysis.gageRRPercent < 10
                  ? '우수: 오차가 매우 낮습니다.'
                  : analysis.gageRRPercent < 30
                  ? '양호: 지속 모니터링 필요'
                  : '개선 필요: 신뢰도 낮음'}
              </p>
            </div>
            <div className="p-4 rounded-lg border ${theme.border} ${theme.surface} hover:shadow-lg">
              <div className="flex justify-between mb-2">
                <Target className={`w-5 h-5 ${theme.textSecondary}`} />
              </div>
              <div className={`font-medium ${theme.textMuted} text-sm mb-1`}>P/T 비율</div>
              <div className={`font-bold text-lg ${theme.text}`}>{analysis.ptRatio.toFixed(2)}</div>
              <p className={`text-xs ${theme.textMuted} mt-2`}>
                {analysis.ptRatio >= 0.1
                  ? '양호: 구별 능력 확보'
                  : '낮음: 시스템 개선 필요'}
              </p>
            </div>
            <div className="p-4 rounded-lg border ${theme.border} ${theme.surface} hover:shadow-lg">
              <div className="flex justify-between mb-2">
                <Calculator className={`w-5 h-5 ${theme.textSecondary}`} />
              </div>
              <div className={`font-medium ${theme.textMuted} text-sm mb-1`}>구별 범주 수 (NDC)</div>
              <div className={`font-bold text-lg ${theme.text}`}>{analysis.ndc}</div>
              <p className={`text-xs ${theme.textMuted} mt-2`}>
                {analysis.ndc >= 5
                  ? '우수: 미세 구별 가능'
                  : analysis.ndc >= 3
                  ? '보통: 제한적 구별'
                  : '낮음: 정밀도 개선 필요'}
              </p>
            </div>
          </div>
        </div>

        {/* ANOVA 및 기초 통계 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <h3 className={`text-lg font-bold ${theme.text} mb-4 flex items-center gap-2`}>
            <BarChart3 className="w-5 h-5 text-purple-500" />
            ANOVA 분산 성분 분석
          </h3>
          <div className="space-y-6">
            <div className={`${theme.surface} p-4 rounded-lg mb-4 border-l-4 border-purple-500`}>
              <p className={`text-sm ${theme.textMuted} leading-relaxed`}>
                <strong>ANOVA 분석</strong>은 전체 변동을 측정자, 대상자, 상호작용, 오차로 분해합니다.
              </p>
            </div>
            <div>
              <h4 className={`font-semibold ${theme.textSecondary} mb-3 flex items-center gap-2`}>
                <Calculator className="w-4 h-4" />
                기초 통계 정보
              </h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className={`${theme.surface} p-4 rounded-lg`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className={`font-medium ${theme.text} text-sm flex items-center gap-1`}>
                        <Clock className="w-3 h-3" /> 평균 측정시간
                      </span>
                      <span className={`text-xs ${theme.textMuted}`}>전체 측정 중심값</span>
                    </div>
                    <span className={`font-mono ${theme.textSecondary} text-lg font-bold`}>
                      {formatTime(basicStats.mean)}
                    </span>
                  </div>
                </div>
                <div className={`${theme.surface} p-4 rounded-lg`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className={`font-medium ${theme.text} text-sm flex items-center gap-1`}>
                        <Activity className="w-3 h-3" /> 변동계수 (CV)
                      </span>
                      <span className={`text-xs ${theme.textMuted}`}>상대적 변동 (표준편차/평균×100)</span>
                    </div>
                    <span className={`font-mono ${theme.textSecondary} text-lg font-bold`}>
                      {basicStats.cv.toFixed(1)}%
                    </span>
                  </div>
                  <p className={`text-xs ${theme.textMuted} mt-2`}>
                    {basicStats.cv < 5
                      ? '매우 일관됨'
                      : basicStats.cv < 10
                      ? '적절한 일관성'
                      : '변동 큼: 점검 필요'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 개선 권장사항 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <h3 className={`text-lg font-bold ${theme.text} mb-4 flex items-center gap-2`}>
            <TrendingUp className="w-5 h-5 text-green-500" />
            개선 권장사항
          </h3>
          <div className="space-y-3">
            {analysis.interpretation.recommendations.map((rec, idx) => (
              <div key={idx} className={`${theme.surface} p-4 rounded-lg border-l-4 border-green-500`}>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-50'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <span className={`text-xs font-bold ${isDark ? 'text-green-300' : 'text-green-600'}`}>{idx + 1}</span>
                  </div>
                  <p className={`text-sm ${theme.text}`}>{rec}</p>
                </div>
              </div>
            ))}
          </div>
        </div>  

        {/* 측정 데이터 요약 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <h3 className={`text-lg font-bold ${theme.text} mb-4`}>측정 데이터 요약</h3>
          <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-4">
            <div className={`${theme.surface} p-4 rounded-lg text-center`}>
              <div className={`text-2xl font-bold ${theme.text}`}>{lapTimes.length}</div>
              <div className={`text-xs ${theme.textMuted}`}>총 측정 횟수</div>
            </div>
            <div className={`${theme.surface} p-4 rounded-lg text-center`}>
              <div className={`text-2xl font-bold ${theme.text}`}>{session.operators.length}</div>
              <div className={`text-xs ${theme.textMuted}`}>측정자 수</div>
            </div>
            <div className={`${theme.surface} p-4 rounded-lg text-center`}>
              <div className={`text-2xl font-bold ${theme.text}`}>{session.targets.length}</div>
              <div className={`text-xs ${theme.textMuted}`}>대상자 수</div>
            </div>
            <div className={`${theme.surface} p-4 rounded-lg text-center`}>
              <div className={`text-2xl font-bold ${theme.text}`}>
                {Math.floor(lapTimes.length / (session.operators.length * session.targets.length))}
              </div>
              <div className={`text-xs ${theme.textMuted}`}>조건당 평균 측정</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ==================== 메인 컴포넌트 ====================
const EnhancedLogisticsTimer = () => {
  const [isDark, setIsDark] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);
  const [allLapTimes, setAllLapTimes] = useState<LapTime[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [selectedSessionHistory, setSelectedSessionHistory] = useState<SessionData | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false
  });

  // 필터, 정렬 상태
  const [filterOperator, setFilterOperator] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');

  // 배치 편집 관련
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // 폼 상태
  const [sessionName, setSessionName] = useState('');
  const [workType, setWorkType] = useState('');
  const [operators, setOperators] = useState<string[]>(['']);
  const [targets, setTargets] = useState<string[]>(['']);
  const [currentOperator, setCurrentOperator] = useState('');
  const [currentTarget, setCurrentTarget] = useState('');

  // 분석 관련
  const [analysisResult, setAnalysisResult] = useState<GageRRAnalysis | null>(null);
  const [useLogTransform, setUseLogTransform] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  // 로딩 상태
  const [isLoadingDownload, setIsLoadingDownload] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // 뒤로가기 방지 훅
  const { showBackWarning } = useBackButtonPrevention();

  // 테마
  const theme = useMemo(() => (THEME_COLORS[isDark ? 'dark' : 'light']), [isDark]);

  // 로컬스토리지 → 초기화
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem('ELTsessions');
      const storedAllLap = localStorage.getItem('ELTallLapTimes');
      const storedCurrent = localStorage.getItem('ELTcurrentSession');
      if (storedSessions) setSessions(JSON.parse(storedSessions));
      if (storedAllLap) setAllLapTimes(JSON.parse(storedAllLap));
      if (storedCurrent) setCurrentSession(JSON.parse(storedCurrent));
    } catch (error) {
      console.error('로컬스토리지 초기화 오류:', error);
    }
  }, []);

  // 로컬스토리지 → 저장(세션 목록, 전체 랩타임, 현재 세션)
  useEffect(() => {
    localStorage.setItem('ELTsessions', JSON.stringify(sessions));
    localStorage.setItem('ELTallLapTimes', JSON.stringify(allLapTimes));
    if (currentSession) localStorage.setItem('ELTcurrentSession', JSON.stringify(currentSession));
  }, [sessions, allLapTimes, currentSession]);

  // 타이머 로직
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime(Date.now() - startTimeRef.current);
      }, 10);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // 다크모드 적용
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showDetailedAnalysis || showNewSessionModal || showHelp || selectedSessionHistory) return;
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
  }, [
    isRunning,
    currentSession,
    currentOperator,
    currentTarget,
    showDetailedAnalysis,
    showNewSessionModal,
    showHelp,
    selectedSessionHistory
  ]);

  // 토스트 표시
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  // 타이머 토글
  const toggleTimer = useCallback(() => {
    if (!currentSession) {
      showToast('먼저 작업 세션을 생성해주세요.', 'warning');
      return;
    }
    if (isRunning) {
      setIsRunning(false);
    } else {
      if (currentTime > 0 && currentTime > 30 * 60 * 1000) {
        const confirmOver = window.confirm('측정 시간이 30분을 초과했습니다. 계속 진행하시겠습니까?');
        if (!confirmOver) return;
      }
      startTimeRef.current = Date.now() - currentTime;
      setIsRunning(true);
    }
  }, [isRunning, currentTime, currentSession, showToast]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
  }, []);

  // 리셋
  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
    setLapTimes([]);
    setAllLapTimes((prev) => prev.filter((lap) => lap.sessionId !== currentSession?.id));
    if (currentSession) {
      const updatedSession: SessionData = { ...currentSession, lapTimes: [] };
      setCurrentSession(updatedSession);
      setSessions((prev) =>
        prev.map((s) => (s.id === currentSession.id ? updatedSession : s))
      );
    }
    showToast('측정 기록이 모두 초기화되었습니다.', 'success');
  }, [currentSession, showToast]);

  // 랩 기록
  const recordLap = useCallback(() => {
    if (!currentSession || !currentOperator || !currentTarget) {
      showToast('측정자와 대상자를 선택해주세요.', 'warning');
      return;
    }
    if (currentTime === 0) {
      showToast('측정 시간이 0입니다. 타이머를 시작해주세요.', 'warning');
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
    setAllLapTimes((prev) => [...prev, newLap]);

    setIsRunning(false);
    setCurrentTime(0);

    const updatedSession: SessionData = { ...currentSession, lapTimes: updatedLaps };
    setCurrentSession(updatedSession);
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSession.id ? updatedSession : s))
    );

    showToast('측정이 완료되었습니다.', 'success');
  }, [currentTime, currentSession, currentOperator, currentTarget, lapTimes, showToast]);

  // 개별 삭제
  const deleteLapTime = useCallback(
    (lapId: number) => {
      const updatedLaps = lapTimes.filter((lap) => lap.id !== lapId);
      const updatedAllLaps = allLapTimes.filter((lap) => lap.id !== lapId);
      setLapTimes(updatedLaps);
      setAllLapTimes(updatedAllLaps);
      if (currentSession) {
        const updatedSession: SessionData = { ...currentSession, lapTimes: updatedLaps };
        setCurrentSession(updatedSession);
        setSessions((prev) =>
          prev.map((s) => (s.id === currentSession.id ? updatedSession : s))
        );
      }
      showToast('측정 기록이 삭제되었습니다.', 'success');
    },
    [lapTimes, allLapTimes, currentSession, showToast]
  );

  // 세션 생성
  const createSession = useCallback(() => {
    if (!sessionName || !workType || operators.some((op) => !op.trim()) || targets.some((tg) => !tg.trim())) {
      showToast('모든 필드를 입력해주세요.', 'warning');
      return;
    }
    const newSession: SessionData = {
      id: Date.now().toString(),
      name: sessionName,
      workType,
      operators: operators.filter((op) => op.trim()),
      targets: targets.filter((tg) => tg.trim()),
      lapTimes: [],
      startTime: new Date().toLocaleString('ko-KR'),
      isActive: true
    };
    setSessions((prev) => [...prev, newSession]);
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
    showToast('새 세션이 생성되었습니다.', 'success');
  }, [sessionName, workType, operators, targets, showToast]);

  const addOperator = useCallback(() => setOperators((prev) => [...prev, '']), []);
  const removeOperator = useCallback(
    (index: number) => {
      if (operators.length > 1) {
        setOperators(operators.filter((_, i) => i !== index));
      }
    },
    [operators]
  );
  const addTarget = useCallback(() => setTargets((prev) => [...prev, '']), []);
  const removeTarget = useCallback(
    (index: number) => {
      if (targets.length > 1) {
        setTargets(targets.filter((_, i) => i !== index));
      }
    },
    [targets]
  );

  // 상세 분석 다운로드 (로딩, 분석 로직 포함)
  const downloadDetailedAnalysis = useCallback(async () => {
    if (lapTimes.length < 6) {
      showToast('상세 분석을 위해서는 최소 6개의 측정 기록이 필요합니다.', 'warning');
      return;
    }
    if (!currentSession) {
      showToast('활성 세션이 없습니다.', 'error');
      return;
    }
    setIsLoadingAnalysis(true);
    try {
      // Gage R&R 분석 수행
      const result = calculateGageRR(lapTimes, useLogTransform);
      setAnalysisResult(result);

      // CSV 내보내기 데이터 준비
      const analysisData: (string | number)[][] = [
        ['=== Gage R&R 상세 분석 보고서 ==='],
        [''],
        ['세션명', currentSession.name],
        ['작업유형', currentSession.workType],
        ['측정일시', currentSession.startTime],
        ['총 측정횟수', lapTimes.length],
        [''],
        ['=== 분석 결과 ==='],
        ['Gage R&R 비율 (%)', result.gageRRPercent.toFixed(1)],
        ['구별 범주 수 (NDC)', result.ndc],
        ['P/T 비율', result.ptRatio.toFixed(2)],
        ['측정시스템 상태', result.gageRRPercent < 10 ? '우수' : result.gageRRPercent < 30 ? '양호' : result.gageRRPercent < 50 ? '보통' : '불량'],
        [''],
        ['=== ANOVA 분산 성분 ==='],
        ['측정자 변동', result.anova.operator.toFixed(2), `${result.anova.operatorPercent.toFixed(1)}%`],
        ['대상자 변동', result.anova.part.toFixed(2), `${result.anova.partPercent.toFixed(1)}%`],
        ['상호작용 변동', result.anova.interaction.toFixed(2), `${result.anova.interactionPercent.toFixed(1)}%`],
        ['오차 변동', result.anova.error.toFixed(2), `${result.anova.errorPercent.toFixed(1)}%`],
        ['총 분산', result.anova.total.toFixed(2)],
        [''],
        ['=== 기초 통계 ==='],
        ['평균 측정시간', formatTime(basicStats.mean)],
        ['변동계수 (CV)', `${basicStats.cv.toFixed(1)}%`],
        ['최소 측정', formatTime(basicStats.min)],
        ['최대 측정', formatTime(basicStats.max)],
        [''],
        ['=== 분석 권장사항 ==='],
        ...result.interpretation.recommendations.map((rc, i) => [`${i + 1}.`, rc])
      ];

      const csvContent = createCSVContent(analysisData);
      const filename = generateFileName('GageRR_Report', currentSession.name);
      downloadCSVFile(csvContent, filename);
      showToast('상세 분석 다운로드가 완료되었습니다.', 'success');
    } catch (error) {
      console.error('다운로드 오류:', error);
      showToast('다운로드 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [lapTimes, currentSession, useLogTransform, showToast]);

  // 히스토리 조회 클릭 시
  const openHistory = useCallback((session: SessionData) => {
    setSelectedSessionHistory(session);
    setLapTimes(session.lapTimes);
    setFilterOperator('');
    setFilterTarget('');
    setSortKey('timestamp');
    setSelectedIds(new Set());
  }, []);

  // 히스토리 닫기
  const closeHistory = useCallback(() => {
    setSelectedSessionHistory(null);
    setLapTimes([]);
  }, []);

  // 로딩 상태에서 버튼 비활성화 처리는 isLoadingDownload || isLoadingAnalysis
  const isAnyLoading = isLoadingDownload || isLoadingAnalysis;

  // Batch edit: 선택 toggle
  const toggleSelect = useCallback(
    (id: number) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    []
  );

  // Batch edit 적용
  const applyBatchEdit = useCallback(
    (newOp: string, newTg: string) => {
      if (!selectedSessionHistory) return;
      const updatedAll = allLapTimes.map((lap) => {
        if (selectedIds.has(lap.id)) {
          return {
            ...lap,
            operator: newOp || lap.operator,
            target: newTg || lap.target
          };
        }
        return lap;
      });
      setAllLapTimes(updatedAll);
      // 해당 세션 내에서도 업데이트
      const updatedSession = {
        ...selectedSessionHistory,
        lapTimes: updatedAll.filter((lap) => lap.sessionId === selectedSessionHistory.id)
      };
      setSelectedSessionHistory(updatedSession);
      setSessions((prev) =>
        prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
      );
      setLapTimes(updatedSession.lapTimes);
      setSelectedIds(new Set());
      setIsBatchModalOpen(false);
      showToast('일괄 편집이 완료되었습니다.', 'success');
    },
    [allLapTimes, selectedIds, selectedSessionHistory, showToast, setSessions]
  );

  // 세션 삭제
  const deleteSession = useCallback(
    (id: string) => {
      const confirmDel = window.confirm('이 세션을 삭제하시겠습니까?');
      if (!confirmDel) return;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setAllLapTimes((prev) => prev.filter((lap) => lap.sessionId !== id));
      if (currentSession?.id === id) {
        setCurrentSession(null);
        setLapTimes([]);
      }
      showToast('세션이 삭제되었습니다.', 'success');
    },
    [currentSession, showToast]
  );

  // 세션 활성화/비활성화
  const toggleSessionActive = useCallback(
    (session: SessionData) => {
      const updated = { ...session, isActive: !session.isActive };
      setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
      if (currentSession?.id === session.id) {
        setCurrentSession(updated);
      }
    },
    [currentSession]
  );

  // 세션 클릭 시 상세화면 or 히스토리화면
  const renderMainContent = () => {
    if (showLanding) {
      return <ModernLandingPage isDark={isDark} onStart={() => setShowLanding(false)} />;
    }
    if (!currentSession && !selectedSessionHistory) {
      // 세션 목록
      return (
        <div className={`min-h-screen ${theme.bg} py-8`}>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center px-4">
              <h2 className={`text-2xl font-bold ${theme.text}`}>세션 목록</h2>
              <button
                onClick={() => setShowNewSessionModal(true)}
                className={`${theme.accent} text-white px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-1`}
              >
                <Plus className="w-5 h-5" />
                새 세션
              </button>
            </div>
            <div className="space-y-4 px-4">
              {sessions.length === 0 && (
                <p className={`text-center ${theme.textMuted}`}>생성된 세션이 없습니다.</p>
              )}
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex justify-between items-center p-4 border rounded-lg ${theme.card} ${theme.border} hover:shadow-md`}
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => openHistory(session)}
                  >
                    <h3 className={`text-lg font-semibold ${theme.text}`}>{session.name}</h3>
                    <p className={`text-sm ${theme.textMuted}`}>{session.startTime}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={session.isActive}
                        onChange={() => toggleSessionActive(session)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span className={`${theme.textSecondary}`}>활성</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 히스토리 화면
    if (selectedSessionHistory) {
      return (
        <div className={`min-h-screen ${theme.bg}`}>
          <div className={`${theme.card} shadow-sm border-b ${theme.border} sticky top-0 z-40`}>
            <div className="px-4 py-3 flex items-center justify-between">
              <button onClick={closeHistory} className={`p-2 rounded-lg ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className={`text-lg font-bold ${theme.text}`}>{`"${selectedSessionHistory.name}" 기록`}</h1>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className={`flex items-center px-3 py-1 rounded-lg ${theme.accent} text-white hover:opacity-90`}
                disabled={selectedIds.size === 0}
              >
                <Zap className="w-5 h-5 mr-1" />
                일괄 편집
              </button>
            </div>
            <div className="px-4 pb-2 flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="측정자 검색"
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value)}
                  className={`border rounded-md px-2 py-1 text-sm ${theme.input}`}
                />
                <input
                  type="text"
                  placeholder="대상자 검색"
                  value={filterTarget}
                  onChange={(e) => setFilterTarget(e.target.value)}
                  className={`border rounded-md px-2 py-1 text-sm ${theme.input}`}
                />
              </div>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className={`border rounded-md px-2 py-1 text-sm ${theme.input}`}
              >
                <option value="timestamp">최신순</option>
                <option value="time">시간순</option>
                <option value="operator">측정자순</option>
                <option value="target">대상자순</option>
              </select>
            </div>
            <HistoryList
              lapTimes={lapTimes}
              filterOperator={filterOperator}
              filterTarget={filterTarget}
              sortKey={sortKey}
              onDelete={deleteLapTime}
              onToggleSelect={toggleSelect}
              selectedIds={selectedIds}
              theme={theme}
              isDark={isDark}
            />
          </div>
          <BatchEditModal
            isOpen={isBatchModalOpen}
            onClose={() => setIsBatchModalOpen(false)}
            selectedIds={Array.from(selectedIds)}
            lapTimesMap={Object.fromEntries(allLapTimes.map((lap) => [lap.id, lap]))}
            onApply={applyBatchEdit}
          />
          <div className="h-4"></div>
        </div>
      );
    }

    // 상세 분석 화면
    if (showDetailedAnalysis && analysisResult && currentSession) {
      return (
        <DetailedAnalysisPage
          analysis={analysisResult}
          lapTimes={lapTimes}
          session={currentSession}
          theme={theme}
          isDark={isDark}
          onBack={() => setShowDetailedAnalysis(false)}
          onDownload={downloadDetailedAnalysis}
          isLoading={isLoadingAnalysis}
          useLogTransform={useLogTransform}
          setUseLogTransform={setUseLogTransform}
        />
      );
    }

    // 실제 측정 화면
    return (
      <div className={`min-h-screen ${theme.bg}`}>
        <div className={`${theme.card} shadow-sm border-b ${theme.border} sticky top-0 z-40`}>
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className={`text-lg font-bold ${theme.text}`}>측정 중</h1>
            <button onClick={() => setShowHelp(true)} className={`p-2 ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}>
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-4 py-6 max-w-xl mx-auto space-y-6">
          <div className="flex justify-center items-center space-x-4">
            <div className="text-center">
              <div className={`font-mono text-5xl ${theme.text}`}>{formatTime(currentTime)}</div>
              <div className={`text-sm ${theme.textMuted}`}>(ms 단위)</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">측정자</label>
              <select
                value={currentOperator}
                onChange={(e) => setCurrentOperator(e.target.value)}
                className={`block w-full ${theme.input} rounded-md text-sm`}
                disabled={isAnyLoading}
              >
                {currentSession?.operators.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대상자</label>
              <select
                value={currentTarget}
                onChange={(e) => setCurrentTarget(e.target.value)}
                className={`block w-full ${theme.input} rounded-md text-sm`}
                disabled={isAnyLoading}
              >
                {currentSession?.targets.map((tg) => (
                  <option key={tg} value={tg}>{tg}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={toggleTimer}
              className={`px-6 py-3 rounded-lg font-bold text-lg ${theme.accent} text-white hover:opacity-90 flex items-center space-x-2`}
              disabled={isAnyLoading}
            >
              {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              <span>{isRunning ? '중지' : '시작'}</span>
            </button>
            <button
              onClick={recordLap}
              className={`px-6 py-3 rounded-lg font-bold text-lg bg-green-600 text-white hover:bg-green-700 flex items-center space-x-2`}
              disabled={isAnyLoading || !isRunning}
            >
              <Clock className="w-6 h-6" />
              <span>기록</span>
            </button>
          </div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={resetTimer}
              className={`px-4 py-2 rounded-lg text-sm ${theme.warning} text-white hover:opacity-90 flex items-center gap-1`}
              disabled={isAnyLoading}
            >
              <RotateCcw className="w-5 h-5" />
              초기화
            </button>
            <button
              onClick={() => setShowDetailedAnalysis(true)}
              className={`px-4 py-2 rounded-lg text-sm ${theme.success} text-white hover:opacity-90 flex items-center gap-1`}
              disabled={isAnyLoading || lapTimes.length < 6}
            >
              <BarChart3 className="w-5 h-5" />
              분석
            </button>
          </div>
        </div>

        {toast.isVisible && (
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={toast.isVisible}
            onClose={() => setToast({ ...toast, isVisible: false })}
          />
        )}
        <BackWarning isVisible={showBackWarning} />
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} theme={theme} />
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className={`flex justify-end px-4 py-3 border-b ${theme.border} ${theme.card}`}>
        <button onClick={() => setIsDark((prev) => !prev)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
          {isDark ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-gray-600" />}
        </button>
      </header>
      <main className="flex-grow">{renderMainContent()}</main>
    </div>
  );
};

export default EnhancedLogisticsTimer;
