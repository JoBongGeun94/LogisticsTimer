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
  AlertCircle
} from 'lucide-react';

// 타입 정의
interface TimerRecord {
  id: string;
  worker: string;
  target: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'completed' | 'paused' | 'active';
}

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  pausedTime: number;
  currentTime: number;
  worker: string;
  target: string;
}

// 유틸리티 함수
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

const STORAGE_KEY = 'logistics-timer-records';
const SETTINGS_KEY = 'logistics-timer-settings';

export default function App() {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    isPaused: false,
    startTime: null,
    pausedTime: 0,
    currentTime: 0,
    worker: '',
    target: '',
  });

  const [records, setRecords] = useState<TimerRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [notification, setNotification] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const savedRecords = localStorage.getItem(STORAGE_KEY);
    if (savedRecords) {
      try {
        const parsed = JSON.parse(savedRecords);
        setRecords(parsed.map((record: any) => ({
          ...record,
          startTime: new Date(record.startTime),
          endTime: new Date(record.endTime),
        })));
      } catch (error) {
        console.error('Failed to load records:', error);
      }
    }

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setTimerState(prev => ({
          ...prev,
          worker: settings.lastWorker || '',
          target: settings.lastTarget || '',
        }));
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

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

  // 레코드 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  // 설정 저장
  useEffect(() => {
    const settings = {
      lastWorker: timerState.worker,
      lastTarget: timerState.target,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [timerState.worker, timerState.target]);

  // 알림 표시
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // 타이머 시작
  const startTimer = () => {
    if (!timerState.worker.trim() || !timerState.target.trim()) {
      showNotification('error', '작업자와 대상을 입력해주세요.');
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

  // 타이머 일시정지/재시작
  const togglePause = () => {
    if (timerState.isPaused) {
      setTimerState(prev => ({ ...prev, isPaused: false }));
      showNotification('success', '측정을 재시작합니다.');
    } else {
      setTimerState(prev => ({ ...prev, isPaused: true }));
      showNotification('success', '측정을 일시정지합니다.');
    }
  };

  // 타이머 정지 및 저장
  const stopTimer = () => {
    if (!timerState.startTime) return;

    const endTime = new Date();
    const duration = timerState.currentTime;

    const newRecord: TimerRecord = {
      id: Date.now().toString(),
      worker: timerState.worker,
      target: timerState.target,
      startTime: timerState.startTime,
      endTime,
      duration,
      status: 'completed',
    };

    setRecords(prev => [newRecord, ...prev]);
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      startTime: null,
      currentTime: 0,
      pausedTime: 0,
    }));

    showNotification('success', `측정 완료: ${formatTime(duration)}`);
  };

  // 레코드 삭제
  const deleteRecord = (id: string) => {
    setRecords(prev => prev.filter(record => record.id !== id));
    showNotification('success', '기록이 삭제되었습니다.');
  };

  // 모든 레코드 삭제
  const deleteAllRecords = () => {
    if (window.confirm('모든 기록을 삭제하시겠습니까?')) {
      setRecords([]);
      showNotification('success', '모든 기록이 삭제되었습니다.');
    }
  };

  // 레코드 편집
  const updateRecord = (id: string, updates: Partial<TimerRecord>) => {
    setRecords(prev => prev.map(record => 
      record.id === id ? { ...record, ...updates } : record
    ));
    setEditingRecord(null);
    showNotification('success', '기록이 수정되었습니다.');
  };

  // 데이터 내보내기
  const exportData = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logistics-timer-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('success', '데이터가 내보내기되었습니다.');
  };

  // 데이터 가져오기
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const validRecords = imported.map((record: any) => ({
          ...record,
          startTime: new Date(record.startTime),
          endTime: new Date(record.endTime),
        }));
        setRecords(prev => [...validRecords, ...prev]);
        showNotification('success', `${validRecords.length}개 기록을 가져왔습니다.`);
      } catch (error) {
        showNotification('error', '파일을 읽을 수 없습니다.');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 필터링된 레코드
  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchTerm || 
      record.worker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.target.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !dateFilter || 
      record.startTime.toISOString().split('T')[0] === dateFilter;
    
    return matchesSearch && matchesDate;
  });

  // 통계 계산
  const stats = {
    totalRecords: records.length,
    totalTime: records.reduce((sum, record) => sum + record.duration, 0),
    averageTime: records.length > 0 ? records.reduce((sum, record) => sum + record.duration, 0) / records.length : 0,
    todayRecords: records.filter(record => 
      record.startTime.toDateString() === new Date().toDateString()
    ).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 알림 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg animate-slide-up ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 헤더 */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🚀 물류 타이머
          </h1>
          <p className="text-gray-600">정밀한 작업 시간 측정과 생산성 분석</p>
        </div>

        {/* 통계 대시보드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 기록</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalRecords}</p>
              </div>
              <BarChart3 className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 작업시간</p>
                <p className="text-2xl font-bold text-green-600">{formatTime(stats.totalTime)}</p>
              </div>
              <Clock className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 시간</p>
                <p className="text-2xl font-bold text-purple-600">{formatTime(stats.averageTime)}</p>
              </div>
              <Target className="text-purple-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">오늘 기록</p>
                <p className="text-2xl font-bold text-orange-600">{stats.todayRecords}</p>
              </div>
              <Calendar className="text-orange-500" size={24} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 타이머 섹션 */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 animate-bounce-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Clock className="mr-2 text-blue-500" />
              작업 시간 측정
            </h2>

            {/* 입력 필드 */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline mr-1" size={16} />
                  작업자
                </label>
                <input
                  type="text"
                  value={timerState.worker}
                  onChange={(e) => setTimerState(prev => ({ ...prev, worker: e.target.value }))}
                  disabled={timerState.isRunning}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all"
                  placeholder="작업자 이름을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Target className="inline mr-1" size={16} />
                  작업 대상
                </label>
                <input
                  type="text"
                  value={timerState.target}
                  onChange={(e) => setTimerState(prev => ({ ...prev, target: e.target.value }))}
                  disabled={timerState.isRunning}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all"
                  placeholder="작업 대상을 입력하세요"
                />
              </div>
            </div>

            {/* 타이머 디스플레이 */}
            <div className="text-center mb-6">
              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <div className="text-5xl font-mono font-bold text-gray-800 mb-2">
                  {formatTime(timerState.currentTime)}
                </div>
                <div className="text-sm text-gray-600">
                  {timerState.isRunning 
                    ? (timerState.isPaused ? '일시정지됨' : '측정 중...') 
                    : '대기 중'
                  }
                </div>
              </div>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex space-x-3">
              {!timerState.isRunning ? (
                <button
                  onClick={startTimer}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Play className="mr-2" size={20} />
                  시작
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePause}
                    className={`flex-1 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center ${
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
                    onClick={stopTimer}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Square className="mr-2" size={20} />
                    정지
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 기록 관리 섹션 */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <BarChart3 className="mr-2 text-blue-500" />
                측정 기록
              </h2>
              
              <div className="flex space-x-2">
                <button
                  onClick={exportData}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="데이터 내보내기"
                >
                  <Download size={20} />
                </button>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="데이터 가져오기"
                >
                  <Upload size={20} />
                </button>
                
                <button
                  onClick={deleteAllRecords}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="모든 기록 삭제"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {/* 검색 및 필터 */}
            <div className="space-y-3 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="작업자 또는 대상으로 검색..."
                />
              </div>
              
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 기록 목록 */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {records.length === 0 ? '아직 기록이 없습니다.' : '검색 결과가 없습니다.'}
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <div key={record.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    {editingRecord === record.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          defaultValue={record.worker}
                          onBlur={(e) => updateRecord(record.id, { worker: e.target.value })}
                          className="w-full p-2 border rounded text-sm"
                          placeholder="작업자"
                        />
                        <input
                          type="text"
                          defaultValue={record.target}
                          onBlur={(e) => updateRecord(record.id, { target: e.target.value })}
                          className="w-full p-2 border rounded text-sm"
                          placeholder="작업 대상"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-800">{record.worker}</span>
                            <span className="text-gray-500">→</span>
                            <span className="text-gray-700">{record.target}</span>
                          </div>
                          
                          <div className="flex space-x-1">
                            <button
                              onClick={() => setEditingRecord(record.id)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="편집"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="삭제"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{formatDate(record.startTime)}</span>
                          <span className="font-mono font-bold text-blue-600">
                            {formatTime(record.duration)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={importData}
          className="hidden"
        />
      </div>
    </div>
  );
}
