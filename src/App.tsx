import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Download,
  Plus,
  Users,
  Package,
  Clock,
  BarChart3,
  FileText,
  Calculator,
  Zap,
  Target,
  Home,
  HelpCircle,
  RefreshCw,
  LogOut,
  Moon,
  Sun,
  TrendingUp,
  PieChart,
  Info,
  CheckCircle,
  AlertCircle,
  XCircle,
  Timer,
  Activity,
  Settings,
  Trash2,
  Filter,
  Search,
  X,
  Minus,
  ArrowLeft,
  TrendingUp as TrendingUpIcon,
  AlertTriangle,
  Share2,
} from 'lucide-react';
import { shapiroWilkTest } from 'simple-statistics';

// ==================== 타입 정의 (Single Responsibility) ====================
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
  usl?: number;
  lsl?: number;
}

interface ANOVAResult {
  operator: number;
  part: number;
  interaction: number;
  error: number;
  total: number;
  operatorPercent: number;
  partPercent: number;
  interactionPercent: number;
  errorPercent: number;
}

interface Interpretation {
  overall: string;
  repeatability: string;
  reproducibility: string;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
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
  anova: ANOVAResult;
  interpretation: Interpretation;
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

// ==================== 상수 및 테마 (Open/Closed Principle) ====================
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
    surfaceHover: 'hover:bg-gray-100',
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
    surfaceHover: 'hover:bg-gray-600',
  },
} as const;

const STATUS_COLORS = {
  excellent: {
    light: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-200',
      icon: 'text-green-600',
    },
    dark: {
      bg: 'bg-green-900/30',
      text: 'text-green-300',
      border: 'border-green-700',
      icon: 'text-green-400',
    },
  },
  acceptable: {
    light: {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      icon: 'text-blue-600',
    },
    dark: {
      bg: 'bg-blue-900/30',
      text: 'text-blue-300',
      border: 'border-blue-700',
      icon: 'text-blue-400',
    },
  },
  marginal: {
    light: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
    },
    dark: {
      bg: 'bg-yellow-900/30',
      text: 'text-yellow-300',
      border: 'border-yellow-700',
      icon: 'text-yellow-400',
    },
  },
  unacceptable: {
    light: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-200',
      icon: 'text-red-600',
    },
    dark: {
      bg: 'bg-red-900/30',
      text: 'text-red-300',
      border: 'border-red-700',
      icon: 'text-red-400',
    },
  },
} as const;

// ==================== 유틸리티 함수 (Pure Functions) ====================
const formatTime = (ms: number): string => {
  if (ms < 0) return '00:00.00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes
    .toString()
    .padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
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
    row
      .map((cell) => {
        const cellStr = String(cell);
        if (
          cellStr.includes(',') ||
          cellStr.includes('\n') ||
          cellStr.includes('"')
        ) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      })
      .join(',')
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

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [backPressCount]);

  return { showBackWarning };
};

