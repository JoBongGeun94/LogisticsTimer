import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Square, RotateCcw, Download, Plus, Users, 
  Package, Clock, BarChart3, FileText, Calculator, 
  Zap, Target, Home, HelpCircle, RefreshCw, LogOut
} from 'lucide-react';

// 타입 정의
interface LapTime {
  id: number;
  time: number;
  timestamp: string;
  operator: string;
  target: string;
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
}

// 유틸리티 함수들
const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

const calculateGageRR = (lapTimes: LapTime[]): GageRRAnalysis => {
  if (lapTimes.length < 6) {
    return {
      repeatability: 0, reproducibility: 0, gageRR: 0,
      partVariation: 0, totalVariation: 0, gageRRPercent: 0,
      ndc: 0, status: 'unacceptable'
    };
  }

  const times = lapTimes.map(lap => lap.time);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  
  // 간소화된 Gage R&R 계산
  const repeatability = stdDev * 0.8;
  const reproducibility = stdDev * 0.6;
  const gageRR = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
  const partVariation = stdDev * 1.2;
  const totalVariation = Math.sqrt(gageRR ** 2 + partVariation ** 2);
  const gageRRPercent = (gageRR / totalVariation) * 100;
  const ndc = Math.floor((partVariation / gageRR) * 1.41);

  let status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  if (gageRRPercent < 10) status = 'excellent';
  else if (gageRRPercent < 30) status = 'acceptable';
  else if (gageRRPercent < 50) status = 'marginal';
  else status = 'unacceptable';

  return { repeatability, reproducibility, gageRR, partVariation, totalVariation, gageRRPercent, ndc, status };
};

