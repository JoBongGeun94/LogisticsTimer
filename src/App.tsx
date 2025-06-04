import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  User, 
  Target, 
  Clock, 
  BarChart3, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Search,
  Calendar,
  CheckCircle,
  AlertCircle,
  Users,
  FileSpreadsheet,
  Settings,
  History,
  TrendingUp,
  Award,
  Activity,
  Zap,
  Sun,
  Moon,
  HelpCircle,
  LogOut
} from 'lucide-react';

// 확장된 타입 정의
interface TimerRecord {
  id: string;
  sessionId: string;
  measurer: string;
  target: string;
  part: string;
  workType: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  lapNumber: number;
  status: 'completed' | 'outlier' | 'normal';
}

interface WorkSession {
  id: string;
  name: string;
  workType: string;
  measurers: string[];
  parts: string[];
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
  totalTime: number;
  measurementCount: number;
}

interface GageRRAnalysis {
  totalGRR: number;
  repeatability: number;
  reproducibility: number;
  partContribution: number;
  qualityScore: number;
  cv: number;
  cpk: number;
  outliers: number;
}

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  pausedTime: number;
  currentTime: number;
  lapTimes: number[];
  currentSession: WorkSession | null;
  currentMeasurer: string;
  currentPart: string;
}

// 유틸리티 함수들
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

// Gage R&R 분석 함수
const calculateGageRR = (records: TimerRecord[]): GageRRAnalysis => {
  if (records.length < 3) {
    return {
      totalGRR: 0,
      repeatability: 0,
      reproducibility: 0,
      partContribution: 0,
      qualityScore: 0,
      cv: 0,
      cpk: 0,
      outliers: 0
    };
  }

  const durations = records.map(r => r.duration);
  const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance = durations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;

  // 간소화된 GRR 계산 (실제로는 더 복잡한 통계 분석 필요)
  const measurerGroups = records.reduce((acc, record) => {
    if (!acc[record.measurer]) acc[record.measurer] = [];
    acc[record.measurer].push(record.duration);
    return acc;
  }, {} as Record<string, number[]>);

  const partGroups = records.reduce((acc, record) => {
    if (!acc[record.part]) acc[record.part] = [];
    acc[record.part].push(record.duration);
    return acc;
  }, {} as Record<string, number[]>);

  const repeatability = cv < 10 ? cv * 0.8 : cv * 1.2;
  const reproducibility = Object.keys(measurerGroups).length > 1 ? cv * 0.6 : 0;
  const partContribution = Object.keys(partGroups).length > 1 ? 100 - repeatability - reproducibility : 70;
  const totalGRR = repeatability + reproducibility;

  // 품질 점수 계산
  const qualityScore = Math.max(0, 100 - totalGRR * 2);
  
  // 이상치 탐지 (IQR 방법)
  const sortedDurations = [...durations].sort((a, b) => a - b);
  const q1 = sortedDurations[Math.floor(sortedDurations.length * 0.25)];
  const q3 = sortedDurations[Math.floor(sortedDurations.length * 0.75)];
  const iqr = q3 - q1;
  const outliers = durations.filter(d => d < q1 - 1.5 * iqr || d > q3 + 1.5 * iqr).length;

  return {
    totalGRR: Math.min(100, totalGRR),
    repeatability,
    reproducibility,
    partContribution: Math.max(0, partContribution),
    qualityScore,
    cv,
    cpk: Math.max(0, (6 * stdDev) / (mean * 0.1)), // 간소화된 Cpk
    outliers
  };
};

const STORAGE_KEYS = {
  sessions: 'logistics-timer-sessions',
  records: 'logistics-timer-records',
  settings: 'logistics-timer-settings'
};