// ==================== Gage R&R 분석 로직 ====================
const calculateGageRR = (
  lapTimes: LapTime[],
  usl?: number,
  lsl?: number
): GageRRAnalysis => {
  const defaultResult: GageRRAnalysis = {
    repeatability: 0,
    reproducibility: 0,
    gageRR: 0,
    partVariation: 0,
    totalVariation: 0,
    gageRRPercent: 100,
    ndc: 0,
    status: 'unacceptable',
    cpk: 0,
    anova: {
      operator: 0,
      part: 0,
      interaction: 0,
      error: 0,
      total: 0,
      operatorPercent: 0,
      partPercent: 0,
      interactionPercent: 0,
      errorPercent: 0,
    },
    interpretation: {
      overall: '분석을 위한 데이터가 부족합니다.',
      repeatability: '반복성 분석 불가',
      reproducibility: '재현성 분석 불가',
      recommendations: ['최소 6개 이상의 측정 데이터가 필요합니다.'],
      riskLevel: 'high',
    },
  };

  if (!lapTimes || lapTimes.length < 6) return defaultResult;

  try {
    // 로그 변환 (ε 보정)
    const epsilon = 0.001;
    const logValues = lapTimes
      .map((lap) => lap.time)
      .filter((t) => t >= 0)
      .map((t) => Math.log(t + epsilon));
    if (logValues.length < 6) return defaultResult;

    // 정규성 검정
    const { pValue: pValueLog } = shapiroWilkTest(logValues);
    // 만약 pValueLog < 0.05 이면 정규성 부족, 그러나 분석 진행은 계속 (비정규 데이터 경고만 삽입)
    // (Interpretation 단계에서 경고를 추가할 수 있음)

    // ANOVA용 데이터 구조: { [operator]: { [target]: number[] } }
    const cellData: Record<string, Record<string, number[]>> = {};
    lapTimes.forEach((lap) => {
      const op = lap.operator.trim();
      const tg = lap.target.trim();
      if (op && tg && lap.time > 0) {
        if (!cellData[op]) cellData[op] = {};
        if (!cellData[op][tg]) cellData[op][tg] = [];
        cellData[op][tg].push(Math.log(lap.time + epsilon));
      }
    });

    const operators = Object.keys(cellData);
    const targets = Array.from(
      new Set(
        operators.flatMap((op) => Object.keys(cellData[op]))
      )
    );

    const operatorCount = operators.length;
    const targetCount = targets.length;

    if (operatorCount < 1 || targetCount < 1) return defaultResult;

    // 불균형 데이터 검증: 각 셀마다 최소 2개 이상 데이터
    const imbalanceWarnings: string[] = [];
    operators.forEach((op) => {
      targets.forEach((tg) => {
        const count = cellData[op]?.[tg]?.length || 0;
        if (count < 2) {
          imbalanceWarnings.push(
            `연산자 "${op}" × 대상 "${tg}" 조합에 반복 측정 데이터(${count}회)가 부족합니다.`
          );
        }
      });
    });

    // 전체 관측치 수
    const totalObs = logValues.length;

    // 전체 평균
    const globalMean =
      logValues.reduce((sum, val) => sum + val, 0) / logValues.length;

    // SS_Total
    const ssTotal = logValues.reduce(
      (acc, val) => acc + Math.pow(val - globalMean, 2),
      0
    );

    // SS_Operator, SS_Part, SS_Cell
    let ssOperator = 0;
    let ssPart = 0;
    let ssInteraction = 0;

    const opMeans: Record<string, number> = {};
    const tgMeans: Record<string, number> = {};
    const cellMeans: Record<string, Record<string, number>> = {};

    // Operator means
    operators.forEach((op) => {
      const allVals = targets.flatMap((tg) => cellData[op]?.[tg] || []);
      const meanOp =
        allVals.reduce((sum, val) => sum + val, 0) / Math.max(1, allVals.length);
      opMeans[op] = meanOp;
      ssOperator +=
        allVals.length * Math.pow(meanOp - globalMean, 2);
    });

    // Part means
    targets.forEach((tg) => {
      const allVals = operators.flatMap((op) => cellData[op]?.[tg] || []);
      const meanTg =
        allVals.reduce((sum, val) => sum + val, 0) / Math.max(1, allVals.length);
      tgMeans[tg] = meanTg;
      ssPart += allVals.length * Math.pow(meanTg - globalMean, 2);
    });

    // Cell means & SS_Cell (for interaction)
    let ssCellTotal = 0;
    let dfOperator = operatorCount - 1;
    let dfPart = targetCount - 1;
    let dfInteraction = dfOperator * dfPart;
    let dfError = 0;

    operators.forEach((op) => {
      cellMeans[op] = {};
      targets.forEach((tg) => {
        const arr = cellData[op]?.[tg] || [];
        const meanCell =
          arr.reduce((sum, val) => sum + val, 0) / Math.max(1, arr.length);
        cellMeans[op][tg] = meanCell;
        // SS_Cell: interaction component
        ssInteraction +=
          arr.length *
          Math.pow(
            meanCell - opMeans[op] - tgMeans[tg] + globalMean,
            2
          );
        // Sum of squares for error (within cells)
        arr.forEach((val) => {
          dfError += 1;
          ssCellTotal += Math.pow(val - meanCell, 2);
        });
      });
    });
    dfError -= operatorCount * targetCount; // each cell subtract 1 for its mean

    // MS 계산
    const msOperator = ssOperator / Math.max(1, dfOperator);
    const msPart = ssPart / Math.max(1, dfPart);
    const msInteraction = ssInteraction / Math.max(1, dfInteraction);
    const msError = ssCellTotal / Math.max(1, dfError);

    // 분산 성분 추출
    const sigmaError = Math.sqrt(msError);
    const sigmaInteraction = Math.sqrt(
      Math.max(0, (msInteraction - msError) / Math.max(1, operators.flatMap((op) =>
        targets.map((tg) =>
          (cellData[op]?.[tg]?.length || 0) > 0
            ? cellData[op][tg].length
            : 0
        )
      ).reduce((a, b) => a + b, 0)))
    );
    const sigmaOperator = Math.sqrt(
      Math.max(0, (msOperator - msInteraction) / Math.max(1, targetCount))
    );
    const sigmaPart = Math.sqrt(
      Math.max(0, (msPart - msInteraction) / Math.max(1, operatorCount))
    );

    // 로그 변환된 반복성, 재현성, 부품 변동
    const repeatability = sigmaError;
    const reproducibility = sigmaOperator;
    const partVariation = sigmaPart;

    // 전체 변동 (로그 스케일)
    const gageRR = Math.sqrt(
      repeatability ** 2 + reproducibility ** 2
    );
    const totalVariation = Math.sqrt(
      gageRR ** 2 + partVariation ** 2 + sigmaInteraction ** 2
    );
    const gageRRPercent =
      totalVariation > 0
        ? Math.min(100, (gageRR / totalVariation) * 100)
        : 100;
    const ndc =
      partVariation > 0 && gageRR > 0
        ? Math.max(0, Math.floor((partVariation / gageRR) * 1.41))
        : 0;

    // Cpk: USL/LSL 반영
    let cpk = 0;
    if (usl !== undefined && lsl !== undefined) {
      // 원 단위 평균과 표준편차
      const values = lapTimes.map((lap) => lap.time);
      const meanOrig =
        values.reduce((sum, val) => sum + val, 0) / values.length;
      const varianceOrig =
        values.reduce((acc, val) => acc + Math.pow(val - meanOrig, 2), 0) /
        Math.max(1, values.length - 1);
      const stdOrig = Math.sqrt(varianceOrig);
      cpk = Math.max(
        0,
        Math.min(
          (usl - meanOrig) / (3 * stdOrig),
          (meanOrig - lsl) / (3 * stdOrig)
        )
      );
    }

    // ANOVA 결과 객체
    const anova: ANOVAResult = {
      operator: Math.max(0, sigmaOperator ** 2),
      part: Math.max(0, sigmaPart ** 2),
      interaction: Math.max(0, sigmaInteraction ** 2),
      error: Math.max(0, sigmaError ** 2),
      total: Math.max(0, sigmaOperator ** 2 + sigmaPart ** 2 + sigmaInteraction ** 2 + sigmaError ** 2),
      operatorPercent:
        totalVariation > 0
          ? (sigmaOperator ** 2 / (sigmaOperator ** 2 + sigmaPart ** 2 + sigmaInteraction ** 2 + sigmaError ** 2)) *
            100
          : 0,
      partPercent:
        totalVariation > 0
          ? (sigmaPart ** 2 / (sigmaOperator ** 2 + sigmaPart ** 2 + sigmaInteraction ** 2 + sigmaError ** 2)) *
            100
          : 0,
      interactionPercent:
        totalVariation > 0
          ? (sigmaInteraction ** 2 / (sigmaOperator ** 2 + sigmaPart ** 2 + sigmaInteraction ** 2 + sigmaError ** 2)) *
            100
          : 0,
      errorPercent:
        totalVariation > 0
          ? (sigmaError ** 2 / (sigmaOperator ** 2 + sigmaPart ** 2 + sigmaInteraction ** 2 + sigmaError ** 2)) *
            100
          : 0,
    };

    // 상태 결정
    let status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
    if (gageRRPercent < 10) status = 'excellent';
    else if (gageRRPercent < 30) status = 'acceptable';
    else if (gageRRPercent < 50) status = 'marginal';
    else status = 'unacceptable';

    // 해석 생성
    const interpretation = generateInterpretation(
      gageRRPercent,
      repeatability,
      reproducibility,
      cpk,
      ndc,
      anova,
      imbalanceWarnings,
      pValueLog
    );

    return {
      repeatability: Math.max(0, repeatability),
      reproducibility: Math.max(0, reproducibility),
      gageRR: Math.max(0, gageRR),
      partVariation: Math.max(0, partVariation),
      totalVariation: Math.max(0, totalVariation),
      gageRRPercent: Math.max(0, gageRRPercent),
      ndc: Math.max(0, ndc),
      status,
      cpk: Math.max(0, cpk),
      anova,
      interpretation,
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
  cpk: number,
  ndc: number,
  anova: ANOVAResult,
  imbalanceWarnings: string[],
  pValueLog: number
): Interpretation => {
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

  if (imbalanceWarnings.length > 0) {
    recommendations.push(...imbalanceWarnings);
  }

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

  if (cpk < 1.33) {
    recommendations.push('공정 능력 개선 필요');
  }

  if (ndc < 5) {
    recommendations.push('측정 시스템의 구별 능력 향상 필요');
  }

  if (anova.operatorPercent > 30) {
    recommendations.push('측정자 간 변동 감소를 위한 교육 강화');
  }

  if (pValueLog < 0.05) {
    recommendations.push('데이터 정규성 위반: 로그 변환 이후에도 정규성 검토 필요');
  }

  const riskLevel: 'low' | 'medium' | 'high' =
    gageRRPercent < 10 ? 'low' : gageRRPercent < 30 ? 'medium' : 'high';

  return {
    overall,
    repeatability: repeatabilityInterpretation,
    reproducibility: reproducibilityInterpretation,
    recommendations,
    riskLevel,
  };
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
    info: { style: 'bg-blue-500 text-white', icon: Info },
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
      unacceptable: { icon: XCircle, text: '불량' },
    };
    return statusMap[status];
  }, [status]);

  const colors = STATUS_COLORS[status][isDark ? 'dark' : 'light'];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses[size]} ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <Icon className={iconSizes[size]} />
      {config.text}
    </span>
  );
});