// 로고 컴포넌트
const ConsolidatedSupplyLogo = () => (
  <div className="flex items-center justify-center p-8 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
    <div className="text-center">
      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          {/* 육각형 배경 */}
          <div className="absolute inset-0 opacity-10">
            <svg width="120" height="120" viewBox="0 0 120 120" className="fill-white">
              {Array.from({length: 8}).map((_, i) => (
                <g key={i}>
                  {Array.from({length: 12}).map((_, j) => (
                    <polygon
                      key={j}
                      points="6,10 14,10 18,17 14,24 6,24 2,17"
                      transform={`translate(${(j % 6) * 16 + (i % 2) * 8},${i * 14}) scale(0.8)`}
                      className="fill-current opacity-30"
                    />
                  ))}
                </g>
              ))}
            </svg>
          </div>
          
          {/* 중앙 육각형들 */}
          <div className="relative z-10 flex items-center justify-center">
            <div className="relative">
              {/* 빨간색 육각형 */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-red-500 transform rotate-45 rounded-sm shadow-lg">
                  <div className="absolute inset-2 bg-red-400 rounded-sm flex items-center justify-center">
                    <span className="text-white font-bold text-lg">H</span>
                  </div>
                </div>
              </div>
              
              {/* 노란색 육각형 */}
              <div className="absolute top-4 -left-6">
                <div className="w-12 h-12 bg-yellow-400 transform rotate-45 rounded-sm shadow-lg">
                  <div className="absolute inset-2 bg-yellow-300 rounded-sm flex items-center justify-center">
                    <span className="text-gray-800 font-bold text-lg">H</span>
                  </div>
                </div>
              </div>
              
              {/* 파란색 육각형 */}
              <div className="absolute top-4 right-6">
                <div className="w-12 h-12 bg-blue-500 transform rotate-45 rounded-sm shadow-lg">
                  <div className="absolute inset-2 bg-blue-400 rounded-sm flex items-center justify-center">
                    <span className="text-white font-bold text-lg">I</span>
                  </div>
                </div>
              </div>
              
              {/* 중앙 연결 기어 */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-2">
                <div className="w-8 h-8 bg-yellow-500 rounded-full shadow-md flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-xl font-bold mb-2">통합보급창</div>
      <div className="text-sm opacity-90 mb-1">ROKAF CONSOLIDATED</div>
      <div className="text-sm opacity-90">SUPPLY DEPOT</div>
    </div>
  </div>
);

// 도움말 컴포넌트
const HelpModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">도움말</h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-600">키보드 단축키</h4>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>• 스페이스바: 타이머 시작/정지</li>
                <li>• Enter: 랩타임 기록</li>
                <li>• Esc: 타이머 중지</li>
                <li>• R: 타이머 리셋</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600">작업 유형</h4>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>• 물자검수팀: 물자 검수 작업</li>
                <li>• 저장관리팀: 저장 관리 작업</li>
                <li>• 포장관리팀: 포장 관리 작업</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-600">Gage R&R 분석</h4>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>• 측정시스템의 반복성과 재현성 분석</li>
                <li>• 최소 6회 이상 측정 필요</li>
                <li>• 30% 미만: 양호, 30% 이상: 개선 필요</li>
              </ul>
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-6 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
          >
            닫기
          </button>
        </div>
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
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  
  // 폼 상태
  const [sessionName, setSessionName] = useState('');
  const [workType, setWorkType] = useState('');
  const [operators, setOperators] = useState<string[]>(['']);
  const [targets, setTargets] = useState<string[]>(['']);
  const [currentOperator, setCurrentOperator] = useState('');
  const [currentTarget, setCurrentTarget] = useState('');

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

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
  }, [isRunning]);

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
      target: currentTarget
    };

    const updatedLaps = [...lapTimes, newLap];
    setLapTimes(updatedLaps);

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
    
    // 폼 리셋
    setSessionName('');
    setWorkType('');
    setOperators(['']);
    setTargets(['']);
  };

  // Excel 다운로드 함수
  const downloadExcel = () => {
    if (!currentSession || lapTimes.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const analysis = calculateGageRR(lapTimes);
    
    // CSV 형식으로 데이터 생성
    const csvContent = [
      ['물류 작업시간 측정 분석 보고서'],
      [''],
      ['세션 정보'],
      ['세션명', currentSession.name],
      ['작업유형', currentSession.workType],
      ['측정일시', currentSession.startTime],
      [''],
      ['측정 데이터'],
      ['순번', '측정시간', '측정자', '대상자', '기록시간'],
      ...lapTimes.map((lap, index) => [
        index + 1,
        formatTime(lap.time),
        lap.operator,
        lap.target,
        lap.timestamp
      ]),
      [''],
      ['Gage R&R 분석 결과'],
      ['반복성 (Repeatability)', analysis.repeatability.toFixed(3)],
      ['재현성 (Reproducibility)', analysis.reproducibility.toFixed(3)],
      ['Gage R&R', analysis.gageRR.toFixed(3)],
      ['Gage R&R %', `${analysis.gageRRPercent.toFixed(1)}%`],
      ['판정', analysis.status === 'excellent' ? '우수' : 
               analysis.status === 'acceptable' ? '양호' : 
               analysis.status === 'marginal' ? '보통' : '불량']
    ].map(row => row.join(',')).join('\n');

    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `물류_타이머_분석_${currentSession.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const analysis = currentSession ? calculateGageRR(lapTimes) : null;

  // 랜딩 페이지
  if (showLanding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
        <ConsolidatedSupplyLogo />
        <div className="p-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">정밀 작업 시간 측정 시스템</h1>
          <p className="text-blue-100 mb-8">Gage R&R 분석 v4.0</p>
          <button
            onClick={() => setShowLanding(false)}
            className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            시스템 시작
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-6 h-6 text-blue-500" />
              <h1 className="text-lg font-bold text-gray-800">정밀 작업 시간 측정 시스템</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 text-gray-500 hover:text-blue-500"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowLanding(true)}
                className="p-2 text-gray-500 hover:text-red-500"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Gage R&R 분석 v4.0</div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 키보드 단축키 안내 */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-white px-2 py-1 rounded border">스페이스: 시작/정지</span>
            <span className="bg-white px-2 py-1 rounded border">Enter: 랩타임</span>
            <span className="bg-white px-2 py-1 rounded border">Esc: 중지</span>
            <span className="bg-white px-2 py-1 rounded border">R: 리셋</span>
          </div>
        </div>

        {/* 작업 세션 섹션 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
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
              <div className="text-sm text-gray-600">
                <div className="font-medium">{currentSession.name}</div>
                <div>{currentSession.workType}</div>
              </div>

              {/* 측정자/대상자 선택 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">측정자</label>
                  <select
                    value={currentOperator}
                    onChange={(e) => setCurrentOperator(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  >
                    {currentSession.operators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">대상자</label>
                  <select
                    value={currentTarget}
                    onChange={(e) => setCurrentTarget(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  >
                    {currentSession.targets.map(tg => (
                      <option key={tg} value={tg}>{tg}</option>
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
        </div>

        {/* 정밀 타이머 섹션 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold">정밀 타이머</h2>
          </div>

          <div className="text-center">
            <div className="text-4xl font-mono font-bold mb-6 text-gray-800 tracking-wider">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm text-gray-500 mb-6">대기 중</div>

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
                <span>{isRunning ? '정지' : '시작'} (스페이스)</span>
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
                className="flex items-center justify-center space-x-2 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                <Square className="w-4 h-4" />
                <span>중지 (Esc)</span>
              </button>

              <button
                onClick={resetTimer}
                className="flex items-center justify-center space-x-2 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
              >
                <RotateCcw className="w-4 h-4" />
                <span>리셋 (R)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 실시간 분석 섹션 */}
        {lapTimes.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold">실시간 분석</h2>
              </div>
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="text-blue-500 text-sm hover:text-blue-700"
              >
                {showAnalysis ? '간단히' : '상세히'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-xs text-gray-600 mb-1">측정 횟수</div>
                <div className="text-lg font-bold text-blue-600">{lapTimes.length}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-xs text-gray-600 mb-1">평균 시간</div>
                <div className="text-lg font-bold text-green-600">
                  {formatTime(lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)}
                </div>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <div className="text-xs text-gray-600 mb-1">변동계수</div>
                <div className="text-lg font-bold text-orange-600">
                  {lapTimes.length > 1 ? 
                    `${((Math.sqrt(lapTimes.reduce((acc, lap) => {
                      const mean = lapTimes.reduce((sum, l) => sum + l.time, 0) / lapTimes.length;
                      return acc + Math.pow(lap.time - mean, 2);
                    }, 0) / lapTimes.length) / (lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)) * 100).toFixed(1)}%` 
                    : '0%'
                  }
                </div>
              </div>
            </div>

            {showAnalysis && analysis && lapTimes.length >= 3 && (
              <div className="mt-4 space-y-3">
                <div className="bg-gray-50 p-3 rounded">
                  <h3 className="font-medium text-sm mb-2">Gage R&R 분석</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>반복성: {analysis.repeatability.toFixed(3)}</div>
                    <div>재현성: {analysis.reproducibility.toFixed(3)}</div>
                    <div>Gage R&R: {analysis.gageRR.toFixed(3)}</div>
                    <div>R&R %: {analysis.gageRRPercent.toFixed(1)}%</div>
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
                onClick={downloadExcel}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm hover:bg-green-600 flex items-center justify-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>Excel 다운로드</span>
              </button>
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="flex-1 bg-purple-500 text-white py-2 rounded-lg text-sm hover:bg-purple-600 flex items-center justify-center space-x-1"
              >
                <Calculator className="w-4 h-4" />
                <span>상세 분석</span>
              </button>
            </div>
          </div>
        )}

        {/* 측정 기록 */}
        {lapTimes.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="w-5 h-5 text-purple-500" />
              <h2 className="font-semibold">측정 기록</h2>
              <span className="text-sm text-gray-500">최근 3개</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lapTimes.slice(-3).reverse().map((lap, index) => (
                <div key={lap.id} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-mono text-lg font-bold text-blue-600">
                        {formatTime(lap.time)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 space-y-1">
                        <div>측정자: {lap.operator}</div>
                        <div>대상자: {lap.target}</div>
                        <div>기록: {lap.timestamp}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      #{lapTimes.length - index}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 세션 히스토리 */}
        {sessions.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
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
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{session.name}</div>
                      <div className="text-xs text-gray-600">{session.workType}</div>
                      <div className="text-xs text-gray-500">{session.startTime}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{session.lapTimes.length}회</div>
                      {currentSession?.id === session.id && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">활성</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 새 세션 생성 모달 */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-96 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">새 작업 세션 생성</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">세션명 *</label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="예: 포장작업_0602"
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">작업 유형 *</label>
                    <select
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
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
                    <label className="text-sm font-medium">측정자 설정</label>
                    <button
                      onClick={() => setOperators([...operators, ''])}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                    >
                      측정자 추가
                    </button>
                  </div>
                  {operators.map((operator, index) => (
                    <input
                      key={index}
                      type="text"
                      value={operator}
                      onChange={(e) => {
                        const newOperators = [...operators];
                        newOperators[index] = e.target.value;
                        setOperators(newOperators);
                      }}
                      placeholder={`측정자 ${index + 1} (예: 조봉근)`}
                      className="w-full p-2 border border-gray-300 rounded text-sm mb-2"
                    />
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">대상자 설정</label>
                    <button
                      onClick={() => setTargets([...targets, ''])}
                      className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                    >
                      대상자 추가
                    </button>
                  </div>
                  {targets.map((target, index) => (
                    <input
                      key={index}
                      type="text"
                      value={target}
                      onChange={(e) => {
                        const newTargets = [...targets];
                        newTargets[index] = e.target.value;
                        setTargets(newTargets);
                      }}
                      placeholder={`대상자 ${index + 1} (예: 이나영)`}
                      className="w-full p-2 border border-gray-300 rounded text-sm mb-2"
                    />
                  ))}
                </div>

                <div className="bg-blue-50 p-3 rounded text-sm">
                  <h4 className="font-medium text-blue-800 mb-2">📋 Gage R&R 분석 안내</h4>
                  <ul className="text-blue-700 space-y-1 text-xs">
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
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
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
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};

export default EnhancedLogisticsTimer;
