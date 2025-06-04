const stdDev = times.length > 1 
                      ? Math.sqrt(times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / (times.length - 1))
                      : 0;
                    
                    return (
                      <tr key={operator} className={`${theme.surfaceHover}`}>
                        <td className="p-3 font-medium">{operator}</td>
                        <td className="p-3 text-center">{operatorLaps.length}</td>
                        <td className="p-3 text-center font-mono">{formatTime(mean)}</td>
                        <td className="p-3 text-center font-mono">{stdDev.toFixed(2)} ms</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ==================== 메인 컴포넌트 ====================
const EnhancedLogisticsTimer = () => {
  // 상태 관리
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
  const [isDark, setIsDark] = useState(false);
  const [selectedSessionHistory, setSelectedSessionHistory] = useState<SessionData | null>(null);

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
  const [sessionName, setSessionName] = useState('');
  const [workType, setWorkType] = useState('');
  const [operators, setOperators] = useState<string[]>(['']);
  const [targets, setTargets] = useState<string[]>(['']);
  const [currentOperator, setCurrentOperator] = useState('');
  const [currentTarget, setCurrentTarget] = useState('');

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

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
  }, [isRunning, currentSession, currentOperator, currentTarget, showDetailedAnalysis, showNewSessionModal, showHelp, selectedSessionHistory]);

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
    setAllLapTimes(prev => prev.filter(lap => lap.sessionId !== currentSession?.id));
    
    if (currentSession) {
      const updatedSession = { ...currentSession, lapTimes: [] };
      setCurrentSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
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
      sessionId: currentSession.id
    };

    const updatedLaps = [...lapTimes, newLap];
    setLapTimes(updatedLaps);
    setAllLapTimes(prev => [...prev, newLap]);

    // 랩타임 기록 시 자동 중지 및 시간 초기화
    setIsRunning(false);
    setCurrentTime(0);

    // 세션 업데이트
    const updatedSession = { ...currentSession, lapTimes: updatedLaps };
    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));

    showToast('측정이 완료되었습니다.', 'success');
  }, [currentTime, currentSession, currentOperator, currentTarget, lapTimes, showToast]);

  // 개별 측정 기록 삭제
  const deleteLapTime = useCallback((lapId: number) => {
    const updatedLaps = lapTimes.filter(lap => lap.id !== lapId);
    const updatedAllLaps = allLapTimes.filter(lap => lap.id !== lapId);
    
    setLapTimes(updatedLaps);
    setAllLapTimes(updatedAllLaps);

    if (currentSession) {
      const updatedSession = { ...currentSession, lapTimes: updatedLaps };
      setCurrentSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
    }
    
    showToast('측정 기록이 삭제되었습니다.', 'success');
  }, [lapTimes, allLapTimes, currentSession, showToast]);

  // 세션 관리 함수들
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

    setSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);
    setCurrentOperator(newSession.operators[0]);
    setCurrentTarget(newSession.targets[0]);
    setShowNewSessionModal(false);

    // 새 세션 시작 시 자동 리셋
    setLapTimes([]);
    setCurrentTime(0);
    setIsRunning(false);

    // 폼 리셋
    setSessionName('');
    setWorkType('');
    setOperators(['']);
    setTargets(['']);

    showToast('새 세션이 생성되었습니다.', 'success');
  }, [sessionName, workType, operators, targets, showToast]);

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

  // 세션 히스토리 초기화
  const clearSessionHistory = useCallback(() => {
    setSessions([]);
    setCurrentSession(null);
    setLapTimes([]);
    setAllLapTimes([]);
    setCurrentTime(0);
    setIsRunning(false);
    showToast('모든 세션 히스토리가 삭제되었습니다.', 'success');
  }, [showToast]);

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
    link.download = `${generateFileName('측정기록', currentSession.name)}.csv`;
    link.click();

    showToast('측정 기록이 다운로드되었습니다.', 'success');
  }, [lapTimes, currentSession, showToast]);

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

    const analysis = calculateGageRR(lapTimes);
    
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
        index + 1,
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
      ['총 측정횟수', lapTimes.length.toString()],
      ['측정자 수', currentSession.operators.length.toString()],
      ['대상자 수', currentSession.targets.length.toString()],
      [''],
      ['【 종합 평가 】'],
      ['측정시스템 판정', analysis.status === 'excellent' ? '우수' :
        analysis.status === 'acceptable' ? '양호' :
        analysis.status === 'marginal' ? '보통' : '불량'],
      ['위험도', analysis.interpretation.riskLevel === 'low' ? '낮음' :
        analysis.interpretation.riskLevel === 'medium' ? '보통' : '높음'],
      ['종합 평가', analysis.interpretation.overall],
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
      [''],
      ['【 ANOVA 분산 성분 분석 】'],
      ['측정자 변동', analysis.anova.operator.toFixed(4)],
      ['부품 변동', analysis.anova.part.toFixed(4)],
      ['상호작용', analysis.anova.interaction.toFixed(4)],
      ['측정 오차', analysis.anova.error.toFixed(4)],
      ['총 변동', analysis.anova.total.toFixed(4)],
      [''],
      ['【 ANOVA 기여율 (%) 】'],
      ['측정자 기여율', `${analysis.anova.operatorPercent.toFixed(1)}%`],
      ['부품 기여율', `${analysis.anova.partPercent.toFixed(1)}%`],
      ['상호작용 기여율', `${analysis.anova.interactionPercent.toFixed(1)}%`],
      ['오차 기여율', `${analysis.anova.errorPercent.toFixed(1)}%`],
      [''],
      ['【 상세 해석 】'],
      ['반복성 해석', analysis.interpretation.repeatability],
      ['재현성 해석', analysis.interpretation.reproducibility],
      [''],
      ['【 개선 권장사항 】'],
      ...analysis.interpretation.recommendations.map((rec, idx) => [`${idx + 1}. ${rec}`]),
      [''],
      ['【 보고서 생성 정보 】'],
      ['생성일시', new Date().toLocaleString('ko-KR')],
      ['분석 버전', 'Enhanced v5.0 SOLID'],
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
    link.click();

    showToast('상세 분석 보고서가 다운로드되었습니다.', 'success');
  }, [lapTimes, currentSession, showToast]);

  // 필터링된 측정 기록
  const filteredLapTimes = useMemo(() => {
    return lapTimes.filter(lap => {
      return (!filterOperator || lap.operator === filterOperator) &&
             (!filterTarget || lap.target === filterTarget);
    });
  }, [lapTimes, filterOperator, filterTarget]);

  const analysis = useMemo(() => {
    return currentSession && lapTimes.length >= 6 ? calculateGageRR(lapTimes) : null;
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
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-800 via-blue-900 to-blue-950' : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'}`}>
        <ConsolidatedSupplyLogo isDark={isDark} />
        <div className="p-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">물류 작업현장 인시수 측정 타이머</h1>
          <p className="text-blue-100 mb-8 text-lg">Gage R&R 분석 v5.0 Enhanced SOLID</p>
          <button
            onClick={() => setShowLanding(false)}
            className="bg-white text-blue-700 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg text-lg"
          >
            시스템 시작
          </button>
        </div>
      </div>
    );
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

      {/* 헤더 */}
      <div className={`${theme.card} shadow-sm border-b ${theme.border} sticky top-0 z-40`}>
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-6 h-6 text-blue-500" />
              <h1 className={`text-lg font-bold ${theme.text}`}>물류 작업현장 인시수 측정 타이머</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowLanding(true)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:text-red-500 ${theme.surfaceHover}`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className={`text-xs ${theme.textMuted} mt-1`}>Gage R&R 분석 v5.0 Enhanced SOLID</div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 키보드 단축키 안내 */}
        <div className={`${theme.card} p-3 rounded-lg border ${theme.border}`}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className={`${theme.surface} ${theme.textSecondary} px-3 py-2 rounded border ${theme.border} text-center font-medium`}>스페이스: 시작/정지</span>
            <span className={`${theme.surface} ${theme.textSecondary} px-3 py-2 rounded border ${theme.border} text-center font-medium`}>Enter: 랩타임</span>
            <span className={`${theme.surface} ${theme.textSecondary} px-3 py-2 rounded border ${theme.border} text-center font-medium`}>Esc: 중지</span>
            <span className={`${theme.surface} ${theme.textSecondary} px-3 py-2 rounded border ${theme.border} text-center font-medium`}>R: 초기화</span>
          </div>
        </div>

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
                <div className={`font-medium ${theme.text} mb-1`}>{currentSession.name}</div>
                <div>{currentSession.workType}</div>
              </div>

              {/* 측정자/대상자 선택 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>측정자</label>
                  <select
                    value={currentOperator}
                    onChange={(e) => setCurrentOperator(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${theme.input}`}
                  >
                    {currentSession.operators.map(op => (
                      <option key={op} value={op}>{op}</option>
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
                      <option key={tg} value={tg}>{tg}</option>
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
            <div className={`text-5xl font-mono font-bold mb-6 ${theme.text} tracking-wider`}>
              {formatTime(currentTime)}
            </div>
            <div className={`text-sm ${theme.textMuted} mb-6`}>
              {isRunning ? '측정 중...' : '대기 중'}
            </div>

            {/* 개선된 버튼 레이아웃 - 한 줄로 배치 */}
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
                <span className="text-sm">랩타임</span>
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

            {/* 키보드 힌트 */}
            <div className={`text-xs ${theme.textMuted} grid grid-cols-3 gap-2`}>
              <span>스페이스</span>
              <span>Enter</span>
              <span>Esc</span>
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
                value={formatTime(lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)}
                icon={Clock}
                status="success"
                theme={theme}
                size="sm"
                isDark={isDark}
              />

              <MeasurementCard
                title="변동계수"
                value={lapTimes.length > 1 ? 
                  `${((Math.sqrt(lapTimes.reduce((acc, lap) => {
                    const mean = lapTimes.reduce((sum, l) => sum + l.time, 0) / lapTimes.length;
                    return acc + Math.pow(lap.time - mean, 2);
                  }, 0) / lapTimes.length) / (lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)) * 100).toFixed(1)}%` 
                  : '0%'
                }
                icon={Activity}
                status="warning"
                theme={theme}
                size="sm"
                isDark={isDark}
              />
            </div>

            {/* Gage R&R 분석 결과 */}
            {analysis && lapTimes.length >= 6 && (
              <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
                <MeasurementCard
                  title="Gage R&R"
                  value={`${analysis.gageRRPercent.toFixed(1)}%`}
                  icon={BarChart3}
                  status={analysis.status === 'excellent' || analysis.status === 'acceptable' ? 'success' : 'error'}
                  theme={theme}
                  size="sm"
                  isDark={isDark}
                />
                
                <MeasurementCard
                  title="Cpk"
                  value={analysis.cpk.toFixed(2)}
                  icon={Target}
                  status={analysis.cpk >= 1.33 ? 'success' : analysis.cpk >= 1.0 ? 'warning' : 'error'}
                  theme={theme}
                  size="sm"
                  isDark={isDark}
                />

                <MeasurementCard
                  title="NDC"
                  value={analysis.ndc}
                  icon={Calculator}
                  status={analysis.ndc >= 5 ? 'success' : analysis.ndc >= 3 ? 'warning' : 'error'}
                  theme={theme}
                  size="sm"
                  isDark={isDark}
                />
              </div>
            )}

            {/* 간략한 상태 표시 */}
            {analysis && lapTimes.length >= 6 && (
              <div className={`${theme.surface} p-3 rounded-lg border ${theme.border} text-center`}>
                <StatusBadge status={analysis.status} size="md" isDark={isDark} />
                <p className={`text-sm ${theme.textMuted} mt-2`}>
                  상세한 분석과 해석은 별도 페이지에서 확인하세요
                </p>
              </div>
            )}
          </div>
        )}

        {/* 액션 버튼들 - 항상 표시 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={downloadMeasurementData}
            className="bg-green-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-600 flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>측정기록</span>
          </button>
          
          <button
            onClick={() => {
              if (lapTimes.length < 6) {
                showToast('상세 분석을 위해서는 최소 6개의 측정 기록이 필요합니다.', 'warning');
              } else {
                setShowDetailedAnalysis(true);
              }
            }}
            className="bg-purple-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-purple-600 flex items-center justify-center space-x-2 transition-colors"
          >
            <PieChart className="w-4 h-4" />
            <span>상세분석</span>
          </button>
        </div>

        {/* 측정 기록 섹션 */}
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
                onClick={() => setFilterOperator(filterOperator ? '' : currentSession.operators[0])}
                className={`text-blue-500 text-sm hover:text-blue-700 transition-colors p-1 rounded ${theme.surfaceHover}`}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* 필터 섹션 */}
            {filterOperator && (
              <div className={`mb-4 p-3 rounded-lg border ${theme.border} ${theme.surface}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>측정자 필터</label>
                    <select
                      value={filterOperator}
                      onChange={(e) => setFilterOperator(e.target.value)}
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
                      value={filterTarget}
                      onChange={(e) => setFilterTarget(e.target.value)}
                      className={`w-full p-2 border rounded text-sm ${theme.input}`}
                    >
                      <option value="">전체</option>
                      {currentSession.targets.map(tg => (
                        <option key={tg} value={tg}>{tg}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(filterOperator || filterTarget) && (
                  <button
                    onClick={() => {
                      setFilterOperator('');
                      setFilterTarget('');
                    }}
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
                      <div className="flex-1">
                        <div className="font-mono text-xl font-bold text-blue-600 mb-2">
                          {formatTime(lap.time)}
                        </div>
                        <div className={`text-xs ${theme.textMuted} space-y-1`}>
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            <span>측정자: <span className={`font-medium ${theme.textSecondary}`}>{lap.operator}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="w-3 h-3" />
                            <span>대상자: <span className={`font-medium ${theme.textSecondary}`}>{lap.target}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>{lap.timestamp}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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

        {/* 세션 히스토리 */}
        {sessions.length > 0 && (
          <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-gray-500" />
                <h2 className={`font-semibold ${theme.text}`}>세션 히스토리</h2>
              </div>
              <button
                onClick={clearSessionHistory}
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
                    onClick={() => setSelectedSessionHistory(session)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      currentSession?.id === session.id
                        ? isDark ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                        : `${theme.border} ${theme.surface} ${theme.surfaceHover}`
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className={`font-medium text-sm ${theme.text}`}>{session.name}</div>
                        <div className={`text-xs ${theme.textMuted}`}>{session.workType}</div>
                        <div className={`text-xs ${theme.textMuted}`}>{session.startTime}</div>
                      </div>
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 새 세션 생성 모달 */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border ${theme.border}`}>
            <div className="p-6">
              <h3 className={`text-xl font-bold mb-4 ${theme.text}`}>새 작업 세션 생성</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textSecondary}`}>세션명 *</label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="예: 포장작업_0602"
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
                      <option value="물자검수팀">물자검수팀</option>
                      <option value="저장관리팀">저장관리팀</option>
                      <option value="포장관리팀">포장관리팀</option>
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
                        placeholder={`측정자 ${index + 1} (예: 조봉근)`}
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
                        placeholder={`대상자 ${index + 1} (예: 이나영)`}
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
                    <li>• 대상자 2개 이상: 부품간 변동성 분석</li>
                    <li>• 최소 6회 측정: 신뢰성 있는 분석 결과</li>
                    <li>• 권장 측정 횟수: 각 조건별 3-5회</li>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>세션명</div>
                    <div className={`font-medium ${theme.text}`}>{selectedSessionHistory.name}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>작업유형</div>
                    <div className={`font-medium ${theme.text}`}>{selectedSessionHistory.workType}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>측정자</div>
                    <div className={`font-medium ${theme.text}`}>{selectedSessionHistory.operators.join(', ')}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>대상자</div>
                    <div className={`font-medium ${theme.text}`}>{selectedSessionHistory.targets.join(', ')}</div>
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

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCurrentSession(selectedSessionHistory);
                      setLapTimes(allLapTimes.filter(lap => lap.sessionId === selectedSessionHistory.id));
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
        </div>
      )}

      {/* 도움말 모달 */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} theme={theme} />
    </div>
  );
};

export default EnhancedLogisticsTimer;import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  Play, Pause, Square, RotateCcw, Download, Plus, Users,
  Package, Clock, BarChart3, FileText, Calculator,
  Zap, Target, Home, HelpCircle, RefreshCw, LogOut,
  Moon, Sun, TrendingUp, PieChart, Info, CheckCircle,
  AlertCircle, XCircle, Timer, Activity, Settings,
  Trash2, Filter, Search, X, Minus, ArrowLeft, TrendingDown,
  TrendingUp as TrendingUpIcon, AlertTriangle
} from 'lucide-react';

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
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
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
  return `${prefix}-${safeName}-(${timestamp})`;
};

const calculateGageRR = (lapTimes: LapTime[]): GageRRAnalysis => {
  const defaultResult: GageRRAnalysis = {
    repeatability: 0, reproducibility: 0, gageRR: 0,
    partVariation: 0, totalVariation: 0, gageRRPercent: 100,
    ndc: 0, status: 'unacceptable', cpk: 0,
    anova: {
      operator: 0, part: 0, interaction: 0, error: 0, total: 0,
      operatorPercent: 0, partPercent: 0, interactionPercent: 0, errorPercent: 0
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
    const times = lapTimes.map(lap => lap.time).filter(time => time > 0);
    if (times.length < 6) return defaultResult;

    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / Math.max(1, times.length - 1);
    const stdDev = Math.sqrt(variance);

    // 측정자별, 대상자별 그룹화
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

    if (operatorCount === 0 || targetCount === 0) return defaultResult;

    const trialsPerCondition = Math.max(1, Math.floor(times.length / (operatorCount * targetCount)));

    // 반복성 계산 (Within-group variation)
    let repeatabilityVariance = 0;
    let totalWithinGroups = 0;

    Object.values(operatorGroups).forEach(group => {
      if (group.length > 1) {
        const groupMean = group.reduce((a, b) => a + b, 0) / group.length;
        repeatabilityVariance += group.reduce((acc, val) => acc + Math.pow(val - groupMean, 2), 0);
        totalWithinGroups += group.length - 1;
      }
    });

    const repeatability = totalWithinGroups > 0 
      ? Math.sqrt(repeatabilityVariance / totalWithinGroups)
      : stdDev * 0.8;

    // 재현성 계산 (Between-group variation)
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

    // Cpk 계산
    const cpk = partVariation > 0 && stdDev > 0 ? Math.max(0, partVariation / (6 * stdDev)) : 0;

    // ANOVA 분석 강화
    const totalANOVAVariance = operatorVariance + targetVariance + (variance * 0.1) + (repeatability ** 2);
    const anova = {
      operator: Math.max(0, operatorVariance),
      part: Math.max(0, targetVariance),
      interaction: Math.max(0, variance * 0.1),
      error: Math.max(0, repeatability ** 2),
      total: Math.max(0, totalANOVAVariance),
      operatorPercent: totalANOVAVariance > 0 ? (operatorVariance / totalANOVAVariance) * 100 : 0,
      partPercent: totalANOVAVariance > 0 ? (targetVariance / totalANOVAVariance) * 100 : 0,
      interactionPercent: totalANOVAVariance > 0 ? ((variance * 0.1) / totalANOVAVariance) * 100 : 0,
      errorPercent: totalANOVAVariance > 0 ? ((repeatability ** 2) / totalANOVAVariance) * 100 : 0
    };

    // 상태 결정
    let status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
    if (gageRRPercent < 10) status = 'excellent';
    else if (gageRRPercent < 30) status = 'acceptable';
    else if (gageRRPercent < 50) status = 'marginal';
    else status = 'unacceptable';

    // 해석 생성
    const interpretation = generateInterpretation(gageRRPercent, repeatability, reproducibility, cpk, ndc, anova);

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
  cpk: number, 
  ndc: number,
  anova: any
): GageRRAnalysis['interpretation'] => {
  const overall = gageRRPercent < 10 
    ? '측정 시스템이 우수합니다. 제품 변동을 정확하게 구별할 수 있으며, 측정 오차가 매우 낮습니다.'
    : gageRRPercent < 30
    ? '측정 시스템이 양호합니다. 대부분의 상황에서 사용 가능하나 지속적인 모니터링이 필요합니다.'
    : gageRRPercent < 50
    ? '측정 시스템이 보통 수준입니다. 제한적으로 사용 가능하나 개선이 권장됩니다.'
    : '측정 시스템에 심각한 문제가 있습니다. 즉시 개선이 필요하며, 현재 상태로는 신뢰할 수 없습니다.';

  const repeatabilityInterpretation = repeatability < reproducibility
    ? '반복성이 우수합니다. 동일한 측정자가 동일한 조건에서 측정할 때 일관된 결과를 얻을 수 있습니다.'
    : '반복성에 문제가 있습니다. 장비의 정밀도나 측정 환경을 점검해야 합니다.';

  const reproducibilityInterpretation = reproducibility < repeatability
    ? '재현성이 우수합니다. 서로 다른 측정자가 측정해도 일관된 결과를 얻을 수 있습니다.'
    : '재현성에 문제가 있습니다. 측정자 간 교육이나 표준 절차 개선이 필요합니다.';

  const recommendations: string[] = [];
  
  if (gageRRPercent >= 30) {
    recommendations.push('측정 시스템 전반적인 재검토 필요');
    recommendations.push('측정 장비의 교정 및 정밀도 점검');
  }
  
  if (repeatability > reproducibility) {
    recommendations.push('측정 장비의 안정성 및 정밀도 개선');
    recommendations.push('측정 환경 조건 표준화 (온도, 습도 등)');
  } else {
    recommendations.push('측정자 교육 프로그램 강화');
    recommendations.push('표준 작업 절차서(SOP) 개선');
  }

  if (cpk < 1.33) {
    recommendations.push('공정 능력 개선 필요 (Cpk ≥ 1.33 목표)');
  }

  if (ndc < 5) {
    recommendations.push('측정 시스템의 구별 능력 향상 필요');
  }

  if (anova.operatorPercent > 30) {
    recommendations.push('측정자 간 변동 감소를 위한 교육 강화');
  }

  const riskLevel: 'low' | 'medium' | 'high' = 
    gageRRPercent < 10 ? 'low' : 
    gageRRPercent < 30 ? 'medium' : 'high';

  return {
    overall,
    repeatability: repeatabilityInterpretation,
    reproducibility: reproducibilityInterpretation,
    recommendations,
    riskLevel
  };
};

// ==================== 컴포넌트들 (Single Responsibility) ====================

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
const ConsolidatedSupplyLogo = memo<{ isDark?: boolean }>(({ isDark = false }) => (
  <div className={`relative flex items-center justify-center p-12 overflow-hidden ${
    isDark 
      ? 'bg-gradient-to-br from-slate-800 via-blue-900 to-blue-950' 
      : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'
  }`}>
    <div className="absolute inset-0 opacity-5">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 2px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />
    </div>
    
    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/10 to-transparent" />
    
    <div className="text-center relative z-10">
      <div className="flex items-center justify-center mb-8">
        <div className="relative w-32 h-32">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-16 h-16 bg-red-500 transform rotate-45 rounded-xl shadow-2xl border-3 border-red-400 hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-4 bg-red-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">H</span>
              </div>
            </div>
          </div>

          <div className="absolute top-8 -left-8">
            <div className="w-16 h-16 bg-yellow-400 transform rotate-45 rounded-xl shadow-2xl border-3 border-yellow-300 hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-4 bg-yellow-300 rounded-lg flex items-center justify-center">
                <span className="text-gray-800 font-bold text-2xl">H</span>
              </div>
            </div>
          </div>

          <div className="absolute top-8 right-8">
            <div className="w-16 h-16 bg-blue-500 transform rotate-45 rounded-xl shadow-2xl border-3 border-blue-400 hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-4 bg-blue-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">I</span>
              </div>
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-full shadow-xl flex items-center justify-center border-3 border-yellow-400 hover:rotate-180 transition-transform duration-500">
              <div className="w-6 h-6 bg-white rounded-full shadow-inner"></div>
            </div>
          </div>
        </div>
      </div>

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

// 도움말 컴포넌트
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
  ], []);

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

// 측정 카드 컴포넌트 (개선된 색상 대비)
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
    md: { card: 'p-4', icon: 'w-5 h-5', title: 'text-sm', value: 'text-lg' },
    lg: { card: 'p-6', icon: 'w-6 h-6', title: 'text-base', value: 'text-2xl' }
  };

  const colors = statusColors[status];

  return (
    <div className={`${sizes[size].card} rounded-xl border transition-all duration-200 ${colors.bg} ${colors.border} hover:shadow-lg hover:scale-105`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`${sizes[size].icon} ${colors.icon}`} />
      </div>
      <div className={`${sizes[size].title} font-medium ${theme.textMuted} mb-1`}>
        {title}
      </div>
      <div className={`${sizes[size].value} font-bold ${colors.text} font-mono`}>
        {value}{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
});

// 상세 분석 페이지 컴포넌트
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
    const times = lapTimes.map(lap => lap.time);
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
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className={`text-xl font-bold ${theme.text}`}>상세 분석 보고서</h1>
                <p className={`text-sm ${theme.textMuted}`}>{session.name} - {session.workType}</p>
              </div>
            </div>
            <button
              onClick={onDownload}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>상세 보고서 다운로드</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* 종합 평가 */}
        <div className={`${theme.card} rounded-lg p-6 shadow-sm border ${theme.border}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-2xl font-bold ${theme.text}`}>종합 평가</h2>
            <div className="flex items-center gap-3">
              <StatusBadge status={analysis.status} size="lg" isDark={isDark} />
              <div className={`p-3 rounded-lg ${analysis.interpretation.riskLevel === 'high' 
                ? isDark ? 'bg-red-900/30' : 'bg-red-50'
                : analysis.interpretation.riskLevel === 'medium'
                ? isDark ? 'bg-yellow-900/30' : 'bg-yellow-50'
                : isDark ? 'bg-green-900/30' : 'bg-green-50'
              }`}>
                <div className={`text-sm font-medium ${
                  analysis.interpretation.riskLevel === 'high' 
                    ? isDark ? 'text-red-300' : 'text-red-800'
                    : analysis.interpretation.riskLevel === 'medium'
                    ? isDark ? 'text-yellow-300' : 'text-yellow-800'
                    : isDark ? 'text-green-300' : 'text-green-800'
                }`}>
                  위험도: {analysis.interpretation.riskLevel === 'high' ? '높음' : 
                          analysis.interpretation.riskLevel === 'medium' ? '보통' : '낮음'}
                </div>
              </div>
            </div>
          </div>
          
          <div className={`${theme.surface} p-4 rounded-lg mb-4`}>
            <p className={`text-lg leading-relaxed ${theme.text}`}>
              {analysis.interpretation.overall}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MeasurementCard
              title="Gage R&R 비율"
              value={`${analysis.gageRRPercent.toFixed(1)}%`}
              icon={BarChart3}
              status={analysis.status === 'excellent' || analysis.status === 'acceptable' ? 'success' : 'error'}
              theme={theme}
              isDark={isDark}
            />
            <MeasurementCard
              title="공정 능력 지수"
              value={analysis.cpk.toFixed(2)}
              icon={Target}
              status={analysis.cpk >= 1.33 ? 'success' : analysis.cpk >= 1.0 ? 'warning' : 'error'}
              theme={theme}
              isDark={isDark}
            />
            <MeasurementCard
              title="구별 범주 수"
              value={analysis.ndc}
              icon={Calculator}
              status={analysis.ndc >= 5 ? 'success' : analysis.ndc >= 3 ? 'warning' : 'error'}
              theme={theme}
              isDark={isDark}
            />
          </div>
        </div>

        {/* Gage R&R 상세 분석 */}
        <div className={`${theme.card} rounded-lg p-6 shadow-sm border ${theme.border}`}>
          <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Gage R&R 분해 분석</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className={`font-semibold ${theme.textSecondary} mb-3`}>변동 성분</h4>
              <div className="space-y-3">
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>반복성 (Repeatability)</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{analysis.repeatability.toFixed(3)}</span>
                  </div>
                  <p className={`text-sm ${theme.textMuted} mt-1`}>
                    {analysis.interpretation.repeatability}
                  </p>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>재현성 (Reproducibility)</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{analysis.reproducibility.toFixed(3)}</span>
                  </div>
                  <p className={`text-sm ${theme.textMuted} mt-1`}>
                    {analysis.interpretation.reproducibility}
                  </p>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>부품 변동</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{analysis.partVariation.toFixed(3)}</span>
                  </div>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg border-l-4 border-blue-500`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold ${theme.text}`}>총 Gage R&R</span>
                    <span className={`font-mono font-bold ${theme.text}`}>{analysis.gageRR.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className={`font-semibold ${theme.textSecondary} mb-3`}>기본 통계</h4>
              <div className="space-y-3">
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>평균 시간</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{formatTime(basicStats.mean)}</span>
                  </div>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>표준편차</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{basicStats.stdDev.toFixed(2)} ms</span>
                  </div>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>변동계수</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{basicStats.cv.toFixed(1)}%</span>
                  </div>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>범위 (최대-최소)</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{formatTime(basicStats.range)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ANOVA 분석 */}
        <div className={`${theme.card} rounded-lg p-6 shadow-sm border ${theme.border}`}>
          <h3 className={`text-xl font-bold ${theme.text} mb-4`}>ANOVA 분산 성분 분석</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className={`font-semibold ${theme.textSecondary} mb-3`}>분산 성분값</h4>
              <div className="space-y-3">
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>측정자 변동</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{analysis.anova.operator.toFixed(4)}</span>
                  </div>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>부품 변동</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{analysis.anova.part.toFixed(4)}</span>
                  </div>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>상호작용</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{analysis.anova.interaction.toFixed(4)}</span>
                  </div>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>측정 오차</span>
                    <span className={`font-mono ${theme.textSecondary}`}>{analysis.anova.error.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className={`font-semibold ${theme.textSecondary} mb-3`}>기여율 (%)</h4>
              <div className="space-y-3">
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>측정자</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-20 h-2 bg-gray-200 rounded-full overflow-hidden`}>
                        <div 
                          className="h-full bg-red-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, analysis.anova.operatorPercent)}%` }}
                        />
                      </div>
                      <span className={`font-mono text-sm ${theme.textSecondary}`}>
                        {analysis.anova.operatorPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>부품</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-20 h-2 bg-gray-200 rounded-full overflow-hidden`}>
                        <div 
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, analysis.anova.partPercent)}%` }}
                        />
                      </div>
                      <span className={`font-mono text-sm ${theme.textSecondary}`}>
                        {analysis.anova.partPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>상호작용</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-20 h-2 bg-gray-200 rounded-full overflow-hidden`}>
                        <div 
                          className="h-full bg-yellow-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, analysis.anova.interactionPercent)}%` }}
                        />
                      </div>
                      <span className={`font-mono text-sm ${theme.textSecondary}`}>
                        {analysis.anova.interactionPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`${theme.surface} p-3 rounded-lg`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${theme.text}`}>오차</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-20 h-2 bg-gray-200 rounded-full overflow-hidden`}>
                        <div 
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, analysis.anova.errorPercent)}%` }}
                        />
                      </div>
                      <span className={`font-mono text-sm ${theme.textSecondary}`}>
                        {analysis.anova.errorPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-4 p-4 rounded-lg ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} border-l-4 border-blue-500`}>
            <h5 className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-800'} mb-2`}>ANOVA 해석</h5>
            <ul className={`space-y-1 text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
              <li>• 부품 변동이 높을수록 측정 시스템이 부품 간 차이를 잘 구별함</li>
              <li>• 측정자 변동이 높으면 측정자 교육 및 표준화 필요</li>
              <li>• 오차 변동이 높으면 측정 장비의 정밀도 개선 필요</li>
              <li>• 상호작용이 높으면 측정자와 부품 간 복잡한 관계 존재</li>
            </ul>
          </div>
        </div>

        {/* 개선 권장사항 */}
        <div className={`${theme.card} rounded-lg p-6 shadow-sm border ${theme.border}`}>
          <h3 className={`text-xl font-bold ${theme.text} mb-4 flex items-center gap-2`}>
            <TrendingUpIcon className="w-6 h-6 text-green-500" />
            개선 권장사항
          </h3>
          
          <div className="space-y-3">
            {analysis.interpretation.recommendations.map((recommendation, index) => (
              <div key={index} className={`${theme.surface} p-4 rounded-lg border-l-4 border-green-500`}>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-50'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <span className={`text-xs font-bold ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                      {index + 1}
                    </span>
                  </div>
                  <p className={`${theme.text} leading-relaxed`}>{recommendation}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-6 p-4 rounded-lg ${analysis.interpretation.riskLevel === 'high'
            ? isDark ? 'bg-red-900/20' : 'bg-red-50'
            : analysis.interpretation.riskLevel === 'medium'
            ? isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'
            : isDark ? 'bg-green-900/20' : 'bg-green-50'
          } border-l-4 ${analysis.interpretation.riskLevel === 'high'
            ? 'border-red-500'
            : analysis.interpretation.riskLevel === 'medium'
            ? 'border-yellow-500'
            : 'border-green-500'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {analysis.interpretation.riskLevel === 'high' ? (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              ) : analysis.interpretation.riskLevel === 'medium' ? (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              <h4 className={`font-semibold ${analysis.interpretation.riskLevel === 'high'
                ? isDark ? 'text-red-300' : 'text-red-800'
                : analysis.interpretation.riskLevel === 'medium'
                ? isDark ? 'text-yellow-300' : 'text-yellow-800'
                : isDark ? 'text-green-300' : 'text-green-800'
              }`}>
                우선순위 조치사항
              </h4>
            </div>
            <p className={`text-sm ${analysis.interpretation.riskLevel === 'high'
              ? isDark ? 'text-red-200' : 'text-red-700'
              : analysis.interpretation.riskLevel === 'medium'
              ? isDark ? 'text-yellow-200' : 'text-yellow-700'
              : isDark ? 'text-green-200' : 'text-green-700'
            }`}>
              {analysis.interpretation.riskLevel === 'high'
                ? '즉시 조치가 필요합니다. 측정 시스템을 사용하기 전에 반드시 개선하세요.'
                : analysis.interpretation.riskLevel === 'medium'
                ? '주의 깊은 모니터링과 점진적 개선이 필요합니다.'
                : '현재 시스템을 유지하되 정기적인 재평가를 실시하세요.'
              }
            </p>
          </div>
        </div>

        {/* 측정 데이터 요약 */}
        <div className={`${theme.card} rounded-lg p-6 shadow-sm border ${theme.border}`}>
          <h3 className={`text-xl font-bold ${theme.text} mb-4`}>측정 데이터 요약</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${theme.surface} p-4 rounded-lg text-center`}>
              <div className={`text-2xl font-bold ${theme.text}`}>{lapTimes.length}</div>
              <div className={`text-sm ${theme.textMuted}`}>총 측정 횟수</div>
            </div>
            <div className={`${theme.surface} p-4 rounded-lg text-center`}>
              <div className={`text-2xl font-bold ${theme.text}`}>{session.operators.length}</div>
              <div className={`text-sm ${theme.textMuted}`}>측정자 수</div>
            </div>
            <div className={`${theme.surface} p-4 rounded-lg text-center`}>
              <div className={`text-2xl font-bold ${theme.text}`}>{session.targets.length}</div>
              <div className={`text-sm ${theme.textMuted}`}>대상자 수</div>
            </div>
            <div className={`${theme.surface} p-4 rounded-lg text-center`}>
              <div className={`text-2xl font-bold ${theme.text}`}>
                {Math.floor(lapTimes.length / (session.operators.length * session.targets.length))}
              </div>
              <div className={`text-sm ${theme.textMuted}`}>조건당 평균 측정</div>
            </div>
          </div>

          <div className="mt-4">
            <h4 className={`font-semibold ${theme.textSecondary} mb-2`}>측정자별 통계</h4>
            <div className="overflow-x-auto">
              <table className={`w-full text-sm ${theme.text}`}>
                <thead className={`${theme.surface}`}>
                  <tr>
                    <th className="p-3 text-left">측정자</th>
                    <th className="p-3 text-center">측정 횟수</th>
                    <th className="p-3 text-center">평균 시간</th>
                    <th className="p-3 text-center">표준편차</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme.border}`}>
                  {session.operators.map(operator => {
                    const operatorLaps = lapTimes.filter(lap => lap.operator === operator);
                    const times = operatorLaps.map(lap => lap.time);
                    const mean = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
                    const stdDev = times.length > 1 
                      ? Math.sqrt(times.reduce((acc, time) => acc + Math.