// 로고 컴포넌트
const ConsolidatedSupplyLogo = memo<{
  isDark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}>(({ isDark = false, size = 'lg' }) => {
  const sizeConfig = {
    sm: { container: 'w-16 h-16' },
    md: { container: 'w-24 h-24' },
    lg: { container: 'w-64 h-64' },
  };

  const { container } = sizeConfig[size];

  return (
    <div className={`flex items-center justify-center ${container} mx-auto mb-6`}>
      <img
        src="/logo-rokaf-supply.png"
        alt="공군 종합보급창 로고"
        className="w-full h-full object-contain"
        style={{
          filter: isDark ? 'brightness(1.1)' : 'none',
        }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent && !parent.querySelector('.logo-fallback')) {
            const fallback = document.createElement('div');
            fallback.className =
              'logo-fallback flex items-center justify-center w-full h-full bg-blue-600 text-white rounded-full text-sm font-bold';
            fallback.textContent = '종합보급창';
            parent.appendChild(fallback);
          }
        }}
      />
    </div>
  );
});

// 랜딩 페이지
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-6 text-center pt-20">
        <div className="transform hover:scale-105 transition-transform duration-300 mb-16 mt-16">
          <ConsolidatedSupplyLogo isDark={isDark} size="lg" />
        </div>

        <div className="mb-20 space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
            물류 작업현장
            <br />
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
                <div className="text-blue-200 text-sm">소수수점 단위 정확한 측정</div>
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
              <div
                className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                style={{ animationDelay: '0.2s' }}
              ></div>
              <div
                className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                style={{ animationDelay: '0.4s' }}
              ></div>
            </div>
            <span className="text-blue-200 text-sm font-medium">시스템 준비 완료</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// 도움말 컴포넌트
const HelpModal = memo<{
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}>(({ isOpen, onClose, theme }) => {
  const helpSections = useMemo(
    () => [
      {
        title: '⌨️ 키보드 단축키',
        icon: Settings,
        items: [
          { key: '스페이스바', desc: '타이머 시작/정지', shortcut: 'SPACE' },
          { key: 'Enter', desc: '랩타임 기록 (측정 완료)', shortcut: '⏎' },
          { key: 'Esc', desc: '타이머 중지', shortcut: 'ESC' },
          { key: 'R', desc: '타이머 리셋', shortcut: 'R' },
        ],
      },
      {
        title: '👥 작업 유형 상세',
        icon: Users,
        items: [
          {
            key: '물자검수팀',
            desc: '입고 물자의 품질 및 수량 검수 작업',
          },
          {
            key: '저장관리팀',
            desc: '창고 내 물자 보관 및 관리 작업',
          },
          {
            key: '포장관리팀',
            desc: '출고 물자 포장 및 배송 준비 작업',
          },
        ],
      },
      {
        title: '📊 Gage R&R 분석 가이드',
        icon: BarChart3,
        items: [
          {
            key: '측정 준비',
            desc: '최소 2명 측정자, 2개 이상 대상자 설정',
          },
          {
            key: '측정 횟수',
            desc: '각 조건별 최소 3회, 권장 5-10회 측정',
          },
          {
            key: '분석 기준',
            desc: 'R&R < 10%: 우수, 10-30%: 양호, >30%: 개선 필요',
          },
          {
            key: '상세 분석',
            desc: '별도 페이지에서 ANOVA 및 전문 해석 제공',
          },
        ],
      },
      {
        title: '🎯 측정 모범 사례',
        icon: Target,
        items: [
          { key: '일관성', desc: '동일한 조건과 방법으로 측정' },
          { key: '정확성', desc: '측정 시작과 끝 지점을 명확히 정의' },
          { key: '재현성', desc: '측정자 간 동일한 절차 준수' },
          { key: '기록', desc: '측정 조건과 특이사항 상세 기록' },
        ],
      },
    ],
    []
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`${theme.card} rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border ${theme.border}`}
      >
        <div className={`${theme.accent} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-white" />
              <h3 className="text-xl font-bold text-white">사용자 가이드</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-8">
            {helpSections.map((section, sectionIndex) => {
              const Icon = section.icon;
              return (
                <div key={sectionIndex} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${theme.textSecondary}`} />
                    <h4 className={`text-lg font-semibold ${theme.text}`}>
                      {section.title}
                    </h4>
                  </div>

                  <div className="grid gap-3">
                    {section.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className={`p-4 rounded-lg border ${theme.border} ${theme.surface} hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className={`font-medium ${theme.text} mb-1`}>
                              {item.key}
                            </div>
                            <div className={`text-sm ${theme.textMuted}`}>
                              {item.desc}
                            </div>
                          </div>
                          {item.shortcut && (
                            <div
                              className={`px-2 py-1 rounded text-xs font-mono font-medium ${theme.surface} ${theme.textSecondary} border ${theme.border}`}
                            >
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

// 간단한 측정 카드 컴포넌트
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
  const statusColors = useMemo(
    () => ({
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
        : { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', text: 'text-blue-800' },
    }),
    [isDark]
  );

  const sizes = {
    sm: { card: 'p-3', icon: 'w-4 h-4', title: 'text-xs', value: 'text-sm' },
    md: { card: 'p-4', icon: 'w-5 h-5', title: 'text-sm', value: 'text-base' },
    lg: { card: 'p-6', icon: 'w-6 h-6', title: 'text-base', value: 'text-xl' },
  };

  const colors = statusColors[status];

  return (
    <div
      className={`${sizes[size].card} rounded-xl border transition-all duration-200 ${colors.bg} ${colors.border} hover:shadow-lg hover:scale-105`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`${sizes[size].icon} ${colors.icon}`} />
      </div>
      <div className={`${sizes[size].title} font-medium ${theme.textMuted} mb-1 line-clamp-1`}>
        {title}
      </div>
      <div className={`${sizes[size].value} font-bold ${colors.text} font-mono break-all`}>
        {value}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
});

// 상세 측정 카드 컴포넌트
const DetailedMeasurementCard = memo<{
  title: string;
  value: string | number;
  description: string;
  interpretation: string;
  unit?: string;
  icon: React.FC<any>;
  status?: 'success' | 'warning' | 'error' | 'info';
  theme: Theme;
  isDark: boolean;
}>(({ title, value, description, interpretation, unit, icon: Icon, status = 'info', theme, isDark }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = useMemo(
    () => ({
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
        : { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', text: 'text-blue-800' },
    }),
    [isDark]
  );

  const colors = statusColors[status];

  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 ${colors.bg} ${colors.border} hover:shadow-lg`}>
      <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between mb-2">
          <Icon className={`w-5 h-5 ${colors.icon}`} />
          <button className={`text-xs ${theme.textMuted} hover:${theme.textSecondary} px-2 py-1 rounded bg-white/10`}>
            {isExpanded ? '접기' : '자세히'}
          </button>
        </div>
        <div className={`text-sm font-medium ${theme.textMuted} mb-1`}>{title}</div>
        <div className={`text-xl font-bold ${colors.text} font-mono`}>
          {value}
          {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-3 animate-in slide-in-from-top duration-200">
          <div>
            <h5 className={`text-xs font-semibold ${theme.textSecondary} mb-1 flex items-center gap-1`}>
              <Info className="w-3 h-3" />
              설명
            </h5>
            <p className={`text-xs ${theme.textMuted} leading-relaxed`}>{description}</p>
          </div>
          <div>
            <h5 className={`text-xs font-semibold ${theme.textSecondary} mb-1 flex items-center gap-1`}>
              <Target className="w-3 h-3" />
              해석
            </h5>
            <p className={`text-xs ${colors.text} leading-relaxed font-medium`}>{interpretation}</p>
          </div>
        </div>
      )}
    </div>
  );
});

