import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Download, Upload, Settings, Users, Target, Clock, BarChart3, TrendingUp, Calendar, Filter, Search, Trash2, Edit3, Check, X, Plus, RefreshCw } from 'lucide-react';

interface Measurement {
  id: number;
  operator: string;
  target: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  status: 'running' | 'paused' | 'completed';
}

const LogisticsTimer = () => {
  // 상태 관리
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [operator, setOperator] = useState('');
  const [target, setTarget] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentMeasurement, setCurrentMeasurement] = useState<Measurement | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempValues, setTempValues] = useState<{operator?: string; target?: string}>({});
  
  // 실시간 시간 업데이트
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => prev + 1);
      }, 10); // 0.01초 단위
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const savedMeasurements = localStorage.getItem('logistics-measurements');
    if (savedMeasurements) {
      try {
        const parsed = JSON.parse(savedMeasurements);
        // Date 객체 복원
        const restored = parsed.map((m: any) => ({
          ...m,
          startTime: new Date(m.startTime),
          endTime: m.endTime ? new Date(m.endTime) : undefined
        }));
        setMeasurements(restored);
      } catch (error) {
        console.error('Failed to load measurements:', error);
      }
    }
  }, []);

  // 데이터 저장
  useEffect(() => {
    localStorage.setItem('logistics-measurements', JSON.stringify(measurements));
  }, [measurements]);

  // 시간 포맷팅 함수
  const formatTime = (centiseconds: number): string => {
    const hours = Math.floor(centiseconds / 360000);
    const minutes = Math.floor((centiseconds % 360000) / 6000);
    const seconds = Math.floor((centiseconds % 6000) / 100);
    const cs = centiseconds % 100;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };

  // 타이머 시작
  const startTimer = () => {
    if (!operator.trim() || !target.trim()) {
      alert('작업자명과 측정 대상을 입력해주세요.');
      return;
    }
    
    const now = new Date();
    setStartTime(now);
    setTime(0);
    setIsRunning(true);
    setCurrentMeasurement({
      id: Date.now(),
      operator: operator.trim(),
      target: target.trim(),
      startTime: now,
      duration: 0,
      status: 'running'
    });
  };

  // 타이머 일시정지/재시작
  const toggleTimer = () => {
    setIsRunning(!isRunning);
    if (currentMeasurement) {
      setCurrentMeasurement({
        ...currentMeasurement,
        status: isRunning ? 'paused' : 'running'
      });
    }
  };

  // 타이머 완료
  const completeTimer = () => {
    if (!currentMeasurement) return;
    
    const completedMeasurement: Measurement = {
      ...currentMeasurement,
      endTime: new Date(),
      duration: time,
      status: 'completed'
    };
    
    setMeasurements(prev => [completedMeasurement, ...prev]);
    setIsRunning(false);
    setTime(0);
    setCurrentMeasurement(null);
    setStartTime(null);
  };

  // 타이머 리셋
  const resetTimer = () => {
    setIsRunning(false);
    setTime(0);
    setCurrentMeasurement(null);
    setStartTime(null);
  };

  // 측정 결과 삭제
  const deleteMeasurement = (id: number) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  // 편집 모드 토글
  const toggleEdit = (id: number) => {
    if (editingId === id) {
      setEditingId(null);
      setTempValues({});
    } else {
      const measurement = measurements.find(m => m.id === id);
      if (measurement) {
        setEditingId(id);
        setTempValues({
          operator: measurement.operator,
          target: measurement.target
        });
      }
    }
  };

  // 편집 저장
  const saveEdit = (id: number) => {
    setMeasurements(prev => prev.map(m => 
      m.id === id 
        ? { ...m, operator: tempValues.operator || m.operator, target: tempValues.target || m.target }
        : m
    ));
    setEditingId(null);
    setTempValues({});
  };

  // 데이터 내보내기
  const exportData = () => {
    const dataStr = JSON.stringify(measurements, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logistics-measurements-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 데이터 가져오기
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const importedData = JSON.parse(result);
          if (Array.isArray(importedData)) {
            const restored = importedData.map((m: any) => ({
              ...m,
              startTime: new Date(m.startTime),
              endTime: m.endTime ? new Date(m.endTime) : undefined
            }));
            setMeasurements(prev => [...restored, ...prev]);
            alert('데이터를 성공적으로 가져왔습니다.');
          } else {
            alert('올바른 형식의 파일이 아닙니다.');
          }
        }
      } catch (error) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // 필터링된 측정 결과
  const filteredMeasurements = measurements.filter(m => {
    const matchesSearch = !searchTerm || 
      m.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.target.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !filterDate || 
      m.startTime.toISOString().split('T')[0] === filterDate;
    
    return matchesSearch && matchesDate;
  });

  // 통계 계산
  const stats = {
    total: measurements.length,
    today: measurements.filter(m => 
      m.startTime.toDateString() === new Date().toDateString()
    ).length,
    avgTime: measurements.length > 0 
      ? measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length
      : 0,
    operators: [...new Set(measurements.map(m => m.operator))].length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">물류 작업 시간 측정</h1>
                <p className="text-gray-600">정밀한 인시수 측정 도구</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                기록 보기
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
                설정
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* 타이머 섹션 */}
          <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              측정 도구
            </h2>
            
            {/* 입력 필드 */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  작업자명
                </label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="작업자명을 입력하세요"
                  disabled={isRunning}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Target className="w-4 h-4 inline mr-1" />
                  측정 대상
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="측정할 작업을 입력하세요"
                  disabled={isRunning}
                />
              </div>
            </div>

            {/* 타이머 디스플레이 */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <div className={`text-4xl font-mono font-bold text-gray-800 mb-2 ${isRunning ? 'animate-pulse-slow text-blue-600' : ''}`}>
                  {formatTime(time)}
                </div>
                {currentMeasurement && (
                  <div className="text-sm text-gray-600">
                    {currentMeasurement.operator} - {currentMeasurement.target}
                  </div>
                )}
                {startTime && (
                  <div className="text-xs text-gray-500 mt-1">
                    시작: {startTime.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex gap-2">
              {!isRunning && !currentMeasurement ? (
                <button
                  onClick={startTimer}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all transform hover:scale-105"
                >
                  <Play className="w-5 h-5" />
                  시작
                </button>
              ) : (
                <>
                  <button
                    onClick={toggleTimer}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all transform hover:scale-105 ${
                      isRunning 
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {isRunning ? '일시정지' : '재시작'}
                  </button>
                  
                  <button
                    onClick={completeTimer}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all transform hover:scale-105"
                  >
                    <Square className="w-5 h-5" />
                    완료
                  </button>
                  
                  <button
                    onClick={resetTimer}
                    className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all transform hover:scale-105"
                    title="리셋"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 통계 섹션 */}
          <div className="bg-white rounded-xl shadow-lg p-6 animate-slide-up">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              실시간 통계
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg transition-all hover:bg-blue-100">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">총 측정 횟수</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg transition-all hover:bg-green-100">
                <div className="text-2xl font-bold text-green-600">{stats.today}</div>
                <div className="text-sm text-gray-600">오늘 측정 횟수</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg transition-all hover:bg-purple-100">
                <div className="text-2xl font-bold text-purple-600">{formatTime(Math.round(stats.avgTime))}</div>
                <div className="text-sm text-gray-600">평균 시간</div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg transition-all hover:bg-orange-100">
                <div className="text-2xl font-bold text-orange-600">{stats.operators}</div>
                <div className="text-sm text-gray-600">작업자 수</div>
              </div>
            </div>

            {/* 최근 활동 */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-3">최근 측정</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {measurements.slice(0, 5).map((measurement) => (
                  <div key={measurement.id} className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{measurement.operator}</div>
                        <div className="text-xs text-gray-600 truncate max-w-32">{measurement.target}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">{formatTime(measurement.duration)}</div>
                        <div className="text-xs text-gray-500">
                          {measurement.startTime.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {measurements.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    아직 측정 기록이 없습니다
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 설정 패널 */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 animate-slide-up">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">설정</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    데이터 관리
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={exportData}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all transform hover:scale-105"
                    >
                      <Download className="w-4 h-4" />
                      내보내기
                    </button>
                    
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all transform hover:scale-105 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      가져오기
                      <input
                        type="file"
                        accept=".json"
                        onChange={importData}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    데이터 초기화
                  </label>
                  <button
                    onClick={() => {
                      if (confirm('모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                        setMeasurements([]);
                        alert('데이터가 초기화되었습니다.');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all transform hover:scale-105"
                  >
                    <Trash2 className="w-4 h-4" />
                    모든 데이터 삭제
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 text-center">
                    버전 2.0.0 | 개선된 물류 타이머
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 기록 보기 패널 */}
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col animate-slide-up">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">측정 기록</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* 필터 및 검색 */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="작업자 또는 작업명으로 검색..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDate('');
                  }}
                  className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all transform hover:scale-105"
                  title="필터 초기화"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* 통계 요약 */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-600">{filteredMeasurements.length}</div>
                    <div className="text-xs text-gray-600">표시된 기록</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {filteredMeasurements.length > 0 ? formatTime(Math.round(filteredMeasurements.reduce((sum, m) => sum + m.duration, 0) / filteredMeasurements.length)) : '0:00.00'}
                    </div>
                    <div className="text-xs text-gray-600">평균 시간</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-600">
                      {filteredMeasurements.length > 0 ? formatTime(Math.max(...filteredMeasurements.map(m => m.duration))) : '0:00.00'}
                    </div>
                    <div className="text-xs text-gray-600">최대 시간</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-600">
                      {filteredMeasurements.length > 0 ? formatTime(Math.min(...filteredMeasurements.map(m => m.duration))) : '0:00.00'}
                    </div>
                    <div className="text-xs text-gray-600">최소 시간</div>
                  </div>
                </div>
              </div>

              {/* 측정 기록 목록 */}
              <div className="flex-1 overflow-y-auto">
                {filteredMeasurements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm || filterDate ? '검색 조건에 맞는 기록이 없습니다.' : '측정 기록이 없습니다.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMeasurements.map((measurement) => (
                      <div key={measurement.id} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {editingId === measurement.id ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={tempValues.operator || ''}
                                  onChange={(e) => setTempValues(prev => ({ ...prev, operator: e.target.value }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="작업자명"
                                />
                                <input
                                  type="text"
                                  value={tempValues.target || ''}
                                  onChange={(e) => setTempValues(prev => ({ ...prev, target: e.target.value }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="측정 대상"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="font-medium">{measurement.operator}</div>
                                <div className="text-sm text-gray-600">{measurement.target}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {measurement.startTime.toLocaleString()}
                                  {measurement.endTime && ` - ${measurement.endTime.toLocaleTimeString()}`}
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <div className="text-right">
                              <div className="font-mono font-bold text-lg">
                                {formatTime(measurement.duration)}
                              </div>
                              <div className={`text-xs px-2 py-1 rounded-full ${
                                measurement.status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : measurement.status === 'paused'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {measurement.status === 'completed' ? '완료' : 
                                 measurement.status === 'paused' ? '일시정지' : '진행중'}
                              </div>
                            </div>
                            
                            <div className="flex gap-1">
                              {editingId === measurement.id ? (
                                <>
                                  <button
                                    onClick={() => saveEdit(measurement.id)}
                                    className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                                    title="저장"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => toggleEdit(measurement.id)}
                                    className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                    title="취소"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => toggleEdit(measurement.id)}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                    title="편집"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('이 기록을 삭제하시겠습니까?')) {
                                        deleteMeasurement(measurement.id);
                                      }
                                    }}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticsTimer;