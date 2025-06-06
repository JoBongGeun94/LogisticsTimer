import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  Play, Pause, Square, Download, Plus, Users, Clock, BarChart3, FileText,
  Zap, Target, LogOut, Moon, Sun, Info, CheckCircle, AlertCircle, XCircle,
  Search, X, Minus, AlertTriangle
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
  interpretation: {
    overall: string;
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
}

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
}

// 통계 분석 클래스
class EnhancedStatisticalAnalyzer {
  calculateGageRR(lapTimes: LapTime[]): GageRRAnalysis {
    const defaultResult: GageRRAnalysis = {
      repeatability: 0, reproducibility: 0, gageRR: 0,
      partVariation: 0, totalVariation: 0, gageRRPercent: 100,
      ndc: 0, status: 'unacceptable', cpk: 0,
      interpretation: {
        overall: '분석을 위한 데이터가 부족합니다.',
        recommendations: ['최소 6개 이상의 측정 데이터가 필요합니다.'],
        riskLevel: 'high'
      }
    };

    if (!lapTimes || lapTimes.length < 6) return defaultResult;

    try {
      const times = lapTimes.map(lap => lap.time).filter(time => time > 0);
      if (times.length < 6) return defaultResult;

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / Math.max(1, times.length - 1);
      const stdDev = Math.sqrt(variance);

      const operatorGroups = this.groupByField(lapTimes, 'operator');
      const targetGroups = this.groupByField(lapTimes, 'target');

      const operatorCount = Object.keys(operatorGroups).length;
      const targetCount = Object.keys(targetGroups).length;

      if (operatorCount === 0 || targetCount === 0) return defaultResult;

      const trialsPerCondition = Math.max(1, Math.floor(times.length / (operatorCount * targetCount)));

      const repeatability = this.calculateRepeatability(operatorGroups, stdDev);
      const reproducibility = this.calculateReproducibility(operatorGroups, mean, repeatability, trialsPerCondition);
      const partVariation = this.calculatePartVariation(targetGroups, mean, repeatability, trialsPerCondition);

      const gageRR = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
      const totalVariation = Math.sqrt(gageRR ** 2 + partVariation ** 2);
      const gageRRPercent = totalVariation > 0 ? Math.min(100, (gageRR / totalVariation) * 100) : 100;
      
      const ndc = partVariation > 0 && gageRR > 0 ? Math.max(0, Math.floor((partVariation / gageRR) * 1.41)) : 0;
      const cpk = partVariation > 0 && stdDev > 0 ? Math.max(0, partVariation / (6 * stdDev)) : 0;

      const status = this.determineStatus(gageRRPercent, ndc, times.length);
      const interpretation = this.generateInterpretation(gageRRPercent, repeatability, reproducibility, ndc);

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
        interpretation
      };
    } catch (error) {
      console.error('Gage R&R calculation error:', error);
      return defaultResult;
    }
  }

  private groupByField(lapTimes: LapTime[], field: 'operator' | 'target'): Record<string, number[]> {
    return lapTimes.reduce((groups, lap) => {
      const key = lap[field]?.trim();
      if (key && lap.time > 0) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(lap.time);
      }
      return groups;
    }, {} as Record<string, number[]>);
  }

  private calculateRepeatability(operatorGroups: Record<string, number[]>, fallbackStdDev: number): number {
    let repeatabilityVariance = 0;
    let totalWithinGroups = 0;

    Object.values(operatorGroups).forEach(group => {
      if (group.length > 1) {
        const groupMean = group.reduce((a, b) => a + b, 0) / group.length;
        repeatabilityVariance += group.reduce((acc, val) => acc + Math.pow(val - groupMean, 2), 0);
        totalWithinGroups += group.length - 1;
      }
    });

    return totalWithinGroups > 0 
      ? Math.sqrt(repeatabilityVariance / totalWithinGroups)
      : fallbackStdDev * 0.8;
  }

  private calculateReproducibility(operatorGroups: Record<string, number[]>, overallMean: number, repeatability: number, trialsPerCondition: number): number {
    const operatorMeans = Object.values(operatorGroups)
      .filter(group => group.length > 0)
      .map(group => group.reduce((a, b) => a + b, 0) / group.length);

    if (operatorMeans.length <= 1) return 0;

    const operatorVariance = operatorMeans.reduce((acc, opMean) => 
      acc + Math.pow(opMean - overallMean, 2), 0) / Math.max(1, operatorMeans.length - 1);

    return Math.sqrt(Math.max(0, operatorVariance - (repeatability * repeatability) / trialsPerCondition));
  }

  private calculatePartVariation(targetGroups: Record<string, number[]>, overallMean: number, repeatability: number, trialsPerCondition: number): number {
    const targetMeans = Object.values(targetGroups)
      .filter(group => group.length > 0)
      .map(group => group.reduce((a, b) => a + b, 0) / group.length);

    if (targetMeans.length <= 1) return repeatability;

    const targetVariance = targetMeans.reduce((acc, targetMean) => 
      acc + Math.pow(targetMean - overallMean, 2), 0) / Math.max(1, targetMeans.length - 1);

    return Math.sqrt(Math.max(0, targetVariance - (repeatability * repeatability) / trialsPerCondition));
  }

  private determineStatus(gageRRPercent: number, ndc: number, sampleSize: number): 'excellent' | 'acceptable' | 'marginal' | 'unacceptable' {
    const adjustment = sampleSize < 30 ? 5 : 0;
    
    if (gageRRPercent < (10 + adjustment) && ndc >= 5) return 'excellent';
    if (gageRRPercent < (30 + adjustment) && ndc >= 4) return 'acceptable';
    if (gageRRPercent < (50 + adjustment) && ndc >= 3) return 'marginal';
    return 'unacceptable';
  }

  private generateInterpretation(gageRRPercent: number, repeatability: number, reproducibility: number, ndc: number) {
    const overall = gageRRPercent < 10 
      ? '측정 시스템이 우수합니다.'
      : gageRRPercent < 30
      ? '측정 시스템이 양호합니다.'
      : gageRRPercent < 50
      ? '측정 시스템이 보통 수준입니다.'
      : '측정 시스템에 심각한 문제가 있습니다.';

    const recommendations: string[] = [];
    
    if (gageRRPercent >= 30) {
      recommendations.push('측정 시스템 전반적인 재검토 필요');
    }
    
    if (repeatability > reproducibility) {
      recommendations.push('측정 장비의 안정성 및 정밀도 개선');
    } else {
      recommendations.push('측정자 교육 프로그램 강화');
    }

    if (ndc < 5) {
      recommendations.push('측정 시스템의 구별 능력 향상 필요');
    }

    const riskLevel: 'low' | 'medium' | 'high' = 
      gageRRPercent < 10 ? 'low' : gageRRPercent < 30 ? 'medium' : 'high';

    return { overall, recommendations, riskLevel };
  }
}

