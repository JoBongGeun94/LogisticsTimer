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
  }, [isRunning, currentSession, currentOperator, currentTarget]);

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
  }, [isRunning, currentTime, currentSession]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0); // 중지 시 시간 초기화
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
  }, [currentSession]);

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
  }, [currentTime, currentSession, currentOperator, currentTarget, lapTimes]);

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
  }, [lapTimes, allLapTimes, currentSession]);

  // 세션 관리 함수들
  const createSession = () => {
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
  };

  // 측정자/대상자 추가/삭제 함수
  const addOperator = () => setOperators([...operators, '']);
  const removeOperator = (index: number) => {
    if (operators.length > 1) {
      setOperators(operators.filter((_, i) => i !== index));
    }
  };

  const addTarget = () => setTargets([...targets, '']);
  const removeTarget = (index: number) => {
    if (targets.length > 1) {
      setTargets(targets.filter((_, i) => i !== index));
    }
  };

  // 세션 히스토리 초기화
  const clearSessionHistory = () => {
    setSessions([]);
    setCurrentSession(null);
    setLapTimes([]);
    setAllLapTimes([]);
    setCurrentTime(0);
    setIsRunning(false);
    showToast('모든 세션 히스토리가 삭제되었습니다.', 'success');
  };

  // 측정 기록만 다운로드
  const downloadMeasurementData = () => {
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
  };

  // 상세 분석 다운로드
  const downloadDetailedAnalysis = () => {
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
      }, 0) / lapTimes.length)
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
      [''],
      ['【 기본 통계 】'],
      ['평균 시간 (ms)', basicStats.mean.toFixed(2)],
      ['표준편차 (ms)', basicStats.stdDev.toFixed(3)],
      [''],
      ['【 Gage R&R 분석 결과 】'],
      ['반복성 (Repeatability)', analysis.repeatability.toFixed(3)],
      ['재현성 (Reproducibility)', analysis.reproducibility.toFixed(3)],
      ['Gage R&R', analysis.gageRR.toFixed(3)],
      ['Gage R&R %', `${analysis.gageRRPercent.toFixed(1)}%`],
      ['NDC', analysis.ndc.toString()],
      ['Cpk', analysis.cpk.toFixed(3)],
      ['측정시스템 판정', analysis.status === 'excellent' ? '우수' :
        analysis.status === 'acceptable' ? '양호' :
        analysis.status === 'marginal' ? '보통' : '불량'],
      [''],
      ['【 개선 권장사항 】'],
      [analysis.gageRRPercent < 10 
        ? '측정 시스템이 우수합니다. 현재 설정을 유지하세요.'
        : analysis.gageRRPercent < 30
        ? '측정 시스템이 양호합니다. 지속적인 모니터링이 필요합니다.'
        : '측정 시스템 개선이 필요합니다. 교정, 교육, 절차 개선을 검토하세요.']
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
  };

  // 필터링된 측정 기록
  const filteredLapTimes = lapTimes.filter(lap => {
    return (!filterOperator || lap.operator === filterOperator) &&
           (!filterTarget || lap.target === filterTarget);
  });

  const analysis = currentSession && lapTimes.length >= 6 ? calculateGageRR(lapTimes) : null;

  // 랜딩 페이지
  if (showLanding) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-slate-800 via-blue-900 to-blue-950' : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'}`}>
        <ConsolidatedSupplyLogo isDark={isDark} />
        <div className="p-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">물류 작업현장 인시수 측정 타이머</h1>
          <p className="text-blue-100 mb-8 text-lg">Gage R&R 분석 v5.0 Enhanced</p>
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-500" />
                <h2 className={`font-semibold ${theme.text}`}>측정 기록</h2>
                <span className={`text-sm ${theme.textMuted}`}>
                  {filteredLapTimes.length}개
                </span>
              </div>
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="text-blue-500 text-sm hover:text-blue-700 transition-colors"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* 필터 섹션 */}
            {showAnalysis && (
              <div className="mb-4 p-3 rounded-lg border ${theme.border} bg-gray-50 dark:bg-gray-700/50">
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
                  <div key={lap.id} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded-lg border-l-4 border-blue-500 transition-all hover:shadow-md`}>
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
                        : `${theme.border} ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`
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
                  className={`flex-1 border py-3 rounded-lg font-medium transition-colors ${
                    isDark 
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
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
                  <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded-lg`}>
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
                    className={`flex-1 border py-2 rounded-lg font-medium transition-colors ${
                      isDark 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
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

export default EnhancedLogisticsTimer; space-x-2">
              <Zap className="w-6 h-6 text-blue-500" />
              <h1 className={`text-lg font-bold ${theme.text}`}>물류 작업현장 인시수 측정 타이머</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary}`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary}`}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowLanding(true)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:text-red-500`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className={`text-xs ${theme.textMuted} mt-1`}>Gage R&R 분석 v5.0 Enhanced</div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 키보드 단축키 안내 */}
        <div className={`${theme.card} p-3 rounded-lg border ${theme.border}`}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className={`${theme.input} px-3 py-2 rounded border text-center font-medium`}>스페이스: 시작/정지</span>
            <span className={`${theme.input} px-3 py-2 rounded border text-center font-medium`}>Enter: 랩타임</span>
            <span className={`${theme.input} px-3 py-2 rounded border text-center font-medium`}>Esc: 중지</span>
            <span className={`${theme.input} px-3 py-2 rounded border text-center font-medium`}>R: 초기화</span>
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
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="text-blue-500 text-sm hover:text-blue-700 transition-colors"
              >
                {showAnalysis ? '간단히' : '상세히'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
              <MeasurementCard
                title="측정 횟수"
                value={lapTimes.length}
                icon={Timer}
                status="info"
                theme={theme}
                size="sm"
              />
              
              <MeasurementCard
                title="평균 시간"
                value={formatTime(lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)}
                icon={Clock}
                status="success"
                theme={theme}
                size="sm"
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
                />
                
                <MeasurementCard
                  title="Cpk"
                  value={analysis.cpk.toFixed(2)}
                  icon={Target}
                  status={analysis.cpk >= 1.33 ? 'success' : analysis.cpk >= 1.0 ? 'warning' : 'error'}
                  theme={theme}
                  size="sm"
                />

                <MeasurementCard
                  title="NDC"
                  value={analysis.ndc}
                  icon={Calculator}
                  status={analysis.ndc >= 5 ? 'success' : analysis.ndc >= 3 ? 'warning' : 'error'}
                  theme={theme}
                  size="sm"
                />
              </div>
            )}

            {showAnalysis && analysis && lapTimes.length >= 6 && (
              <div className="space-y-3">
                <div className={`${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} p-3 rounded-lg border ${theme.border}`}>
                  <h3 className={`font-medium text-sm mb-2 ${theme.text}`}>Gage R&R 상세 분석</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>반복성: {analysis.repeatability.toFixed(3)}</div>
                    <div>재현성: {analysis.reproducibility.toFixed(3)}</div>
                  </div>
                  <div className="mt-2">
                    <StatusBadge status={analysis.status} size="sm" />
                  </div>
                </div>
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
                downloadDetailedAnalysis();
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
              <div className="flex items-centerimport React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Square, RotateCcw, Download, Plus, Users,
  Package, Clock, BarChart3, FileText, Calculator,
  Zap, Target, Home, HelpCircle, RefreshCw, LogOut,
  Moon, Sun, TrendingUp, PieChart, Info, CheckCircle,
  AlertCircle, XCircle, Timer, Activity, Settings,
  Trash2, Filter, Search, X, Minus
} from 'lucide-react';

// 토스트 메시지 컴포넌트
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  const typeIcons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  };

  const Icon = typeIcons[type];

  return (
    <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-right duration-300">
      <div className={`${typeStyles[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

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

// 테마 타입
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

// 유틸리티 함수들
const formatTime = (ms: number): string => {
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
  
  return `${prefix}-${sessionName}-(${timestamp})`;
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
  
  // 실제 분산 계산
  const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / (times.length - 1);
  const stdDev = Math.sqrt(variance);

  // 측정자별, 대상자별 그룹화
  const operatorGroups = lapTimes.reduce((groups, lap) => {
    if (!groups[lap.operator]) groups[lap.operator] = [];
    groups[lap.operator].push(lap.time);
    return groups;
  }, {} as Record<string, number[]>);

  const targetGroups = lapTimes.reduce((groups, lap) => {
    if (!groups[lap.target]) groups[lap.target] = [];
    groups[lap.target].push(lap.time);
    return groups;
  }, {} as Record<string, number[]>);

  // 실제 Gage R&R 계산
  const operatorCount = Object.keys(operatorGroups).length;
  const targetCount = Object.keys(targetGroups).length;
  const trialsPerCondition = Math.floor(times.length / (operatorCount * targetCount));

  // 반복성 계산 (장비 변동)
  let repeatabilityVariance = 0;
  Object.values(operatorGroups).forEach(group => {
    if (group.length > 1) {
      const groupMean = group.reduce((a, b) => a + b, 0) / group.length;
      repeatabilityVariance += group.reduce((acc, val) => acc + Math.pow(val - groupMean, 2), 0);
    }
  });
  const repeatability = Math.sqrt(repeatabilityVariance / Math.max(1, times.length - operatorCount));

  // 재현성 계산 (측정자 변동)
  const operatorMeans = Object.values(operatorGroups).map(group => 
    group.reduce((a, b) => a + b, 0) / group.length
  );
  const operatorVariance = operatorMeans.reduce((acc, opMean) => 
    acc + Math.pow(opMean - mean, 2), 0) / Math.max(1, operatorCount - 1);
  const reproducibility = Math.sqrt(Math.max(0, operatorVariance - (repeatability * repeatability) / trialsPerCondition));

  // 부품 변동 계산
  const targetMeans = Object.values(targetGroups).map(group => 
    group.reduce((a, b) => a + b, 0) / group.length
  );
  const targetVariance = targetMeans.reduce((acc, targetMean) => 
    acc + Math.pow(targetMean - mean, 2), 0) / Math.max(1, targetCount - 1);
  const partVariation = Math.sqrt(Math.max(0, targetVariance - (repeatability * repeatability) / trialsPerCondition));

  const gageRR = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
  const totalVariation = Math.sqrt(gageRR ** 2 + partVariation ** 2);
  const gageRRPercent = totalVariation > 0 ? (gageRR / totalVariation) * 100 : 100;
  const ndc = partVariation > 0 ? Math.floor((partVariation / gageRR) * 1.41) : 0;

  // Cpk 계산 (공정능력지수)
  const cpk = partVariation > 0 ? (partVariation / (6 * stdDev)) : 0;

  // ANOVA 분석
  const anova = {
    operator: operatorVariance,
    part: targetVariance,
    interaction: variance * 0.1,
    error: repeatability ** 2
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

// 상태 배지 컴포넌트
const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' | 'lg' }> = ({ status, size = 'md' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'excellent':
        return { 
          icon: CheckCircle, 
          text: '우수', 
          color: 'bg-green-100 text-green-800 border-green-200',
          darkColor: 'dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
        };
      case 'acceptable':
        return { 
          icon: CheckCircle, 
          text: '양호', 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          darkColor: 'dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
        };
      case 'marginal':
        return { 
          icon: AlertCircle, 
          text: '보통', 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          darkColor: 'dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700'
        };
      default:
        return { 
          icon: XCircle, 
          text: '불량', 
          color: 'bg-red-100 text-red-800 border-red-200',
          darkColor: 'dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
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

  return (
    <span className={`
      inline-flex items-center gap-1.5 font-medium rounded-full border
      ${sizeClasses[size]}
      ${config.color} 
      ${config.darkColor}
    `}>
      <Icon className={iconSizes[size]} />
      {config.text}
    </span>
  );
};

// 개선된 로고 컴포넌트
const ConsolidatedSupplyLogo: React.FC<{ isDark?: boolean }> = ({ isDark = false }) => (
  <div className={`
    relative flex items-center justify-center p-12 overflow-hidden
    ${isDark 
      ? 'bg-gradient-to-br from-slate-800 via-blue-900 to-blue-950' 
      : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'
    }
  `}>
    {/* 개선된 배경 패턴 */}
    <div className="absolute inset-0 opacity-5">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 2px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />
    </div>
    
    {/* 추가 광택 효과 */}
    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/10 to-transparent" />
    
    <div className="text-center relative z-10">
      {/* 로고 섹션 */}
      <div className="flex items-center justify-center mb-8">
        <div className="relative">
          {/* 중앙 로고 구조 - 크기 확대 */}
          <div className="relative w-32 h-32">
            {/* 빨간색 육각형 (상단) - 크기 및 위치 조정 */}
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

            {/* 중앙 연결 기어 - 크기 확대 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-full shadow-xl flex items-center justify-center border-3 border-yellow-400 hover:rotate-180 transition-transform duration-500">
                <div className="w-6 h-6 bg-white rounded-full shadow-inner"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 텍스트 섹션 개선 */}
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
);

// 개선된 도움말 컴포넌트
const HelpModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  theme: Theme;
}> = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;

  const helpSections = [
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
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`
        ${theme.card} rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden
        shadow-2xl border ${theme.border}
      `}>
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
                        className={`
                          p-4 rounded-lg border ${theme.border}
                          ${theme.card === 'bg-white' ? 'bg-gray-50' : 'bg-gray-700/50'}
                          hover:shadow-md transition-shadow
                        `}
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
                            <div className={`
                              px-2 py-1 rounded text-xs font-mono font-medium
                              ${theme.card === 'bg-white' 
                                ? 'bg-gray-200 text-gray-700' 
                                : 'bg-gray-600 text-gray-300'
                              }
                            `}>
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
              className={`
                ${theme.accent} text-white px-6 py-2 rounded-lg 
                hover:opacity-90 transition-opacity font-medium
                flex items-center gap-2
              `}
            >
              <CheckCircle className="w-4 h-4" />
              확인했습니다
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 측정 카드 컴포넌트
const MeasurementCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  icon: React.FC<any>;
  status?: 'success' | 'warning' | 'error' | 'info';
  theme: Theme;
  size?: 'sm' | 'md' | 'lg';
}> = ({ title, value, unit, icon: Icon, status = 'info', theme, size = 'md' }) => {
  const statusColors = {
    success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
  };

  const iconColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  const sizes = {
    sm: { card: 'p-3', icon: 'w-4 h-4', title: 'text-xs', value: 'text-sm' },
    md: { card: 'p-4', icon: 'w-5 h-5', title: 'text-sm', value: 'text-lg' },
    lg: { card: 'p-6', icon: 'w-6 h-6', title: 'text-base', value: 'text-2xl' }
  };

  return (
    <div className={`
      ${sizes[size].card} rounded-xl border transition-all duration-200
      ${statusColors[status]}
      hover:shadow-lg hover:scale-105
    `}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`${sizes[size].icon} ${iconColors[status]}`} />
      </div>
      <div className={`${sizes[size].title} font-medium ${theme.textMuted} mb-1`}>
        {title}
      </div>
      <div className={`${sizes[size].value} font-bold ${theme.text} font-mono`}>
        {value}{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
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
  const [allLapTimes, setAllLapTimes] = useState<LapTime[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
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

  const theme = isDark ? darkTheme : lightTheme;

  // 토스트 메시지 표시 함수
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, type, isVisible: true });
  };