// 상세 분석 페이지
const DetailedAnalysisPage = memo<{
  analysis: GageRRAnalysis;
  lapTimes: LapTime[];
  session: SessionData;
  theme: Theme;
  isDark: boolean;
  onBack: () => void;
  onDownload: () => void;
}>(({ analysis, lapTimes, session, theme, isDark, onBack, onDownload }) => {
  const basicStats = useMemo(() => {
    const values = lapTimes.map((lap) => lap.time);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) /
      Math.max(1, values.length - 1);
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

    return {
      mean,
      stdDev,
      cv,
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
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
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={analysis.status} size="md" isDark={isDark} />
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
                위험도:{' '}
                {analysis.interpretation.riskLevel === 'high'
                  ? '높음'
                  : analysis.interpretation.riskLevel === 'medium'
                  ? '보통'
                  : '낮음'}
              </div>
            </div>
          </div>

          <div className={`${theme.surface} p-4 rounded-lg mb-4`}>
            <p className={`text-base leading-relaxed ${theme.text}`}>
              {analysis.interpretation.overall}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <DetailedMeasurementCard
              title="Gage R&R 비율"
              value={`${analysis.gageRRPercent.toFixed(1)}%`}
              description="측정시스템의 전체 변동 중 측정 오차가 차지하는 비율입니다. 낮을수록 좋으며, 제품간 실제 차이를 정확히 구별할 수 있는 능력을 나타냅니다."
              interpretation={
                analysis.gageRRPercent < 10
                  ? '우수한 수준입니다. 측정시스템이 매우 정확하여 제품 변동을 신뢰성 있게 측정할 수 있습니다.'
                  : analysis.gageRRPercent < 30
                  ? '양호한 수준입니다. 대부분의 용도에 사용 가능하나 지속적인 모니터링이 필요합니다.'
                  : '개선이 필요합니다. 측정 오차가 커서 제품간 실제 차이를 구별하기 어려울 수 있습니다.'
              }
              icon={BarChart3}
              status={
                analysis.status === 'excellent' || analysis.status === 'acceptable'
                  ? 'success'
                  : 'error'
              }
              theme={theme}
              isDark={isDark}
            />

            <DetailedMeasurementCard
              title="공정 능력 지수 (Cpk)"
              value={analysis.cpk.toFixed(2)}
              description="공정이 규격 내에서 얼마나 안정적으로 제품을 생산할 수 있는지를 나타내는 지수입니다. 1.33 이상이면 우수, 1.0 이상이면 양호한 수준입니다."
              interpretation={
                analysis.cpk >= 1.33
                  ? '우수한 공정 능력을 보입니다. 안정적으로 규격 내 제품을 생산할 수 있습니다.'
                  : analysis.cpk >= 1.0
                  ? '양호한 수준이나 개선 여지가 있습니다. 공정 안정성 향상을 고려해보세요.'
                  : '공정 능력이 부족합니다. 규격 이탈 가능성이 높아 즉시 개선이 필요합니다.'
              }
              icon={Target}
              status={analysis.cpk >= 1.33 ? 'success' : analysis.cpk >= 1.0 ? 'warning' : 'error'}
              theme={theme}
              isDark={isDark}
            />

            <DetailedMeasurementCard
              title="구별 범주 수 (NDC)"
              value={analysis.ndc}
              description="측정시스템이 서로 다른 제품이나 대상자를 얼마나 많은 그룹으로 구별할 수 있는지를 나타냅니다. 5개 이상이면 우수한 구별 능력을 의미합니다."
              interpretation={
                analysis.ndc >= 5
                  ? '우수한 구별 능력을 가지고 있습니다. 제품간 미세한 차이도 정확히 구별할 수 있습니다.'
                  : analysis.ndc >= 3
                  ? '기본적인 구별은 가능하나 정밀한 분석에는 한계가 있을 수 있습니다.'
                  : '구별 능력이 부족합니다. 측정시스템의 정밀도 개선이 시급합니다.'
              }
              icon={Calculator}
              status={analysis.ndc >= 5 ? 'success' : analysis.ndc >= 3 ? 'warning' : 'error'}
              theme={theme}
              isDark={isDark}
            />
          </div>
        </div>

        {/* ANOVA 분석 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <h3 className={`text-lg font-bold ${theme.text} mb-4 flex items-center gap-2`}>
            <PieChart className="w-5 h-5 text-purple-500" />
            ANOVA 분산 성분 분석
          </h3>

          <div className="space-y-6">
            <div className={`${theme.surface} p-4 rounded-lg mb-4 border-l-4 border-purple-500`}>
              <p className={`text-sm ${theme.textMuted} leading-relaxed`}>
                <strong>ANOVA 분석</strong>은 전체 측정 변동을 각 요인별로 분해하여 어느 부분에서 가장 큰 변동이 발생하는지 파악합니다. 이를 통해 측정시스템 개선의 우선순위를 결정할 수 있습니다.
              </p>
            </div>

            <div>
              <h4 className={`font-semibold ${theme.textSecondary} mb-3 flex items-center gap-2`}>
                <BarChart3 className="w-4 h-4" />
                변동 요인별 기여율
              </h4>
              <div className="space-y-3">
                <div className={`${theme.surface} p-4 rounded-lg border-l-4 border-blue-500`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className={`font-medium ${theme.text} text-sm block`}>측정자 변동</span>
                      <span className={`text-xs ${theme.textMuted}`}>서로 다른 측정자간 결과 차이</span>
                    </div>
                    <span className={`font-mono text-lg font-bold ${theme.textSecondary}`}>
                      {analysis.anova.operatorPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className={`text-xs ${theme.textMuted} mt-2 p-2 rounded ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
                    💡 {analysis.anova.operatorPercent > 30
                      ? '측정자간 차이가 큽니다. 측정 교육이나 표준화가 필요합니다.'
                      : analysis.anova.operatorPercent > 15
                      ? '측정자간 약간의 차이가 있습니다. 주기적 점검이 권장됩니다.'
                      : '측정자간 일관성이 우수합니다.'}
                  </p>
                </div>

                <div className={`${theme.surface} p-4 rounded-lg border-l-4 border-green-500`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className={`font-medium ${theme.text} text-sm block`}>대상자 변동</span>
                      <span className={`text-xs ${theme.textMuted}`}>측정 대상간 실제 차이</span>
                    </div>
                    <span className={`font-mono text-lg font-bold ${theme.textSecondary}`}>
                      {analysis.anova.partPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className={`text-xs ${theme.textMuted} mt-2 p-2 rounded ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
                    💡 {analysis.anova.partPercent > 50
                      ? '대상자간 차이가 측정 오차보다 훨씬 큽니다. 이상적인 상황입니다.'
                      : analysis.anova.partPercent > 30
                      ? '대상자간 차이를 적절히 구별할 수 있습니다.'
                      : '대상자간 실제 차이가 작거나 측정 오차가 큽니다.'}
                  </p>
                </div>

                <div className={`${theme.surface} p-4 rounded-lg border-l-4 border-yellow-500`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className={`font-medium ${theme.text} text-sm block`}>교호작용 변동</span>
                      <span className={`text-xs ${theme.textMuted}`}>측정자×대상자 상호작용 효과</span>
                    </div>
                    <span className={`font-mono text-lg font-bold ${theme.textSecondary}`}>
                      {analysis.anova.interactionPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className={`text-xs ${theme.textMuted} mt-2 p-2 rounded ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                    💡 {analysis.anova.interactionPercent > 20
                      ? '교호작용 효과가 큽니다. 특정 측정자와 대상자 조합에서 변동이 심합니다.'
                      : '교호작용 효과가 크지 않습니다.'}
                  </p>
                </div>

                <div className={`${theme.surface} p-4 rounded-lg border-l-4 border-red-500`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className={`font-medium ${theme.text} text-sm block`}>오차 변동</span>
                      <span className={`text-xs ${theme.textMuted}`}>셀 내 반복성(오차) 분산</span>
                    </div>
                    <span className={`font-mono text-lg font-bold ${theme.textSecondary}`}>
                      {analysis.anova.errorPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className={`text-xs ${theme.textMuted} mt-2 p-2 rounded ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                    💡 {analysis.anova.errorPercent > 20
                      ? '반복성(오차) 변동이 큽니다. 측정 장비나 환경 점검이 필요합니다.'
                      : '반복성(오차) 변동이 적어 안정적입니다.'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className={`font-semibold ${theme.textSecondary} mb-3 flex items-center gap-2`}>
                <Calculator className="w-4 h-4" />
                기본 통계 정보
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div className={`${theme.surface} p-4 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={`font-medium ${theme.text} text-sm block flex items-center gap-1`}>
                        <Clock className="w-3 h-3" />
                        평균 측정시간
                      </span>
                      <span className={`text-xs ${theme.textMuted}`}>전체 측정의 중심값</span>
                    </div>
                    <span className={`font-mono ${theme.textSecondary} text-lg font-bold`}>
                      {formatTime(basicStats.mean)}
                    </span>
                  </div>
                </div>
                <div className={`${theme.surface} p-4 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={`font-medium ${theme.text} text-sm block flex items-center gap-1`}>
                        <Activity className="w-3 h-3" />
                        변동계수 (CV)
                      </span>
                      <span className={`text-xs ${theme.textMuted}`}>상대적 변동의 크기 (표준편차/평균×100)</span>
                    </div>
                    <span className={`font-mono ${theme.textSecondary} text-lg font-bold`}>
                      {basicStats.cv.toFixed(1)}%
                    </span>
                  </div>
                  <p className={`text-xs ${theme.textMuted} mt-2 p-2 rounded ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                    📊 {basicStats.cv < 5
                      ? '매우 일관된 측정 결과입니다.'
                      : basicStats.cv < 10
                      ? '적절한 수준의 일관성을 보입니다.'
                      : '측정 결과의 변동이 큽니다. 측정 방법 점검이 필요합니다.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 개선 권장사항 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <h3 className={`text-lg font-bold ${theme.text} mb-4 flex items-center gap-2`}>
            <TrendingUpIcon className="w-5 h-5 text-green-500" />
            개선 권장사항
          </h3>

          <div className="space-y-3">
            {analysis.interpretation.recommendations.map((rec, idx) => (
              <div key={idx} className={`${theme.surface} p-4 rounded-lg border-l-4 border-green-500`}>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-50'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <span className={`text-xs font-bold ${isDark ? 'text-green-300' : 'text-green-600'}`}>{idx + 1}</span>
                  </div>
                  <p className={`${theme.text} leading-relaxed text-sm`}>{rec}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 측정 데이터 요약 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <h3 className={`text-lg font-bold ${theme.text} mb-4`}>측정 데이터 요약</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
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

        <div className="h-8"></div>
      </div>
    </div>
  );
});

const EnhancedLogisticsTimer = () => {
  // 기본 다크모드로 설정
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

  // 토스트 상태
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  // 필터 상태
  const [filterOperator, setFilterOperator] = useState<string>('');
  const [filterTarget, setFilterTarget] = useState<string>('');

  // 폼 상태
  const [sessionName, setSessionName] = useState('');
  const [workType, setWorkType] = useState('');
  const [operators, setOperators] = useState<string[]>(['']);
  const [targets, setTargets] = useState<string[]>(['']);
  const [currentOperator, setCurrentOperator] = useState('');
  const [currentTarget, setCurrentTarget] = useState('');
  const [usl, setUSL] = useState<number | undefined>(undefined);
  const [lsl, setLSL] = useState<number | undefined>(undefined);

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // 뒤로가기 방지 훅
  const { showBackWarning } = useBackButtonPrevention();

  const theme = useMemo(() => THEME_COLORS[isDark ? 'dark' : 'light'], [isDark]);

  // 토스트 메시지 표시 함수
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

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
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (
        showDetailedAnalysis ||
        showNewSessionModal ||
        showHelp ||
        selectedSessionHistory
      )
        return;

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
    selectedSessionHistory,
  ]);

  // 타이머 제어 함수들
  const toggleTimer = useCallback(() => {
    if (!currentSession) {
      showToast('먼저 작업 세션을 생성해주세요.', 'warning');
      return;
    }

    if (isRunning) {
      setIsRunning(false);
    } else {
      startTimeRef.current = Date.now() - currentTime;
      setIsRunning(true);
    }
  }, [isRunning, currentTime, currentSession, showToast]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
    setLapTimes([]);
    setAllLapTimes((prev) => prev.filter((lap) => lap.sessionId !== currentSession?.id));

    if (currentSession) {
      const updatedSession = { ...currentSession, lapTimes: [] };
      setCurrentSession(updatedSession);
      setSessions((prev) =>
        prev.map((s) => (s.id === currentSession.id ? updatedSession : s))
      );
    }
    showToast('측정 기록이 모두 초기화되었습니다.', 'success');
  }, [currentSession, showToast]);

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
      sessionId: currentSession.id,
    };

    const updatedLaps = [...lapTimes, newLap];
    setLapTimes(updatedLaps);
    setAllLapTimes((prev) => [...prev, newLap]);

    // 랩타임 기록 시 자동 중지 및 시간 초기화
    setIsRunning(false);
    setCurrentTime(0);

    // 세션 업데이트
    const updatedSession = { ...currentSession, lapTimes: updatedLaps };
    setCurrentSession(updatedSession);
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSession.id ? updatedSession : s))
    );

    showToast('측정이 완료되었습니다.', 'success');
  }, [currentTime, currentSession, currentOperator, currentTarget, lapTimes, showToast]);

  const deleteLapTime = useCallback(
    (lapId: number) => {
      const updatedLaps = lapTimes.filter((lap) => lap.id !== lapId);
      const updatedAllLaps = allLapTimes.filter((lap) => lap.id !== lapId);

      setLapTimes(updatedLaps);
      setAllLapTimes(updatedAllLaps);

      if (currentSession) {
        const updatedSession = { ...currentSession, lapTimes: updatedLaps };
        setCurrentSession(updatedSession);
        setSessions((prev) =>
          prev.map((s) => (s.id === currentSession.id ? updatedSession : s))
        );
      }

      showToast('측정 기록이 삭제되었습니다.', 'success');
    },
    [lapTimes, allLapTimes, currentSession, showToast]
  );

  // 세션 관리 함수들
  const createSession = useCallback(() => {
    if (
      !sessionName ||
      !workType ||
      operators.some((op) => !op.trim()) ||
      targets.some((tg) => !tg.trim()) ||
      usl === undefined ||
      lsl === undefined
    ) {
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
      isActive: true,
      usl,
      lsl,
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
    setUSL(undefined);
    setLSL(undefined);

    showToast('새 세션이 생성되었습니다.', 'success');
  }, [sessionName, workType, operators, targets, usl, lsl, showToast]);

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

  // 상세 분석 다운로드
  const downloadDetailedAnalysis = useCallback(() => {
    if (lapTimes.length < 6) {
      showToast('상세 분석을 위해서는 최소 6개의 측정 기록이 필요합니다.', 'warning');
      return;
    }

    if (!currentSession) {
      showToast('활성 세션이 없습니다.', 'error');
      return;
    }

    const analysis = calculateGageRR(lapTimes, currentSession.usl, currentSession.lsl);

    const analysisData: (string | number)[][] = [
      ['=== Gage R&R 상세 분석 보고서 ==='],
      [''],
      ['세션명', currentSession.name],
      ['작업유형', currentSession.workType],
      ['USL', currentSession.usl ?? '미설정'],
      ['LSL', currentSession.lsl ?? '미설정'],
      ['측정일시', currentSession.startTime],
      ['총 측정횟수', lapTimes.length],
      [''],
      ['=== 분석 결과 ==='],
      ['Gage R&R 비율 (%)', analysis.gageRRPercent.toFixed(1)],
      [
        '측정시스템 상태',
        analysis.status === 'excellent'
          ? '우수'
          : analysis.status === 'acceptable'
          ? '양호'
          : analysis.status === 'marginal'
          ? '보통'
          : '불량',
      ],
      ['공정 능력 지수 (Cpk)', analysis.cpk.toFixed(2)],
      ['구별 범주 수 (NDC)', analysis.ndc],
      ['위험도', analysis.interpretation.riskLevel === 'low' ? '낮음' : analysis.interpretation.riskLevel === 'medium' ? '보통' : '높음'],
      [''],
      ['=== ANOVA 분석 ==='],
      ['측정자 기여율 (%)', analysis.anova.operatorPercent.toFixed(1)],
      ['대상자 기여율 (%)', analysis.anova.partPercent.toFixed(1)],
      ['교호작용 기여율 (%)', analysis.anova.interactionPercent.toFixed(1)],
      ['오차 기여율 (%)', analysis.anova.errorPercent.toFixed(1)],
      [''],
      ['=== 개선 권장사항 ==='],
      ...analysis.interpretation.recommendations.map((rec, idx) => [`${idx + 1}. ${rec}`]),
      [''],
      ['=== 측정 기록 ==='],
      ['순번', '측정시간', '측정자', '대상자', '기록시간'],
      ...lapTimes.map((lap, index) => [
        index + 1,
        formatTime(lap.time),
        lap.operator,
        lap.target,
        lap.timestamp,
      ]),
    ];

    const csvContent = createCSVContent(analysisData);
    const filename = generateFileName('상세분석보고서', currentSession.name);

    if (downloadCSVFile(csvContent, filename)) {
      showToast('상세 분석 보고서가 다운로드되었습니다.', 'success');
    } else {
      showToast('다운로드에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  }, [lapTimes, currentSession, showToast]);

  // 측정 기록만 다운로드
  const downloadMeasurementData = useCallback(() => {
    if (lapTimes.length === 0) {
      showToast('다운로드할 측정 기록이 없습니다.', 'warning');
      return;
    }

    if (!currentSession) {
      showToast('활성 세션이 없습니다.', 'error');
      return;
    }

    const measurementData: (string | number)[][] = [
      ['=== 측정 기록 ==='],
      [''],
      ['세션명', currentSession.name],
      ['작업유형', currentSession.workType],
      ['USL', currentSession.usl ?? '미설정'],
      ['LSL', currentSession.lsl ?? '미설정'],
      ['측정일시', currentSession.startTime],
      ['총 측정횟수', lapTimes.length],
      [''],
      ['순번', '측정시간', '측정자', '대상자', '기록시간'],
      ...lapTimes.map((lap, index) => [
        index + 1,
        formatTime(lap.time),
        lap.operator,
        lap.target,
        lap.timestamp,
      ]),
    ];

    const csvContent = createCSVContent(measurementData);
    const filename = generateFileName('측정기록', currentSession.name);

    if (downloadCSVFile(csvContent, filename)) {
      showToast('측정 기록이 다운로드되었습니다.', 'success');
    } else {
      showToast('다운로드에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  }, [lapTimes, currentSession, showToast]);

  // 필터링된 측정 기록
  const filteredLapTimes = useMemo(() => {
    return lapTimes.filter((lap) => {
      return (!filterOperator || lap.operator === filterOperator) && (!filterTarget || lap.target === filterTarget);
    });
  }, [lapTimes, filterOperator, filterTarget]);

  const analysis = useMemo(() => {
    return currentSession && lapTimes.length >= 6
      ? calculateGageRR(lapTimes, currentSession.usl, currentSession.lsl)
      : null;
  }, [currentSession, lapTimes]);

  // 상세 분석 페이지 표시
  if (showDetailedAnalysis && analysis && currentSession) {
    return (
      <DetailedAnalysisPage
        analysis={analysis}
        lapTimes={lapTimes}
        session={currentSession}
        theme={theme}
        isDark={isDark}
        onBack={() => setShowDetailedAnalysis(false)}
        onDownload={downloadDetailedAnalysis}
      />
    );
  }

  // 랜딩 페이지
  if (showLanding) {
    return <ModernLandingPage isDark={isDark} onStart={() => setShowLanding(false)} />;
  }

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      {/* 토스트 메시지 */}
      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />

      {/* 뒤로가기 경고 */}
      <BackWarning isVisible={showBackWarning} />

      {/* 헤더 */}
      <div className={`${theme.card} shadow-sm border-b ${theme.border} sticky top-0 z-40`}>
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Zap className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className={`text-base font-bold ${theme.text} truncate`}>물류 인시수 측정 타이머</h1>
                <div className={`text-xs ${theme.textMuted} truncate`}>측정부터 분석까지 한번에</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}>
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => setShowHelp(true)} className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}>
                <HelpCircle className="w-5 h-5" />
              </button>
              <button onClick={() => setShowLanding(true)} className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:text-red-500 ${theme.surfaceHover}`}>
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="px-4 py-4 max-w-4xl mx-auto space-y-6">
        {/* 세션 생성 모달 */}
        {showNewSessionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${theme.card} rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border ${theme.border}`}>
              <div className={`${theme.accent} px-6 py-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Plus className="w-6 h-6 text-white" />
                    <h3 className="text-xl font-bold text-white">새 세션 생성</h3>
                  </div>
                  <button onClick={() => setShowNewSessionModal(false)} className="text-white/80 hover:text-white transition-colors p-1">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>세션명</label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 rounded-lg border ${theme.border} ${theme.input}`}
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="세션명을 입력하세요"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>작업유형</label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 rounded-lg border ${theme.border} ${theme.input}`}
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    placeholder="작업유형을 입력하세요"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>USL (상한 규격)</label>
                  <input
                    type="number"
                    className={`w-full px-3 py-2 rounded-lg border ${theme.border} ${theme.input}`}
                    value={usl !== undefined ? usl : ''}
                    onChange={(e) => setUSL(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="예: 120"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>LSL (하한 규격)</label>
                  <input
                    type="number"
                    className={`w-full px-3 py-2 rounded-lg border ${theme.border} ${theme.input}`}
                    value={lsl !== undefined ? lsl : ''}
                    onChange={(e) => setLSL(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="예: 80"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>측정자 (Operators)</label>
                  {operators.map((op, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        className={`flex-1 px-3 py-2 rounded-lg border ${theme.border} ${theme.input}`}
                        value={op}
                        onChange={(e) => {
                          const updated = [...operators];
                          updated[idx] = e.target.value;
                          setOperators(updated);
                        }}
                        placeholder="측정자 이름"
                      />
                      {operators.length > 1 && (
                        <button onClick={() => removeOperator(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addOperator} className="flex items-center gap-1 text-blue-500 hover:underline">
                    <Plus className="w-4 h-4" /> 측정자 추가
                  </button>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>대상자 (Targets)</label>
                  {targets.map((tg, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        className={`flex-1 px-3 py-2 rounded-lg border ${theme.border} ${theme.input}`}
                        value={tg}
                        onChange={(e) => {
                          const updated = [...targets];
                          updated[idx] = e.target.value;
                          setTargets(updated);
                        }}
                        placeholder="대상자 이름"
                      />
                      {targets.length > 1 && (
                        <button onClick={() => removeTarget(idx)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addTarget} className="flex items-center gap-1 text-blue-500 hover:underline">
                    <Plus className="w-4 h-4" /> 대상자 추가
                  </button>
                </div>
              </div>
              <div className={`px-6 py-4 border-t ${theme.border}`}>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowNewSessionModal(false)}
                    className={`px-4 py-2 rounded-lg ${theme.border} ${theme.textSecondary} ${theme.surfaceHover}`}
                  >
                    취소
                  </button>
                  <button
                    onClick={createSession}
                    className={`${theme.accent} text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity`}
                  >
                    생성
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 기록 및 분석 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 타이머 카드 */}
          <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${theme.text}`}>실시간 타이머</h2>
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="text-blue-500 hover:text-blue-700 transition-colors"
                title="새 세션 생성"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center mb-4">
              <div className="text-3xl font-bold font-mono text-blue-600">{formatTime(currentTime)}</div>
            </div>
            <div className="flex items-center justify-center space-x-4 mb-4">
              <button
                onClick={toggleTimer}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                } hover:opacity-90`}
                disabled={!currentSession || !currentOperator || !currentTarget}
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                {isRunning ? '정지' : '시작'}
              </button>
              <button
                onClick={resetTimer}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-white hover:opacity-90 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                리셋
              </button>
            </div>
            <div className="mb-4">
              <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>측정자</label>
              <select
                className={`w-full px-3 py-2 rounded-lg border ${theme.border} ${theme.input}`}
                value={currentOperator}
                onChange={(e) => setCurrentOperator(e.target.value)}
                disabled={!currentSession}
              >
                <option value="">측정자 선택</option>
                {currentSession?.operators.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>대상자</label>
              <select
                className={`w-full px-3 py-2 rounded-lg border ${theme.border} ${theme.input}`}
                value={currentTarget}
                onChange={(e) => setCurrentTarget(e.target.value)}
                disabled={!currentSession}
              >
                <option value="">대상자 선택</option>
                {currentSession?.targets.map((tg) => (
                  <option key={tg} value={tg}>
                    {tg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 최근 측정 기록 */}
          <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${theme.text}`}>최근 측정 기록</h2>
              <button
                onClick={downloadMeasurementData}
                className="text-green-500 hover:text-green-700 transition-colors"
                title="측정 기록 다운로드"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <select
                className={`flex-1 px-3 py-2 rounded-lg border ${theme.border} ${theme.input}`}
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value)}
              >
                <option value="">측정자 필터</option>
                {currentSession?.operators.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              <select
                className={`flex-1 px-3 py-2 rounded-lg border ${theme.border} ${theme.input}`}
                value={filterTarget}
                onChange={(e) => setFilterTarget(e.target.value)}
              >
                <option value="">대상자 필터</option>
                {currentSession?.targets.map((tg) => (
                  <option key={tg} value={tg}>
                    {tg}
                  </option>
                ))}
              </select>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredLapTimes.length === 0 ? (
                <p className={`text-center text-sm ${theme.textMuted}`}>측정 기록이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLapTimes.map((lap) => (
                    <li key={lap.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className={`font-mono ${theme.text}`}>{formatTime(lap.time)}</div>
                        <div className={`text-xs ${theme.textMuted}`}>
                          {lap.operator} · {lap.target} · {lap.timestamp}
                        </div>
                      </div>
                      <button onClick={() => deleteLapTime(lap.id)} className="text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowDetailedAnalysis(true)}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                disabled={!analysis}
              >
                상세 분석
              </button>
            </div>
          </div>
        </div>

        {/* 세션 목록 및 전환 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-bold ${theme.text}`}>세션 목록</h2>
          </div>
          {sessions.length === 0 ? (
            <p className={`text-center text-sm ${theme.textMuted}`}>등록된 세션이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {sessions.map((sess) => (
                <li key={sess.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className={`font-medium ${theme.text}`}>{sess.name}</div>
                    <div className={`text-xs ${theme.textMuted}`}>
                      {sess.workType} · {sess.startTime} · {sess.lapTimes.length}회 측정
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedSessionHistory(sess);
                      }}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                      title="세션 정보"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentSession(sess);
                        setLapTimes(allLapTimes.filter((lap) => lap.sessionId === sess.id));
                        setCurrentOperator(sess.operators[0]);
                        setCurrentTarget(sess.targets[0]);
                        showToast('세션이 활성화되었습니다.', 'success');
                      }}
                      className="text-green-500 hover:text-green-700 transition-colors"
                      title="이 세션으로 전환"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 세션 상세 정보 모달 */}
      {selectedSessionHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border ${theme.border}`}>
            <div className={`${theme.accent} px-6 py-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">세션 정보</h3>
                </div>
                <button onClick={() => setSelectedSessionHistory(null)} className="text-white/80 hover:text-white transition-colors p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className={`text-lg font-semibold ${theme.text} mb-1`}>세션명</h4>
                <p className={`${theme.textMuted}`}>{selectedSessionHistory.name}</p>
              </div>
              <div>
                <h4 className={`text-lg font-semibold ${theme.text} mb-1`}>작업유형</h4>
                <p className={`${theme.textMuted}`}>{selectedSessionHistory.workType}</p>
              </div>
              <div>
                <h4 className={`text-lg font-semibold ${theme.text} mb-1`}>측정자</h4>
                <p className={`${theme.textMuted}`}>{selectedSessionHistory.operators.join(', ')}</p>
              </div>
              <div>
                <h4 className={`text-lg font-semibold ${theme.text} mb-1`}>대상자</h4>
                <p className={`${theme.textMuted}`}>{selectedSessionHistory.targets.join(', ')}</p>
              </div>
              <div>
                <h4 className={`text-lg font-semibold ${theme.text} mb-1`}>USL / LSL</h4>
                <p className={`${theme.textMuted}`}>
                  {selectedSessionHistory.usl ?? '미설정'} / {selectedSessionHistory.lsl ?? '미설정'}
                </p>
              </div>
              <div>
                <h4 className={`text-lg font-semibold ${theme.text} mb-1`}>측정 기록</h4>
                <p className={`${theme.textMuted}`}>
                  총 {allLapTimes.filter((lap) => lap.sessionId === selectedSessionHistory.id).length}회
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCurrentSession(selectedSessionHistory);
                    setLapTimes(allLapTimes.filter((lap) => lap.sessionId === selectedSessionHistory.id));
                    setCurrentOperator(selectedSessionHistory.operators[0]);
                    setCurrentTarget(selectedSessionHistory.targets[0]);
                    setSelectedSessionHistory(null);
                    showToast('세션이 활성화되었습니다.', 'success');
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

      {/* 도움말 모달 */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} theme={theme} />
    </div>
  );
};

export default EnhancedLogisticsTimer;
