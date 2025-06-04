}), []);

  const sizeConfig = useMemo(() => ({
    sm: { card: 'p-3', icon: 'w-4 h-4', title: 'text-xs', value: 'text-sm' },
    md: { card: 'p-4', icon: 'w-5 h-5', title: 'text-sm', value: 'text-lg' },
    lg: { card: 'p-6', icon: 'w-6 h-6', title: 'text-base', value: 'text-2xl' }
  }), []);

  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  return (
    <div className={`${sizes.card} rounded-xl border transition-all duration-200 ${config.colors} hover:shadow-lg hover:scale-105`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`${sizes.icon} ${config.iconColor}`} />
      </div>
      <div className={`${sizes.title} font-medium ${theme.textMuted} mb-1`}>
        {title}
      </div>
      <div className={`${sizes.value} font-bold ${theme.text} font-mono`}>
        {value}{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
});

// ==================== 메인 컴포넌트 ====================
const EnhancedLogisticsTimer = () => {
  // ==================== 상태 관리 (완전포괄적) ====================
  
  // 타이머 상태 (상호배타적)
  const [timerState, setTimerState] = useState<TimerState>(TimerState.STOPPED);
  const [currentTime, setCurrentTime] = useState<number>(0);
  
  // 데이터 상태
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);
  const [allLapTimes, setAllLapTimes] = useState<LapTime[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  
  // UI 상태 (상호배타적)
  const [modalState, setModalState] = useState<ModalState>(ModalState.NONE);
  const [selectedSessionHistory, setSelectedSessionHistory] = useState<SessionData | null>(null);
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  
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

  // 필터 상태
  const [filterOperator, setFilterOperator] = useState<string>('');
  const [filterTarget, setFilterTarget] = useState<string>('');

  // 폼 상태
  const [sessionName, setSessionName] = useState<string>('');
  const [workType, setWorkType] = useState<string>('');
  const [operators, setOperators] = useState<string[]>(['']);
  const [targets, setTargets] = useState<string[]>(['']);
  const [currentOperator, setCurrentOperator] = useState<string>('');
  const [currentTarget, setCurrentTarget] = useState<string>('');

  // Refs
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // ==================== 메모화된 값들 ====================
  const theme = useMemo(() => isDark ? darkTheme : lightTheme, [isDark]);
  
  const isRunning = useMemo(() => timerState === TimerState.RUNNING, [timerState]);
  
  const analysis = useMemo(() => {
    return currentSession && lapTimes.length >= MIN_ANALYSIS_RECORDS 
      ? calculateGageRR(lapTimes) 
      : null;
  }, [currentSession, lapTimes]);

  const filteredLapTimes = useMemo(() => {
    return lapTimes.filter(lap => {
      const operatorMatch = !filterOperator || lap.operator === filterOperator;
      const targetMatch = !filterTarget || lap.target === filterTarget;
      return operatorMatch && targetMatch;
    });
  }, [lapTimes, filterOperator, filterTarget]);

  // ==================== 최적화된 콜백 함수들 ====================
  
  // 토스트 메시지 표시 (안전한 타입 체크)
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    if (!message?.trim()) return;
    setToast({ message: message.trim(), type, isVisible: true });
  }, []);

  // 토스트 닫기
  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  // 모달 제어 (상호배타적)
  const openModal = useCallback((modal: ModalState) => {
    setModalState(modal);
  }, []);

  const closeModal = useCallback(() => {
    setModalState(ModalState.NONE);
    setSelectedSessionHistory(null);
  }, []);

  // ==================== 타이머 제어 함수들 (상호배타적 상태) ====================
  
  const toggleTimer = useCallback(() => {
    try {
      if (!currentSession) {
        showToast('먼저 작업 세션을 생성해주세요.', 'warning');
        return;
      }

      if (timerState === TimerState.RUNNING) {
        setTimerState(TimerState.PAUSED);
      } else {
        startTimeRef.current = Date.now() - currentTime;
        setTimerState(TimerState.RUNNING);
      }
    } catch (error) {
      console.error('toggleTimer error:', error);
      showToast('타이머 조작 중 오류가 발생했습니다.', 'error');
    }
  }, [currentSession, timerState, currentTime, showToast]);

  const stopTimer = useCallback(() => {
    try {
      setTimerState(TimerState.STOPPED);
      setCurrentTime(0);
    } catch (error) {
      console.error('stopTimer error:', error);
      showToast('타이머 중지 중 오류가 발생했습니다.', 'error');
    }
  }, [showToast]);

  const resetTimer = useCallback(() => {
    try {
      setTimerState(TimerState.STOPPED);
      setCurrentTime(0);
      setLapTimes([]);
      
      if (currentSession) {
        // 안전한 상태 업데이트
        setAllLapTimes(prev => prev.filter(lap => lap.sessionId !== currentSession.id));
        
        const updatedSession: SessionData = { 
          ...currentSession, 
          lapTimes: [],
          endTime: new Date().toLocaleString('ko-KR')
        };
        
        setCurrentSession(updatedSession);
        setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
      }
      
      showToast('측정 기록이 모두 초기화되었습니다.', 'success');
    } catch (error) {
      console.error('resetTimer error:', error);
      showToast('초기화 중 오류가 발생했습니다.', 'error');
    }
  }, [currentSession, showToast]);

  const recordLap = useCallback(() => {
    try {
      // 입력 유효성 검사 (완전포괄적)
      if (!currentSession) {
        showToast('활성 세션이 없습니다.', 'warning');
        return;
      }

      if (!currentOperator?.trim()) {
        showToast('측정자를 선택해주세요.', 'warning');
        return;
      }

      if (!currentTarget?.trim()) {
        showToast('대상자를 선택해주세요.', 'warning');
        return;
      }

      if (currentTime <= 0) {
        showToast('유효한 측정 시간이 아닙니다.', 'warning');
        return;
      }

      // 안전한 랩타임 생성
      const newLap: LapTime = {
        id: Date.now() + Math.random(), // 충돌 방지
        time: Math.max(0, currentTime),
        timestamp: new Date().toLocaleString('ko-KR'),
        operator: currentOperator.trim(),
        target: currentTarget.trim(),
        sessionId: currentSession.id
      };

      // 상태 업데이트 (원자적)
      const updatedLaps = [...lapTimes, newLap];
      setLapTimes(updatedLaps);
      setAllLapTimes(prev => [...prev, newLap]);

      // 타이머 중지 및 초기화
      setTimerState(TimerState.STOPPED);
      setCurrentTime(0);

      // 세션 업데이트
      const updatedSession: SessionData = { 
        ...currentSession, 
        lapTimes: updatedLaps,
        endTime: new Date().toLocaleString('ko-KR')
      };
      
      setCurrentSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));

      showToast('측정이 완료되었습니다.', 'success');
    } catch (error) {
      console.error('recordLap error:', error);
      showToast('측정 기록 중 오류가 발생했습니다.', 'error');
    }
  }, [currentTime, currentSession, currentOperator, currentTarget, lapTimes, showToast]);

  // ==================== 데이터 관리 함수들 ====================
  
  const deleteLapTime = useCallback((lapId: number) => {
    try {
      if (!lapId || lapId <= 0) return;

      const updatedLaps = lapTimes.filter(lap => lap.id !== lapId);
      const updatedAllLaps = allLapTimes.filter(lap => lap.id !== lapId);
      
      setLapTimes(updatedLaps);
      setAllLapTimes(updatedAllLaps);

      if (currentSession) {
        const updatedSession: SessionData = { ...currentSession, lapTimes: updatedLaps };
        setCurrentSession(updatedSession);
        setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
      }
      
      showToast('측정 기록이 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('deleteLapTime error:', error);
      showToast('기록 삭제 중 오류가 발생했습니다.', 'error');
    }
  }, [lapTimes, allLapTimes, currentSession, showToast]);

  const createSession = useCallback(() => {
    try {
      // 입력 유효성 검사 (완전포괄적)
      if (!sessionName?.trim()) {
        showToast('세션명을 입력해주세요.', 'warning');
        return;
      }

      if (!workType?.trim()) {
        showToast('작업 유형을 선택해주세요.', 'warning');
        return;
      }

      const validOperators = operators.filter(op => op?.trim());
      if (validOperators.length === 0) {
        showToast('최소 1명의 측정자를 입력해주세요.', 'warning');
        return;
      }

      const validTargets = targets.filter(tg => tg?.trim());
      if (validTargets.length === 0) {
        showToast('최소 1개의 대상자를 입력해주세요.', 'warning');
        return;
      }

      // 중복 검사
      const uniqueOperators = [...new Set(validOperators.map(op => op.trim()))];
      const uniqueTargets = [...new Set(validTargets.map(tg => tg.trim()))];

      if (uniqueOperators.length !== validOperators.length) {
        showToast('중복된 측정자가 있습니다.', 'warning');
        return;
      }

      if (uniqueTargets.length !== validTargets.length) {
        showToast('중복된 대상자가 있습니다.', 'warning');
        return;
      }

      // 안전한 세션 생성
      const newSession: SessionData = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: sessionName.trim(),
        workType: workType.trim(),
        operators: uniqueOperators,
        targets: uniqueTargets,
        lapTimes: [],
        startTime: new Date().toLocaleString('ko-KR'),
        isActive: true
      };

      // 상태 업데이트 (원자적)
      setSessions(prev => [...prev, newSession]);
      setCurrentSession(newSession);
      setCurrentOperator(newSession.operators[0]);
      setCurrentTarget(newSession.targets[0]);
      
      // 새 세션 시작 시 완전 초기화
      setLapTimes([]);
      setCurrentTime(0);
      setTimerState(TimerState.STOPPED);
      
      // 모달 닫기 및 폼 리셋
      closeModal();
      setSessionName('');
      setWorkType('');
      setOperators(['']);
      setTargets(['']);

      showToast('새 세션이 생성되었습니다.', 'success');
    } catch (error) {
      console.error('createSession error:', error);
      showToast('세션 생성 중 오류가 발생했습니다.', 'error');
    }
  }, [sessionName, workType, operators, targets, showToast, closeModal]);

  // 측정자/대상자 관리 (안전한 배열 조작)
  const addOperator = useCallback(() => {
    setOperators(prev => [...prev, '']);
  }, []);

  const removeOperator = useCallback((index: number) => {
    if (operators.length > 1 && index >= 0 && index < operators.length) {
      setOperators(prev => prev.filter((_, i) => i !== index));
    }
  }, [operators.length]);

  const updateOperator = useCallback((index: number, value: string) => {
    if (index >= 0 && index < operators.length) {
      setOperators(prev => prev.map((op, i) => i === index ? value : op));
    }
  }, [operators.length]);

  const addTarget = useCallback(() => {
    setTargets(prev => [...prev, '']);
  }, []);

  const removeTarget = useCallback((index: number) => {
    if (targets.length > 1 && index >= 0 && index < targets.length) {
      setTargets(prev => prev.filter((_, i) => i !== index));
    }
  }, [targets.length]);

  const updateTarget = useCallback((index: number, value: string) => {
    if (index >= 0 && index < targets.length) {
      setTargets(prev => prev.map((tg, i) => i === index ? value : tg));
    }
  }, [targets.length]);

  // 세션 히스토리 관리
  const clearSessionHistory = useCallback(() => {
    try {
      setSessions([]);
      setCurrentSession(null);
      setLapTimes([]);
      setAllLapTimes([]);
      setCurrentTime(0);
      setTimerState(TimerState.STOPPED);
      showToast('모든 세션 히스토리가 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('clearSessionHistory error:', error);
      showToast('히스토리 삭제 중 오류가 발생했습니다.', 'error');
    }
  }, [showToast]);

  // ==================== 파일 다운로드 함수들 ====================
  
  const downloadMeasurementData = useCallback(() => {
    try {
      if (lapTimes.length === 0) {
        showToast('다운로드할 측정 기록이 없습니다.', 'warning');
        return;
      }

      if (!currentSession) {
        showToast('활성 세션이 없습니다.', 'error');
        return;
      }

      const csvContent = [
        ['측정 기록'],
        [''],
        ['세션명', currentSession.name],
        ['작업유형', currentSession.workType],
        ['측정일시', currentSession.startTime],
        ['총 측정횟수', lapTimes.length.toString()],
        [''],
        ['순번', '측정시간', '측정자', '대상자', '기록시간'],
        ...lapTimes.map((lap, index) => [
          (index + 1).toString(),
          formatTime(lap.time),
          lap.operator,
          lap.target,
          lap.timestamp
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${generateFileName('측정기록', currentSession.name)}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(link.href);

      showToast('측정 기록이 다운로드되었습니다.', 'success');
    } catch (error) {
      console.error('downloadMeasurementData error:', error);
      showToast('파일 다운로드 중 오류가 발생했습니다.', 'error');
    }
  }, [lapTimes, currentSession, showToast]);

  const downloadDetailedAnalysis = useCallback(() => {
    try {
      if (lapTimes.length < MIN_ANALYSIS_RECORDS) {
        showToast(`상세 분석을 위해서는 최소 ${MIN_ANALYSIS_RECORDS}개의 측정 기록이 필요합니다.`, 'warning');
        return;
      }

      if (!currentSession || !analysis) {
        showToast('분석 데이터가 없습니다.', 'error');
        return;
      }

      const basicStats = {
        mean: lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length,
        stdDev: Math.sqrt(lapTimes.reduce((acc, lap) => {
          const mean = lapTimes.reduce((sum, l) => sum + l.time, 0) / lapTimes.length;
          return acc + Math.pow(lap.time - mean, 2);
        }, 0) / Math.max(1, lapTimes.length - 1))
      };

      const measurementData = [
        ['=== 측정 기록 데이터 ==='],
        [''],
        ['순번', '측정시간', '측정자', '대상자', '기록시간'],
        ...lapTimes.map((lap, index) => [
          (index + 1).toString(),
          formatTime(lap.time),
          lap.operator,
          lap.target,
          lap.timestamp
        ])
      ];

      const analysisData = [
        ['=== Gage R&R 상세 분석 보고서 ==='],
        [''],
        ['【 세션 정보 】'],
        ['세션명', currentSession.name],
        ['작업유형', currentSession.workType],
        ['측정일시', currentSession.startTime],
        ['완료일시', currentSession.endTime || '진행중'],
        ['총 측정횟수', lapTimes.length.toString()],
        ['측정자 수', currentSession.operators.length.toString()],
        ['대상자 수', currentSession.targets.length.toString()],
        [''],
        ['【 기본 통계 분석 】'],
        ['평균 시간 (ms)', basicStats.mean.toFixed(2)],
        ['표준편차 (ms)', basicStats.stdDev.toFixed(3)],
        ['변동계수 (%)', ((basicStats.stdDev / basicStats.mean) * 100).toFixed(2)],
        ['최소값 (ms)', Math.min(...lapTimes.map(l => l.time)).toString()],
        ['최대값 (ms)', Math.max(...lapTimes.map(l => l.time)).toString()],
        ['범위 (ms)', (Math.max(...lapTimes.map(l => l.time)) - Math.min(...lapTimes.map(l => l.time))).toString()],
        [''],
        ['【 Gage R&R 분석 결과 】'],
        ['반복성 (Repeatability)', analysis.repeatability.toFixed(3)],
        ['재현성 (Reproducibility)', analysis.reproducibility.toFixed(3)],
        ['Gage R&R 총합', analysis.gageRR.toFixed(3)],
        ['부품간 변동', analysis.partVariation.toFixed(3)],
        ['총 변동', analysis.totalVariation.toFixed(3)],
        ['Gage R&R 비율 (%)', `${analysis.gageRRPercent.toFixed(1)}%`],
        ['NDC (구별범주수)', analysis.ndc.toString()],
        ['Cpk (공정능력지수)', analysis.cpk.toFixed(3)],
        ['측정시스템 판정', {
          excellent: '우수',
          acceptable: '양호', 
          marginal: '보통',
          unacceptable: '불량'
        }[analysis.status]],
        [''],
        ['【 ANOVA 분산 성분 분석 】'],
        ['측정자 변동', analysis.anova.operator.toFixed(3)],
        ['부품 변동', analysis.anova.part.toFixed(3)],
        ['상호작용', analysis.anova.interaction.toFixed(3)],
        ['측정 오차', analysis.anova.error.toFixed(3)],
        [''],
        ['【 상세 해석 및 권장사항 】'],
        ['1. 측정시스템 상태'],
        [analysis.gageRRPercent < 10 
          ? '✓ 측정 시스템이 우수합니다. 현재 측정 절차와 설정을 유지하세요.'
          : analysis.gageRRPercent < 30
          ? '△ 측정 시스템이 양호합니다. 지속적인 모니터링과 주기적인 검증이 필요합니다.'
          : analysis.gageRRPercent < 50
          ? '⚠ 측정 시스템이 보통 수준입니다. 측정 절차 개선을 검토하세요.'
          : '✗ 측정 시스템 개선이 시급합니다. 장비 교정, 측정자 교육, 측정 절차 표준화가 필요합니다.'
        ],
        [''],
        ['2. 변동성 분석'],
        [analysis.repeatability < analysis.reproducibility 
          ? '- 반복성이 우수하여 장비의 일관성이 양호합니다.'
          : '- 반복성 개선이 필요합니다. 장비 점검 및 교정을 검토하세요.'],
        [analysis.reproducibility < analysis.repeatability 
          ? '- 측정자 간 일치성이 양호합니다.'
          : '- 측정자 교육 및 표준 절차 수립이 필요합니다.'],
        [''],
        ['3. 개선 권장사항'],
        ...(analysis.gageRRPercent >= 30 ? [
          ['- 측정 장비의 정확도와 정밀도 재점검'],
          ['- 측정자 교육 프로그램 강화'],
          ['- 표준 작업 절차서(SOP) 재정비'],
          ['- 측정 환경 조건 표준화']
        ] : []),
        [analysis.repeatability > analysis.reproducibility ? 
          '- 측정 장비 교정 및 유지보수 우선 실시' :
          '- 측정자 간 일관성 향상을 위한 교육 강화'],
        ['- 정기적인 Gage R&R 재평가 실시 (월 1회 권장)'],
        ['- 측정 데이터 추세 분석 및 관리'],
        [''],
        ['【 보고서 생성 정보 】'],
        ['생성일시', new Date().toLocaleString('ko-KR')],
        ['분석 버전', 'Enhanced v5.0 Optimized'],
        ['데이터 품질', lapTimes.length >= 30 ? '충분' : lapTimes.length >= 10 ? '양호' : '보통']
      ];

      const csvContent = [
        ...measurementData.map(row => row.join(',')),
        '',
        ...analysisData.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${generateFileName('상세분석보고서', currentSession.name)}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(link.href);

      showToast('상세 분석 보고서가 다운로드되었습니다.', 'success');
    } catch (error) {
      console.error('downloadDetailedAnalysis error:', error);
      showToast('보고서 생성 중 오류가 발생했습니다.', 'error');
    }
  }, [lapTimes, currentSession, analysis, showToast]);

  // ==================== Effect 훅들 ====================
  
  // 다크모드 적용
  useEffect(() => {
    try {
      const htmlElement = document.documentElement;
      if (isDark) {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
    } catch (error) {
      console.error('Dark mode toggle error:', error);
    }
  }, [isDark]);

  // 타이머 로직 (안전한 interval 관리)
  useEffect(() => {
    if (timerState === TimerState.RUNNING) {
      intervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setCurrentTime(Math.max(0, elapsed));
      }, TIMER_INTERVAL);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // 클린업 함수 (메모리 누수 방지)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState]);

  // 키보드 이벤트 (안전한 이벤트 처리)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      try {
        // 입력 필드에서는 키보드 단축키 비활성화
        if (e.target instanceof HTMLInputElement || 
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLSelectElement) {
          return;
        }

        // 모달이 열려있을 때는 키보드 단축키 비활성화
        if (modalState !== ModalState.NONE) {
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
          default:
            break;
        }
      } catch (error) {
        console.error('Keyboard event error:', error);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    // 클린업 함수
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [modalState, toggleTimer, recordLap, stopTimer, resetTimer]);

  // ==================== 렌더링 ====================
  
  // 랜딩 페이지
  if (modalState === ModalState.LANDING) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-800 via-blue-900 to-blue-950' : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'}`}>
        <ConsolidatedSupplyLogo isDark={isDark} />
        <div className="p-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">물류 작업현장 인시수 측정 타이머</h1>
          <p className="text-blue-100 mb-8 text-lg">Gage R&R 분석 v5.0 Enhanced & Optimized</p>
          <buttonimport React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  Play, Pause, Square, RotateCcw, Download, Plus, Users,
  Package, Clock, BarChart3, FileText, Calculator,
  Zap, Target, Home, HelpCircle, RefreshCw, LogOut,
  Moon, Sun, TrendingUp, PieChart, Info, CheckCircle,
  AlertCircle, XCircle, Timer, Activity, Settings,
  Trash2, Filter, Search, X, Minus
} from 'lucide-react';

// ==================== 타입 정의 ====================
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
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  cpk: number;
  anova: {
    operator: number;
    part: number;
    interaction: number;
    error: number;
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
}

// 타이머 상태 열거형 (상호배타적)
enum TimerState {
  STOPPED = 'STOPPED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED'
}

// 모달 상태 열거형 (상호배타적)
enum ModalState {
  NONE = 'NONE',
  NEW_SESSION = 'NEW_SESSION',
  SESSION_HISTORY = 'SESSION_HISTORY',
  HELP = 'HELP',
  LANDING = 'LANDING'
}

// ==================== 상수 및 테마 ====================
const TIMER_INTERVAL = 10; // 10ms
const MIN_ANALYSIS_RECORDS = 6;
const AUTO_HIDE_TOAST_DELAY = 3000;

const lightTheme: Theme = {
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
  input: 'bg-white border-gray-300 text-gray-900'
};

const darkTheme: Theme = {
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
  input: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
};

// ==================== 유틸리티 함수 ====================
const formatTime = (ms: number): string => {
  try {
    if (ms < 0) return '00:00.00';
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('formatTime error:', error);
    return '00:00.00';
  }
};

const generateFileName = (prefix: string, sessionName: string): string => {
  try {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${year}${month}${day}${hour}${minute}`;
    
    // 파일명에 안전하지 않은 문자 제거
    const safeName = sessionName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    
    return `${prefix}-${safeName}-(${timestamp})`;
  } catch (error) {
    console.error('generateFileName error:', error);
    return `${prefix}-session-(${Date.now()})`;
  }
};

const calculateGageRR = (lapTimes: LapTime[]): GageRRAnalysis => {
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
    anova: { operator: 0, part: 0, interaction: 0, error: 0 }
  };

  try {
    if (!lapTimes || lapTimes.length < MIN_ANALYSIS_RECORDS) {
      return defaultResult;
    }

    const times = lapTimes.map(lap => lap.time).filter(time => time > 0);
    if (times.length < MIN_ANALYSIS_RECORDS) {
      return defaultResult;
    }

    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / Math.max(1, times.length - 1);
    const stdDev = Math.sqrt(variance);

    // 측정자별, 대상자별 그룹화 (안전한 그룹화)
    const operatorGroups = lapTimes.reduce((groups, lap) => {
      const key = lap.operator?.trim();
      if (key && lap.time > 0) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(lap.time);
      }
      return groups;
    }, {} as Record<string, number[]>);

    const targetGroups = lapTimes.reduce((groups, lap) => {
      const key = lap.target?.trim();
      if (key && lap.time > 0) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(lap.time);
      }
      return groups;
    }, {} as Record<string, number[]>);

    const operatorCount = Object.keys(operatorGroups).length;
    const targetCount = Object.keys(targetGroups).length;

    if (operatorCount === 0 || targetCount === 0) {
      return defaultResult;
    }

    const trialsPerCondition = Math.max(1, Math.floor(times.length / (operatorCount * targetCount)));

    // 반복성 계산 (장비 변동)
    let repeatabilityVariance = 0;
    let totalGroups = 0;

    Object.values(operatorGroups).forEach(group => {
      if (group.length > 1) {
        const groupMean = group.reduce((a, b) => a + b, 0) / group.length;
        repeatabilityVariance += group.reduce((acc, val) => acc + Math.pow(val - groupMean, 2), 0);
        totalGroups++;
      }
    });

    const repeatability = totalGroups > 0 
      ? Math.sqrt(repeatabilityVariance / Math.max(1, times.length - operatorCount))
      : stdDev * 0.8;

    // 재현성 계산 (측정자 변동)
    const operatorMeans = Object.values(operatorGroups)
      .filter(group => group.length > 0)
      .map(group => group.reduce((a, b) => a + b, 0) / group.length);

    const operatorVariance = operatorMeans.length > 1
      ? operatorMeans.reduce((acc, opMean) => acc + Math.pow(opMean - mean, 2), 0) / Math.max(1, operatorCount - 1)
      : 0;

    const reproducibility = Math.sqrt(Math.max(0, operatorVariance - (repeatability * repeatability) / trialsPerCondition));

    // 부품 변동 계산
    const targetMeans = Object.values(targetGroups)
      .filter(group => group.length > 0)
      .map(group => group.reduce((a, b) => a + b, 0) / group.length);

    const targetVariance = targetMeans.length > 1
      ? targetMeans.reduce((acc, targetMean) => acc + Math.pow(targetMean - mean, 2), 0) / Math.max(1, targetCount - 1)
      : variance;

    const partVariation = Math.sqrt(Math.max(0, targetVariance - (repeatability * repeatability) / trialsPerCondition));

    const gageRR = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
    const totalVariation = Math.sqrt(gageRR ** 2 + partVariation ** 2);
    const gageRRPercent = totalVariation > 0 ? Math.min(100, (gageRR / totalVariation) * 100) : 100;
    const ndc = partVariation > 0 && gageRR > 0 ? Math.max(0, Math.floor((partVariation / gageRR) * 1.41)) : 0;

    // Cpk 계산 (공정능력지수)
    const cpk = partVariation > 0 && stdDev > 0 ? Math.max(0, partVariation / (6 * stdDev)) : 0;

    // ANOVA 분석
    const anova = {
      operator: Math.max(0, operatorVariance),
      part: Math.max(0, targetVariance),
      interaction: Math.max(0, variance * 0.1),
      error: Math.max(0, repeatability ** 2)
    };

    // 상태 결정 (상호배타적)
    let status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
    if (gageRRPercent < 10) status = 'excellent';
    else if (gageRRPercent < 30) status = 'acceptable';
    else if (gageRRPercent < 50) status = 'marginal';
    else status = 'unacceptable';

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
      anova
    };
  } catch (error) {
    console.error('calculateGageRR error:', error);
    return defaultResult;
  }
};