export default function EnhancedLogisticsTimer() {
  // 상태 관리
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    startTime: null,
    pausedTime: 0,
    currentTime: 0,
    lapTimes: [],
    currentSession: null,
    currentMeasurer: '',
    currentPart: ''
  });

  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [records, setRecords] = useState<TimerRecord[]>([]);
  const [currentView, setCurrentView] = useState<'timer' | 'analysis' | 'history' | 'settings'>('timer');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'warning'; message: string} | null>(null);
  
  // 새 세션 생성 상태
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({
    name: '',
    workType: '',
    measurers: [''],
    parts: ['']
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // 입력 필드에 포커스가 있을 때는 키보드 단축키 비활성화
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (timerState.isRunning) {
            togglePause();
          } else {
            startTimer();
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (timerState.isRunning) {
            recordLapTime();
          }
          break;
        case 'Escape':
          event.preventDefault();
          stopTimer();
          break;
        case 'KeyR':
          event.preventDefault();
          resetTimer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [timerState.isRunning]);

  // 타이머 업데이트
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      intervalRef.current = setInterval(() => {
        if (timerState.startTime) {
          const now = Date.now();
          const elapsed = (now - timerState.startTime.getTime()) / 1000 - timerState.pausedTime;
          setTimerState(prev => ({ ...prev, currentTime: elapsed }));
        }
      }, 10);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning, timerState.isPaused, timerState.startTime, timerState.pausedTime]);

  // 로컬 스토리지 로드/저장
  useEffect(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEYS.sessions);
    const savedRecords = localStorage.getItem(STORAGE_KEYS.records);
    
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt)
        })));
      } catch (error) {
        console.error('Failed to load sessions:', error);
      }
    }

    if (savedRecords) {
      try {
        setRecords(JSON.parse(savedRecords).map((record: any) => ({
          ...record,
          startTime: new Date(record.startTime),
          endTime: new Date(record.endTime)
        })));
      } catch (error) {
        console.error('Failed to load records:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
  }, [records]);

  // 알림 표시
  const showNotification = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // 새 세션 생성
  const createNewSession = () => {
    if (!newSessionForm.name || !newSessionForm.workType) {
      showNotification('error', '세션명과 작업 유형을 입력해주세요.');
      return;
    }

    const newSession: WorkSession = {
      id: Date.now().toString(),
      name: newSessionForm.name,
      workType: newSessionForm.workType,
      measurers: newSessionForm.measurers.filter(m => m.trim()),
      parts: newSessionForm.parts.filter(p => p.trim()),
      status: 'active',
      createdAt: new Date(),
      totalTime: 0,
      measurementCount: 0
    };

    setSessions(prev => [newSession, ...prev]);
    setTimerState(prev => ({ 
      ...prev, 
      currentSession: newSession,
      currentMeasurer: newSession.measurers[0] || '',
      currentPart: newSession.parts[0] || ''
    }));
    setShowNewSession(false);
    setNewSessionForm({ name: '', workType: '', measurers: [''], parts: [''] });
    showNotification('success', '새 세션이 생성되었습니다.');
  };

  // 타이머 제어 함수들
  const startTimer = () => {
    if (!timerState.currentSession) {
      showNotification('error', '활성 세션을 선택해주세요.');
      return;
    }

    if (!timerState.currentMeasurer || !timerState.currentPart) {
      showNotification('error', '측정자와 부품을 선택해주세요.');
      return;
    }

    const now = new Date();
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      startTime: now,
      currentTime: 0,
      pausedTime: 0,
    }));
    
    showNotification('success', '측정을 시작합니다.');
  };

  const togglePause = () => {
    if (timerState.isPaused) {
      setTimerState(prev => ({ ...prev, isPaused: false }));
      showNotification('success', '측정을 재시작합니다.');
    } else {
      setTimerState(prev => ({ ...prev, isPaused: true }));
      showNotification('success', '측정을 일시정지합니다.');
    }
  };

  const recordLapTime = () => {
    if (!timerState.isRunning || !timerState.currentSession) return;

    const lapTime = timerState.currentTime;
    const endTime = new Date();

    const newRecord: TimerRecord = {
      id: Date.now().toString(),
      sessionId: timerState.currentSession.id,
      measurer: timerState.currentMeasurer,
      target: timerState.currentPart,
      part: timerState.currentPart,
      workType: timerState.currentSession.workType,
      startTime: timerState.startTime!,
      endTime,
      duration: lapTime,
      lapNumber: timerState.lapTimes.length + 1,
      status: 'normal'
    };

    setRecords(prev => [newRecord, ...prev]);
    setTimerState(prev => ({ 
      ...prev, 
      lapTimes: [...prev.lapTimes, lapTime],
      currentTime: 0,
      startTime: new Date()
    }));

    // 세션 업데이트
    setSessions(prev => prev.map(session => 
      session.id === timerState.currentSession?.id 
        ? { ...session, measurementCount: session.measurementCount + 1 }
        : session
    ));

    showNotification('success', `랩타임 기록: ${formatTime(lapTime)}`);
  };

  const stopTimer = () => {
    if (!timerState.isRunning) return;

    if (timerState.currentTime > 0) {
      recordLapTime();
    }

    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      startTime: null,
      currentTime: 0,
      pausedTime: 0,
    }));

    showNotification('success', '측정을 완료했습니다.');
  };

  const resetTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      startTime: null,
      currentTime: 0,
      pausedTime: 0,
      lapTimes: []
    }));
    showNotification('success', '타이머를 초기화했습니다.');
  };

  // 분석 데이터 계산
  const currentSessionRecords = records.filter(r => r.sessionId === timerState.currentSession?.id);
  const gageRRAnalysis = calculateGageRR(currentSessionRecords);

  // Excel 내보내기 (상세 분석 포함)
  const exportToExcel = () => {
    const analysisData = {
      session: timerState.currentSession,
      records: currentSessionRecords,
      analysis: gageRRAnalysis,
      exportTime: new Date()
    };

    const dataStr = JSON.stringify(analysisData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GageRR_분석_${timerState.currentSession?.workType || 'Unknown'}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('success', '상세 분석 데이터가 내보내기되었습니다.');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900'
    }`}>
      {/* 헤더 */}
      <header className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm border-b border-gray-200/20 px-6 py-4`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold flex items-center">
              <Activity className="mr-2 text-blue-500" size={28} />
              정밀 작업 시간 측정 시스템
            </h1>
            <span className="text-sm opacity-70">Gage R&R 분석 v2.0</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentView('timer')}
              className={`p-2 rounded-lg transition-colors ${
                currentView === 'timer' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200/50'
              }`}
              title="타이머"
            >
              <Clock size={20} />
            </button>
            
            <button
              onClick={() => setCurrentView('analysis')}
              className={`p-2 rounded-lg transition-colors ${
                currentView === 'analysis' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200/50'
              }`}
              title="분석"
            >
              <TrendingUp size={20} />
            </button>

            <button
              onClick={() => setCurrentView('history')}
              className={`p-2 rounded-lg transition-colors ${
                currentView === 'history' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200/50'
              }`}
              title="히스토리"
            >
              <History size={20} />
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-gray-200/50 rounded-lg transition-colors"
              title="테마 변경"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              className="p-2 hover:bg-gray-200/50 rounded-lg transition-colors"
              title="도움말"
            >
              <HelpCircle size={20} />
            </button>

            <button
              className="p-2 hover:bg-gray-200/50 rounded-lg transition-colors"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* 알림 */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg animate-slide-up ${
          notification.type === 'success' ? 'bg-green-500 text-white' :
          notification.type === 'warning' ? 'bg-yellow-500 text-white' :
          'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 키보드 단축키 안내 */}
        <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-blue-50/50'} border border-blue-200/20`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center"><kbd className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">스페이스</kbd> 시작/정지</span>
              <span className="flex items-center"><kbd className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">Enter</kbd> 랩타임</span>
              <span className="flex items-center"><kbd className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">Esc</kbd> 중지</span>
              <span className="flex items-center"><kbd className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">R</kbd> 리셋</span>
            </div>
            {gageRRAnalysis.qualityScore > 0 && (
              <div className="flex items-center space-x-2">
                <Award className="text-yellow-500" size={16} />
                <span className="text-sm font-medium">품질 점수: {gageRRAnalysis.qualityScore.toFixed(1)}점</span>
              </div>
            )}
          </div>
        </div>

        {currentView === 'timer' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* 세션 관리 */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Users className="mr-2 text-blue-500" size={20} />
                  작업 세션
                </h3>
                <button
                  onClick={() => setShowNewSession(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                >
                  새 세션
                </button>
              </div>

              {timerState.currentSession ? (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-blue-50/50'}`}>
                    <div className="font-medium">{timerState.currentSession.name}</div>
                    <div className="text-sm opacity-70">{timerState.currentSession.workType}</div>
                    <div className="text-xs mt-1">
                      측정자: {timerState.currentSession.measurers.join(', ')} | 
                      부품: {timerState.currentSession.parts.join(', ')}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">측정자</label>
                      <select
                        value={timerState.currentMeasurer}
                        onChange={(e) => setTimerState(prev => ({ ...prev, currentMeasurer: e.target.value }))}
                        className={`w-full p-2 rounded-lg text-sm ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        } border focus:ring-2 focus:ring-blue-500`}
                      >
                        {timerState.currentSession.measurers.map(measurer => (
                          <option key={measurer} value={measurer}>{measurer}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">부품</label>
                      <select
                        value={timerState.currentPart}
                        onChange={(e) => setTimerState(prev => ({ ...prev, currentPart: e.target.value }))}
                        className={`w-full p-2 rounded-lg text-sm ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        } border focus:ring-2 focus:ring-blue-500`}
                      >
                        {timerState.currentSession.parts.map(part => (
                          <option key={part} value={part}>{part}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 opacity-50">
                  <Users size={48} className="mx-auto mb-2" />
                  <p>활성 세션이 없습니다.</p>
                  <p className="text-sm">새 세션을 생성해주세요.</p>
                </div>
              )}
            </div>

            {/* 타이머 */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <Zap className="mr-2 text-blue-500" size={20} />
                정밀 타이머
              </h3>

              <div className="text-center mb-6">
                <div className={`p-8 rounded-xl mb-4 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50/50'}`}>
                  <div className="text-6xl font-mono font-bold mb-2">
                    {formatTime(timerState.currentTime)}
                  </div>
                  <div className="text-sm opacity-70">
                    {timerState.isRunning 
                      ? (timerState.isPaused ? '일시정지됨' : '측정 중...') 
                      : '대기 중'
                    }
                  </div>
                  {timerState.lapTimes.length > 0 && (
                    <div className="text-sm mt-2">
                      랩: {timerState.lapTimes.length}회
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {!timerState.isRunning ? (
                  <button
                    onClick={startTimer}
                    className="col-span-2 bg-green-500 hover:bg-green-600 text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Play className="mr-2" size={20} />
                    시작 (스페이스)
                  </button>
                ) : (
                  <>
                    <button
                      onClick={togglePause}
                      className={`font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center ${
                        timerState.isPaused 
                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                          : "bg-yellow-500 hover:bg-yellow-600 text-white"
                      }`}
                    >
                      {timerState.isPaused ? (
                        <>
                          <Play className="mr-2" size={20} />
                          재시작
                        </>
                      ) : (
                        <>
                          <Pause className="mr-2" size={20} />
                          일시정지
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={recordLapTime}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <CheckCircle className="mr-2" size={20} />
                      랩타임
                    </button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={stopTimer}
                  className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Square className="mr-2" size={16} />
                  정지
                </button>
                
                <button
                  onClick={resetTimer}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  리셋
                </button>
              </div>
            </div>

            {/* 실시간 분석 */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <BarChart3 className="mr-2 text-blue-500" size={20} />
                  실시간 분석
                </h3>
                {currentSessionRecords.length >= 3 && (
                  <button
                    onClick={exportToExcel}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center"
                  >
                    <FileSpreadsheet className="mr-1" size={16} />
                    Excel
                  </button>
                )}
              </div>

              {currentSessionRecords.length >= 3 ? (
                <div className="space-y-4">
                  {/* Gage R&R 요약 */}
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-blue-50/50'}`}>
                    <div className="text-sm font-medium mb-2">Gage R&R 분석</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="opacity-70">총 GRR</div>
                        <div className={`font-bold ${
                          gageRRAnalysis.totalGRR < 10 ? 'text-green-500' :
                          gageRRAnalysis.totalGRR < 30 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {gageRRAnalysis.totalGRR.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="opacity-70">품질 점수</div>
                        <div className="font-bold text-blue-500">
                          {gageRRAnalysis.qualityScore.toFixed(0)}점
                        </div>
                      </div>
                      <div>
                        <div className="opacity-70">반복성</div>
                        <div className="font-bold">
                          {gageRRAnalysis.repeatability.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="opacity-70">재현성</div>
                        <div className="font-bold">
                          {gageRRAnalysis.reproducibility.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 품질 지표 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg text-center ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'}`}>
                      <div className="text-xs opacity-70">변동계수 (CV)</div>
                      <div className="font-bold">{gageRRAnalysis.cv.toFixed(1)}%</div>
                    </div>
                    <div className={`p-3 rounded-lg text-center ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50/50'}`}>
                      <div className="text-xs opacity-70">이상치</div>
                      <div className="font-bold">{gageRRAnalysis.outliers}개</div>
                    </div>
                  </div>

                  {/* 판정 결과 */}
                  <div className={`p-3 rounded-lg text-center ${
                    gageRRAnalysis.totalGRR < 10 ? 'bg-green-500/20 border border-green-500/30' :
                    gageRRAnalysis.totalGRR < 30 ? 'bg-yellow-500/20 border border-yellow-500/30' :
                    'bg-red-500/20 border border-red-500/30'
                  }`}>
                    <div className="text-sm font-medium">
                      {gageRRAnalysis.totalGRR < 10 ? '✅ 측정 시스템 우수' :
                       gageRRAnalysis.totalGRR < 30 ? '⚠️ 조건부 허용' :
                       '❌ 개선 필요'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 opacity-50">
                  <TrendingUp size={48} className="mx-auto mb-2" />
                  <p>분석을 위해 최소 3개의</p>
                  <p className="text-sm">측정 데이터가 필요합니다.</p>
                  <div className="mt-2 text-sm font-medium">
                    현재: {currentSessionRecords.length}개
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 측정 기록 테이블 */}
        {currentView === 'timer' && currentSessionRecords.length > 0 && (
          <div className={`mt-8 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Clock className="mr-2 text-blue-500" size={20} />
              측정 기록 ({currentSessionRecords.length}개)
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50/50'}`}>
                    <th className="text-left p-3">순번</th>
                    <th className="text-left p-3">측정자</th>
                    <th className="text-left p-3">부품</th>
                    <th className="text-left p-3">측정값</th>
                    <th className="text-left p-3">시간</th>
                    <th className="text-left p-3">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSessionRecords.map((record, index) => (
                    <tr key={record.id} className="border-t border-gray-200/20">
                      <td className="p-3">{currentSessionRecords.length - index}</td>
                      <td className="p-3">{record.measurer}</td>
                      <td className="p-3">{record.part}</td>
                      <td className="p-3 font-mono font-bold text-blue-500">
                        {formatTime(record.duration)}
                      </td>
                      <td className="p-3 text-xs opacity-70">
                        {formatDate(record.endTime)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          record.status === 'outlier' ? 'bg-red-500/20 text-red-500' :
                          'bg-green-500/20 text-green-500'
                        }`}>
                          {record.status === 'outlier' ? '이상치' : '정상'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 분석 뷰 */}
        {currentView === 'analysis' && (
          <div className="space-y-8">
            {/* 분석 헤더 */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <TrendingUp className="mr-3 text-blue-500" size={28} />
                Gage R&R 상세 분석
              </h2>
              
              {timerState.currentSession ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{timerState.currentSession.name}</div>
                    <div className="text-sm opacity-70">
                      {timerState.currentSession.workType} | 측정 데이터: {currentSessionRecords.length}개
                    </div>
                  </div>
                  <button
                    onClick={exportToExcel}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                  >
                    <FileSpreadsheet className="mr-2" size={16} />
                    상세 분석 내보내기
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 opacity-50">
                  <p>분석할 세션을 선택해주세요.</p>
                </div>
              )}
            </div>

            {currentSessionRecords.length >= 3 && (
              <>
                {/* GRR 분석 차트 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
                    <h3 className="text-lg font-semibold mb-4">변동 성분 분석</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>반복성 (Repeatability)</span>
                        <span className="font-bold">{gageRRAnalysis.repeatability.toFixed(1)}%</span>
                      </div>
                      <div className={`w-full bg-gray-200 rounded-full h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, gageRRAnalysis.repeatability)}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>재현성 (Reproducibility)</span>
                        <span className="font-bold">{gageRRAnalysis.reproducibility.toFixed(1)}%</span>
                      </div>
                      <div className={`w-full bg-gray-200 rounded-full h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, gageRRAnalysis.reproducibility)}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>부품 기여도 (Part Variation)</span>
                        <span className="font-bold">{gageRRAnalysis.partContribution.toFixed(1)}%</span>
                      </div>
                      <div className={`w-full bg-gray-200 rounded-full h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className="bg-green-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, gageRRAnalysis.partContribution)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
                    <h3 className="text-lg font-semibold mb-4">품질 지표</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-500">{gageRRAnalysis.totalGRR.toFixed(1)}%</div>
                        <div className="text-sm opacity-70">총 GRR</div>
                        <div className={`mt-1 px-2 py-1 rounded text-xs ${
                          gageRRAnalysis.totalGRR < 10 ? 'bg-green-500/20 text-green-500' :
                          gageRRAnalysis.totalGRR < 30 ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {gageRRAnalysis.totalGRR < 10 ? '우수' :
                           gageRRAnalysis.totalGRR < 30 ? '허용' : '부적절'}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-500">{gageRRAnalysis.qualityScore.toFixed(0)}</div>
                        <div className="text-sm opacity-70">품질 점수</div>
                        <div className={`mt-1 px-2 py-1 rounded text-xs ${
                          gageRRAnalysis.qualityScore >= 90 ? 'bg-green-500/20 text-green-500' :
                          gageRRAnalysis.qualityScore >= 70 ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {gageRRAnalysis.qualityScore >= 90 ? '매우 우수' :
                           gageRRAnalysis.qualityScore >= 70 ? '우수' : '개선 필요'}
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-500">{gageRRAnalysis.cv.toFixed(1)}%</div>
                        <div className="text-sm opacity-70">변동계수 (CV)</div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-500">{gageRRAnalysis.outliers}</div>
                        <div className="text-sm opacity-70">이상치 개수</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 측정값 분포 차트 */}
                <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
                  <h3 className="text-lg font-semibold mb-4">측정값 분포 및 추이</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 시간순 측정값 */}
                    <div>
                      <h4 className="font-medium mb-3">시간순 측정값</h4>
                      <div className="h-48 relative">
                        <svg className="w-full h-full">
                          {currentSessionRecords.slice(0, 10).map((record, index) => {
                            const x = (index / Math.max(1, currentSessionRecords.slice(0, 10).length - 1)) * 100;
                            const maxDuration = Math.max(...currentSessionRecords.map(r => r.duration));
                            const y = 100 - (record.duration / maxDuration * 80);
                            
                            return (
                              <g key={record.id}>
                                <circle
                                  cx={`${x}%`}
                                  cy={`${y}%`}
                                  r="4"
                                  fill={record.status === 'outlier' ? '#ef4444' : '#3b82f6'}
                                  className="hover:r-6 transition-all"
                                />
                                {index > 0 && (
                                  <line
                                    x1={`${((index - 1) / Math.max(1, currentSessionRecords.slice(0, 10).length - 1)) * 100}%`}
                                    y1={`${100 - (currentSessionRecords[index - 1].duration / maxDuration * 80)}%`}
                                    x2={`${x}%`}
                                    y2={`${y}%`}
                                    stroke="#3b82f6"
                                    strokeWidth="2"
                                    opacity="0.6"
                                  />
                                )}
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>

                    {/* 측정자별 분포 */}
                    <div>
                      <h4 className="font-medium mb-3">측정자별 평균</h4>
                      <div className="space-y-3">
                        {Object.entries(
                          currentSessionRecords.reduce((acc, record) => {
                            if (!acc[record.measurer]) acc[record.measurer] = [];
                            acc[record.measurer].push(record.duration);
                            return acc;
                          }, {} as Record<string, number[]>)
                        ).map(([measurer, durations]) => {
                          const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
                          const maxAvg = Math.max(...Object.values(
                            currentSessionRecords.reduce((acc, record) => {
                              if (!acc[record.measurer]) acc[record.measurer] = [];
                              acc[record.measurer].push(record.duration);
                              return acc;
                            }, {} as Record<string, number[]>)
                          ).map(vals => vals.reduce((a, b) => a + b, 0) / vals.length));
                          
                          return (
                            <div key={measurer} className="flex items-center justify-between">
                              <span className="text-sm">{measurer}</span>
                              <div className="flex items-center space-x-2">
                                <div className={`w-24 bg-gray-200 rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${(avg / maxAvg) * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-mono">{formatTime(avg)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 개선 권장사항 */}
                <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Award className="mr-2 text-yellow-500" size={20} />
                    개선 권장사항
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gageRRAnalysis.totalGRR > 30 && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="font-medium text-red-500 mb-2">🚨 측정 시스템 개선 필요</div>
                        <ul className="text-sm space-y-1 opacity-80">
                          <li>• 측정 장비 점검 및 교정</li>
                          <li>• 작업 표준서 재검토</li>
                          <li>• 측정자 재교육 실시</li>
                        </ul>
                      </div>
                    )}
                    
                    {gageRRAnalysis.cv > 15 && (
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="font-medium text-yellow-500 mb-2">⚠️ 변동성 개선</div>
                        <ul className="text-sm space-y-1 opacity-80">
                          <li>• 작업 환경 표준화</li>
                          <li>• 측정 순서 체계화</li>
                          <li>• 추가 샘플 수집</li>
                        </ul>
                      </div>
                    )}
                    
                    {gageRRAnalysis.outliers > 0 && (
                      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <div className="font-medium text-orange-500 mb-2">🔍 이상치 분석</div>
                        <ul className="text-sm space-y-1 opacity-80">
                          <li>• 이상치 원인 조사</li>
                          <li>• 측정 조건 재확인</li>
                          <li>• 데이터 재수집 검토</li>
                        </ul>
                      </div>
                    )}
                    
                    {gageRRAnalysis.totalGRR < 10 && gageRRAnalysis.qualityScore > 90 && (
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="font-medium text-green-500 mb-2">✅ 우수한 측정 시스템</div>
                        <ul className="text-sm space-y-1 opacity-80">
                          <li>• 현재 수준 유지</li>
                          <li>• 정기적 모니터링</li>
                          <li>• 모범 사례 공유</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 히스토리 뷰 */}
        {currentView === 'history' && (
          <div className="space-y-8">
            {/* 히스토리 헤더 */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <History className="mr-3 text-blue-500" size={28} />
                세션 히스토리
              </h2>
              
              {/* 히스토리 대시보드 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{sessions.length}</div>
                  <div className="text-sm opacity-70">총 세션 수</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {sessions.filter(s => s.status === 'completed').length}
                  </div>
                  <div className="text-sm opacity-70">완료된 세션</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">{records.length}</div>
                  <div className="text-sm opacity-70">총 측정 기록</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {sessions.filter(s => s.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                  </div>
                  <div className="text-sm opacity-70">30일 세션</div>
                </div>
              </div>
            </div>

            {/* 세션 목록 */}
            <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-xl p-6 border border-gray-200/20`}>
              <h3 className="text-lg font-semibold mb-4">세션 목록</h3>
              
              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 opacity-50">
                    <History size={48} className="mx-auto mb-2" />
                    <p>저장된 세션이 없습니다.</p>
                  </div>
                ) : (
                  sessions.map(session => {
                    const sessionRecords = records.filter(r => r.sessionId === session.id);
                    const sessionGRR = calculateGageRR(sessionRecords);
                    
                    return (
                      <div key={session.id} className={`p-4 rounded-lg border ${
                        session.status === 'active' ? 
                          'border-blue-500/30 bg-blue-500/10' :
                        session.status === 'completed' ?
                          'border-green-500/30 bg-green-500/10' :
                          'border-gray-500/30 bg-gray-500/10'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="font-medium">{session.name}</div>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                session.status === 'active' ? 'bg-blue-500/20 text-blue-500' :
                                session.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                'bg-gray-500/20 text-gray-500'
                              }`}>
                                {session.status === 'active' ? '진행중' :
                                 session.status === 'completed' ? '완료' : '일시정지'}
                              </span>
                            </div>
                            <div className="text-sm opacity-70 mt-1">
                              {session.workType} | 측정자: {session.measurers.join(', ')} | 
                              기록: {sessionRecords.length}개 | 
                              생성: {formatDate(session.createdAt)}
                            </div>
                            {sessionRecords.length >= 3 && (
                              <div className="text-sm mt-2">
                                GRR: <span className={`font-medium ${
                                  sessionGRR.totalGRR < 10 ? 'text-green-500' :
                                  sessionGRR.totalGRR < 30 ? 'text-yellow-500' : 'text-red-500'
                                }`}>{sessionGRR.totalGRR.toFixed(1)}%</span> | 
                                품질점수: <span className="font-medium text-blue-500">{sessionGRR.qualityScore.toFixed(0)}점</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setTimerState(prev => ({ 
                                  ...prev, 
                                  currentSession: session,
                                  currentMeasurer: session.measurers[0] || '',
                                  currentPart: session.parts[0] || ''
                                }));
                                setCurrentView('timer');
                                showNotification('success', '세션이 활성화되었습니다.');
                              }}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                            >
                              활성화
                            </button>
                            
                            {sessionRecords.length >= 3 && (
                              <button
                                onClick={() => {
                                  setTimerState(prev => ({ 
                                    ...prev, 
                                    currentSession: session,
                                    currentMeasurer: session.measurers[0] || '',
                                    currentPart: session.parts[0] || ''
                                  }));
                                  setCurrentView('analysis');
                                }}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                              >
                                분석
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* 새 세션 생성 모달 */}
        {showNewSession && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">새 작업 세션 생성</h3>
                <button
                  onClick={() => setShowNewSession(false)}
                  className="p-2 hover:bg-gray-200/50 rounded-lg transition-colors"
                >
                  <Square size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">세션명 *</label>
                    <input
                      type="text"
                      value={newSessionForm.name}
                      onChange={(e) => setNewSessionForm(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full p-3 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      } focus:ring-2 focus:ring-blue-500`}
                      placeholder="예: 포장작업_0602"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">작업 유형 *</label>
                    <select
                      value={newSessionForm.workType}
                      onChange={(e) => setNewSessionForm(prev => ({ ...prev, workType: e.target.value }))}
                      className={`w-full p-3 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      } focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="">작업 유형 선택</option>
                      <option value="포장 작업">포장 작업</option>
                      <option value="조립 작업">조립 작업</option>
                      <option value="검사 작업">검사 작업</option>
                      <option value="피킹 작업">피킹 작업</option>
                      <option value="운반 작업">운반 작업</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                </div>

                {/* 측정자 설정 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium">측정자 설정</label>
                    <button
                      onClick={() => setNewSessionForm(prev => ({ 
                        ...prev, 
                        measurers: [...prev.measurers, ''] 
                      }))}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      측정자 추가
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {newSessionForm.measurers.map((measurer, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={measurer}
                          onChange={(e) => {
                            const newMeasurers = [...newSessionForm.measurers];
                            newMeasurers[index] = e.target.value;
                            setNewSessionForm(prev => ({ ...prev, measurers: newMeasurers }));
                          }}
                          className={`flex-1 p-2 rounded-lg border ${
                            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          } focus:ring-2 focus:ring-blue-500`}
                          placeholder={`측정자 ${index + 1} (예: 조봉근)`}
                        />
                        {newSessionForm.measurers.length > 1 && (
                          <button
                            onClick={() => {
                              const newMeasurers = newSessionForm.measurers.filter((_, i) => i !== index);
                              setNewSessionForm(prev => ({ ...prev, measurers: newMeasurers }));
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    Gage R&R 분석을 위해 최소 2명 이상의 측정자를 권장합니다.
                  </div>
                </div>

                {/* 부품 설정 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium">부품/대상 설정</label>
                    <button
                      onClick={() => setNewSessionForm(prev => ({ 
                        ...prev, 
                        parts: [...prev.parts, ''] 
                      }))}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      부품 추가
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {newSessionForm.parts.map((part, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={part}
                          onChange={(e) => {
                            const newParts = [...newSessionForm.parts];
                            newParts[index] = e.target.value;
                            setNewSessionForm(prev => ({ ...prev, parts: newParts }));
                          }}
                          className={`flex-1 p-2 rounded-lg border ${
                            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          } focus:ring-2 focus:ring-blue-500`}
                          placeholder={`부품/대상 ${index + 1} (예: 이나연)`}
                        />
                        {newSessionForm.parts.length > 1 && (
                          <button
                            onClick={() => {
                              const newParts = newSessionForm.parts.filter((_, i) => i !== index);
                              setNewSessionForm(prev => ({ ...prev, parts: newParts }));
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    변동성 분석을 위해 여러 부품/대상을 설정할 수 있습니다.
                  </div>
                </div>

                {/* Gage R&R 안내 */}
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'} border border-blue-200/30`}>
                  <div className="flex items-start space-x-3">
                    <Award className="text-blue-500 mt-1" size={20} />
                    <div>
                      <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">Gage R&R 분석 안내</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                        <p>• 측정자 2명 이상: 재현성(Reproducibility) 분석</p>
                        <p>• 부품 2개 이상: 부품간 변동성 분석</p>
                        <p>• 최소 3회 측정: 반복성(Repeatability) 분석</p>
                        <p>• 권장 측정 횟수: 각 조건별 3-5회</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={() => setShowNewSession(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={createNewSession}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center"
                >
                  <Users className="mr-2" size={16} />
                  세션 생성
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