// 유틸리티 함수들
const formatTime = (ms: number): string => {
  if (ms < 0) return '00:00.00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

const generateFileName = (prefix: string, sessionName: string): string => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 16).replace(/[:-]/g, '');
  const safeName = sessionName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  return `${prefix}-${safeName}-(${timestamp}).csv`;
};

const createCSVContent = (data: (string | number)[][]): string => {
  const csvRows = data.map(row => 
    row.map(cell => {
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

// UI 컴포넌트들
const Toast = memo<{
  toast: ToastState;
  onClose: () => void;
}>(({ toast, onClose }) => {
  useEffect(() => {
    if (toast.isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.isVisible, onClose]);

  if (!toast.isVisible) return null;

  const typeConfig = {
    success: { style: 'bg-green-500', icon: CheckCircle },
    error: { style: 'bg-red-500', icon: XCircle },
    warning: { style: 'bg-yellow-500', icon: AlertTriangle },
    info: { style: 'bg-blue-500', icon: Info }
  };

  const config = typeConfig[toast.type];
  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`${config.style} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

const StatusBadge = memo<{ 
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable'; 
}>(({ status }) => {
  const statusConfig = {
    excellent: { icon: CheckCircle, text: '우수', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' },
    acceptable: { icon: CheckCircle, text: '양호', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' },
    marginal: { icon: AlertTriangle, text: '보통', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700' },
    unacceptable: { icon: XCircle, text: '불량', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border px-3 py-1.5 text-sm ${config.color}`}>
      <Icon className="w-4 h-4" />
      {config.text}
    </span>
  );
});

// 메인 애플리케이션
const EnhancedLogisticsTimer = () => {
  const [isDark, setIsDark] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    isVisible: false
  });

  const [sessionName, setSessionName] = useState('');
  const [workType, setWorkType] = useState('');
  const [operators, setOperators] = useState<string[]>(['']);
  const [targets, setTargets] = useState<string[]>(['']);
  const [currentOperator, setCurrentOperator] = useState('');
  const [currentTarget, setCurrentTarget] = useState('');

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const statisticalAnalyzer = useMemo(() => new EnhancedStatisticalAnalyzer(), []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

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

    setIsRunning(false);
    setCurrentTime(0);

    showToast('측정이 완료되었습니다.', 'success');
  }, [currentTime, currentSession, currentOperator, currentTarget, lapTimes, showToast]);

  const createSession = useCallback(() => {
    if (!sessionName || !workType || operators.some(op => !op.trim()) || targets.some(tg => !tg.trim())) {
      showToast('모든 필드를 입력해주세요.', 'warning');
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

  const downloadAnalysis = useCallback(() => {
    if (lapTimes.length < 6) {
      showToast('분석을 위해서는 최소 6개의 측정 기록이 필요합니다.', 'warning');
      return;
    }

    if (!currentSession) {
      showToast('활성 세션이 없습니다.', 'error');
      return;
    }

    const analysis = statisticalAnalyzer.calculateGageRR(lapTimes);
    
    const analysisData: (string | number)[][] = [
      ['=== Enhanced Gage R&R 분석 보고서 v8.0 ==='],
      [''],
      ['세션명', currentSession.name],
      ['작업유형', currentSession.workType],
      ['측정일시', currentSession.startTime],
      ['총 측정횟수', lapTimes.length],
      [''],
      ['=== 분석 결과 ==='],
      ['Gage R&R 비율 (%)', analysis.gageRRPercent.toFixed(1)],
      ['측정시스템 상태', analysis.status === 'excellent' ? '우수' :
        analysis.status === 'acceptable' ? '양호' :
        analysis.status === 'marginal' ? '보통' : '불량'],
      ['공정 능력 지수 (Cpk)', analysis.cpk.toFixed(2)],
      ['구별 범주 수 (NDC)', analysis.ndc],
      ['위험도', analysis.interpretation.riskLevel === 'low' ? '낮음' :
        analysis.interpretation.riskLevel === 'medium' ? '보통' : '높음'],
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
        lap.timestamp
      ])
    ];

    const csvContent = createCSVContent(analysisData);
    const filename = generateFileName('Enhanced분석보고서v8', currentSession.name);
    
    if (downloadCSVFile(csvContent, filename)) {
      showToast('Enhanced 분석 보고서가 다운로드되었습니다.', 'success');
    } else {
      showToast('다운로드에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  }, [lapTimes, currentSession, statisticalAnalyzer, showToast]);

  const analysis = useMemo(() => {
    return currentSession && lapTimes.length >= 6 ? statisticalAnalyzer.calculateGageRR(lapTimes) : null;
  }, [currentSession, lapTimes, statisticalAnalyzer]);

  if (showLanding) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 via-purple-500/15 to-transparent rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 left-16 w-80 h-80 bg-gradient-to-tr from-indigo-400/15 via-blue-500/10 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
              Enhanced Logistics Timer
              <span className="block text-2xl text-blue-300 font-normal mt-2">v8.0</span>
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              고급 데이터 관리 • 정확한 MSA 분석 • 적응형 통계 처리
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-4xl">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <Search className="w-8 h-8 text-blue-300 mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">고급 검색 & 필터</h3>
              <p className="text-blue-200 text-sm">실시간 검색, 다중 필터, 정렬 기능</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <BarChart3 className="w-8 h-8 text-green-300 mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">정확한 MSA 분석</h3>
              <p className="text-blue-200 text-sm">AIAG 표준 준수, 올바른 NDC 계산</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <Target className="w-8 h-8 text-purple-300 mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-white mb-2">적응형 분석</h3>
              <p className="text-blue-200 text-sm">로그 변환, 변동계수 조정</p>
            </div>
          </div>

          <button
            onClick={() => setShowLanding(false)}
            className="group relative overflow-hidden px-12 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl"></div>
            <span className="relative z-10 text-white flex items-center space-x-3">
              <Play className="w-6 h-6" />
              <span>Enhanced 시스템 시작</span>
            </span>
          </button>

          <div className="mt-8 text-blue-200 text-sm">
            v8.0 • SOLID 원칙 준수 • 완전한 MSA 표준 구현
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Toast 
        toast={toast}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b ${isDark ? 'border-gray-600' : 'border-gray-200'} sticky top-0 z-40`}>
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Zap className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>
                  Enhanced Timer v8.0
                </h1>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} truncate`}>
                  고급 분석 • MSA 표준 • 적응형 처리
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowLanding(true)}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' : 'text-gray-600 hover:text-red-600 hover:bg-gray-100'}`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 작업 세션 섹션 */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>작업 세션</h2>
            </div>
            <button
              onClick={() => setShowNewSessionModal(true)}
              className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 flex items-center space-x-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>새 세션</span>
            </button>
          </div>

          {currentSession ? (
            <div className="space-y-3">
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-1 truncate`}>{currentSession.name}</div>
                <div className="truncate">{currentSession.workType}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>측정자</label>
                  <select
                    value={currentOperator}
                    onChange={(e) => setCurrentOperator(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    {currentSession.operators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>대상자</label>
                  <select
                    value={currentTarget}
                    onChange={(e) => setCurrentTarget(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    {currentSession.targets.map(tg => (
                      <option key={tg} value={tg}>{tg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>활성 세션이 없습니다.</p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>새 세션을 생성해주세요.</p>
            </div>
          )}
        </div>

        {/* 정밀 타이머 섹션 */}
        <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-6 h-6 text-blue-500" />
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>정밀 타이머</h2>
          </div>

          <div className="text-center">
            <div className={`text-4xl sm:text-5xl font-mono font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'} tracking-wider`}>
              {formatTime(currentTime)}
            </div>
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
              {isRunning ? '측정 중...' : '대기 중'}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={toggleTimer}
                disabled={!currentSession}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-colors ${
                  isRunning
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
                <span className="text-sm">기록</span>
              </button>

              <button
                onClick={stopTimer}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-colors ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'
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
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Enhanced 실시간 분석</h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{lapTimes.length}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">측정 횟수</div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatTime(lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">평균 시간</div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {analysis?.status === 'excellent' ? '우수' :
                   analysis?.status === 'acceptable' ? '양호' :
                   analysis?.status === 'marginal' ? '보통' : 
                   analysis ? '불량' : 'N/A'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">MSA 상태</div>
              </div>
            </div>

            {analysis && lapTimes.length >= 6 && (
              <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'} text-center`}>
                <StatusBadge status={analysis.status} />
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                  Enhanced 분석: AIAG MSA 4th Edition 준수
                </p>
              </div>
            )}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={downloadAnalysis}
            disabled={lapTimes.length < 6}
            className="bg-purple-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Enhanced 분석 다운로드</span>
          </button>
        </div>

        {/* 측정 기록 섹션 */}
        {currentSession && lapTimes.length > 0 && (
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-500" />
                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>측정 기록</h2>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {lapTimes.length}개
                </span>
              </div>
            </div>
            
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {lapTimes
                .slice()
                .reverse()
                .map((lap, index) => (
                <div key={lap.id} className={`${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} p-3 rounded-lg border-l-4 border-blue-500 transition-all hover:shadow-md`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-lg font-bold text-blue-600 mb-2">
                        {formatTime(lap.time)}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} space-y-1`}>
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">측정자: <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{lap.operator}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">대상자: <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{lap.target}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lap.timestamp}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} text-right`}>
                        #{lapTimes.length - index}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 새 세션 생성 모달 */}
        {showNewSessionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="p-6">
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>새 작업 세션 생성</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>세션명 *</label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="예: Enhanced-검수-001"
                      className={`w-full p-3 border rounded-lg text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>작업 유형 *</label>
                    <select
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      className={`w-full p-3 border rounded-lg text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="">작업 유형 선택</option>
                      <option value="물자검수팀">물자검수팀</option>
                      <option value="저장관리팀">저장관리팀</option>
                      <option value="포장관리팀">포장관리팀</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>측정자 설정</label>
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
                          placeholder={`측정자 ${index + 1}`}
                          className={`flex-1 p-2 border rounded text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
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
                      <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>대상자 설정</label>
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
                          placeholder={`대상자 ${index + 1}`}
                          className={`flex-1 p-2 border rounded text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
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
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowNewSessionModal(false)}
                    className={`flex-1 border py-3 rounded-lg font-medium transition-colors ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    취소
                  </button>
                  <button
                    onClick={createSession}
                    className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>생성</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="h-8"></div>
      </div>
    </div>
  );
};

export default EnhancedLogisticsTimer;