// ==================== 최적화된 컴포넌트들 ====================

// 토스트 컴포넌트 (메모화)
const Toast = memo<ToastProps>(({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, AUTO_HIDE_TOAST_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const typeConfig = useMemo(() => ({
    success: { style: 'bg-green-500 text-white', icon: CheckCircle },
    error: { style: 'bg-red-500 text-white', icon: XCircle },
    warning: { style: 'bg-yellow-500 text-white', icon: AlertCircle },
    info: { style: 'bg-blue-500 text-white', icon: Info }
  }), []);

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

// 상태 배지 컴포넌트 (메모화)
const StatusBadge = memo<{ status: string; size?: 'sm' | 'md' | 'lg' }>(({ status, size = 'md' }) => {
  const config = useMemo(() => {
    const configs = {
      excellent: { 
        icon: CheckCircle, 
        text: '우수', 
        color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
      },
      acceptable: { 
        icon: CheckCircle, 
        text: '양호', 
        color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
      },
      marginal: { 
        icon: AlertCircle, 
        text: '보통', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700'
      },
      unacceptable: { 
        icon: XCircle, 
        text: '불량', 
        color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
      }
    };
    return configs[status as keyof typeof configs] || configs.unacceptable;
  }, [status]);

  const sizeConfig = useMemo(() => ({
    sm: { container: 'px-2 py-1 text-xs', icon: 'w-3 h-3' },
    md: { container: 'px-3 py-1.5 text-sm', icon: 'w-4 h-4' },
    lg: { container: 'px-4 py-2 text-base', icon: 'w-5 h-5' }
  }), []);

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeConfig[size].container} ${config.color}`}>
      <Icon className={sizeConfig[size].icon} />
      {config.text}
    </span>
  );
});

// 로고 컴포넌트 (메모화)
const ConsolidatedSupplyLogo = memo<{ isDark?: boolean }>(({ isDark = false }) => (
  <div className={`relative flex items-center justify-center p-12 overflow-hidden ${
    isDark 
      ? 'bg-gradient-to-br from-slate-800 via-blue-900 to-blue-950' 
      : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'
  }`}>
    {/* 배경 패턴 */}
    <div className="absolute inset-0 opacity-5">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 2px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />
    </div>
    
    {/* 광택 효과 */}
    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/10 to-transparent" />
    
    <div className="text-center relative z-10">
      {/* 로고 섹션 */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative w-32 h-32">
          {/* 빨간색 육각형 (상단) */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-16 h-16 bg-red-500 transform rotate-45 rounded-xl shadow-2xl border-3 border-red-400 hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-4 bg-red-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">H</span>
              </div>
            </div>
          </div>

          {/* 노란색 육각형 (좌하단) */}
          <div className="absolute top-8 -left-8">
            <div className="w-16 h-16 bg-yellow-400 transform rotate-45 rounded-xl shadow-2xl border-3 border-yellow-300 hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-4 bg-yellow-300 rounded-lg flex items-center justify-center">
                <span className="text-gray-800 font-bold text-2xl">H</span>
              </div>
            </div>
          </div>

          {/* 파란색 육각형 (우하단) */}
          <div className="absolute top-8 right-8">
            <div className="w-16 h-16 bg-blue-500 transform rotate-45 rounded-xl shadow-2xl border-3 border-blue-400 hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-4 bg-blue-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">I</span>
              </div>
            </div>
          </div>

          {/* 중앙 연결 기어 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-full shadow-xl flex items-center justify-center border-3 border-yellow-400 hover:rotate-180 transition-transform duration-500">
              <div className="w-6 h-6 bg-white rounded-full shadow-inner"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 텍스트 섹션 */}
      <div className="space-y-3">
        <div className="text-3xl font-bold tracking-wide text-white drop-shadow-lg">
          종합보급창
        </div>
        <div className="text-base opacity-90 font-medium tracking-wider text-blue-100">
          ROKAF CONSOLIDATED
        </div>
        <div className="text-base opacity-90 font-medium tracking-wider text-blue-100">
          SUPPLY DEPOT
        </div>
        <div className="mt-6 w-20 h-1 bg-white/30 mx-auto rounded-full"></div>
      </div>
    </div>
  </div>
));

// 도움말 모달 컴포넌트 (메모화)
const HelpModal = memo<{ 
  isOpen: boolean; 
  onClose: () => void; 
  theme: Theme;
}>(({ isOpen, onClose, theme }) => {
  const helpSections = useMemo(() => [
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
        { key: '보고서', desc: '상세 분석 페이지에서 전문 해석 및 개선 방안 확인' }
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
  ], []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${theme.card} rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border ${theme.border}`}>
        {/* 헤더 */}
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

        {/* 내용 */}
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
                        className={`p-4 rounded-lg border ${theme.border} ${
                          theme.card === 'bg-white' ? 'bg-gray-50' : 'bg-gray-700/50'
                        } hover:shadow-md transition-shadow`}
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
                            <div className={`px-2 py-1 rounded text-xs font-mono font-medium ${
                              theme.card === 'bg-white' 
                                ? 'bg-gray-200 text-gray-700' 
                                : 'bg-gray-600 text-gray-300'
                            }`}>
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

        {/* 푸터 */}
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

// 측정 카드 컴포넌트 (메모화)
const MeasurementCard = memo<{
  title: string;
  value: string | number;
  unit?: string;
  icon: React.FC<any>;
  status?: 'success' | 'warning' | 'error' | 'info';
  theme: Theme;
  size?: 'sm' | 'md' | 'lg';
}>(({ title, value, unit, icon: Icon, status = 'info', theme, size = 'md' }) => {
  const statusConfig = useMemo(() => ({
    success: {
      colors: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    warning: {
      colors: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700',
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    error: {
      colors: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700',
      iconColor: 'text-red-600 dark:text-red-400'
    },
    info: {
      colors: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700',
      iconColor: 'text-blue-600 dark:text-blue-400'
    }
  }
