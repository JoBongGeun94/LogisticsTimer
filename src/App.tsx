import React, { useState, useEffect } from 'react';
import { LapTime } from './types';
import { TimerDisplay } from './components/Timer/TimerDisplay';
import { TimerControls } from './components/Timer/TimerControls';
import { SessionManager } from './components/Session/SessionManager';
import { GageRRAnalysis } from './components/Analysis/GageRRAnalysis';
import { useTimer } from './hooks/useTimer';
import { useSession } from './hooks/useSession';
import { useNotification } from './hooks/useNotification';
import { GageRRResult } from './services/AnalysisService';
import { ExportService } from './services/ExportService';
import { Download, BarChart3, HelpCircle, Home, Maximize2 } from 'lucide-react';

// 동적 임포트로 새 페이지들 로드 (기존 코드에 영향 없음)
const LandingPage = React.lazy(() => import('./pages/Landing/LandingPage').then(module => ({ default: module.LandingPage })));
const DetailedAnalysisPage = React.lazy(() => import('./pages/Analysis/DetailedAnalysisPage').then(module => ({ default: module.DetailedAnalysisPage })));
const HelpModal = React.lazy(() => import('./components/UI/Modal/HelpModal').then(module => ({ default: module.HelpModal })));
const Toast = React.lazy(() => import('./components/UI/Toast/Toast').then(module => ({ default: module.Toast })));

function App() {
  // 새로운 네비게이션 상태 (기존 상태는 그대로 유지)
  const [showLanding, setShowLanding] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GageRRResult | null>(null);

  // 기존 로직 100% 그대로 유지
  const { currentTime, isRunning, start, stop, reset } = useTimer();
  const { sessions, currentSession, createSession, selectSession, addMeasurement } = useSession();
  const { toast, showToast } = useNotification();
  
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<string>('');
  const [measurements, setMeasurements] = useState<LapTime[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // 기존 키보드 단축키에 새 기능만 추가
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (showLanding || showDetailedAnalysis) return;
      
      switch (event.key) {
        case ' ':
          event.preventDefault();
          if (isRunning) stop(); else start();
          break;
        case 'Enter':
          event.preventDefault();
          if (isRunning) handleLapTime();
          break;
        case 'r':
        case 'R':
          if (!event.ctrlKey && !event.altKey) {
            event.preventDefault();
            reset();
          }
          break;
        case 'F1':
          event.preventDefault();
          setShowHelpModal(true);
          break;
      }
      
      if (event.ctrlKey) {
        switch (event.key) {
          case 'h':
          case 'H':
            event.preventDefault();
            setShowLanding(true);
            break;
          case 'e':
          case 'E':
            event.preventDefault();
            if (measurements.length > 0) handleDownload();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showLanding, showDetailedAnalysis, isRunning, start, stop, reset, measurements.length]);

  // 기존 함수들 그대로 유지
  const handleLapTime = () => {
    if (!currentSession || !selectedOperator || !selectedPart) {
      if (showToast) {
        showToast('세션, 측정자, 대상자를 모두 선택해주세요.', 'warning');
      } else {
        alert('세션, 측정자, 대상자를 모두 선택해주세요.');
      }
      return;
    }

    const lapTime: LapTime = {
      id: Date.now().toString(),
      time: currentTime,
      timestamp: new Date(),
      operatorId: selectedOperator,
      partId: selectedPart,
      sessionId: currentSession.id
    };

    addMeasurement(lapTime);
    setMeasurements(prev => [...prev, lapTime]);
    reset();
    
    if (showToast) {
      showToast('측정이 기록되었습니다.', 'success');
    }
  };

  const handleDownload = () => {
    if (measurements.length === 0) {
      if (showToast) {
        showToast('다운로드할 측정 데이터가 없습니다.', 'warning');
      } else {
        alert('다운로드할 측정 데이터가 없습니다.');
      }
      return;
    }

    try {
      ExportService.exportToCSV(measurements, currentSession?.name || 'measurements');
      if (showToast) {
        showToast('CSV 파일이 다운로드되었습니다.', 'success');
      }
    } catch (error) {
      if (showToast) {
        showToast('파일 다운로드 중 오류가 발생했습니다.', 'error');
      } else {
        alert('파일 다운로드 중 오류가 발생했습니다.');
      }
    }
  };

  const canPerformAnalysis = () => {
    if (!currentSession || measurements.length < 10) return false;
    
    const operators = new Set(measurements.map(m => m.operatorId)).size;
    const parts = new Set(measurements.map(m => m.partId)).size;
    
    return operators >= 2 && parts >= 5;
  };

  const handleAnalysisComplete = (result: GageRRResult) => {
    setAnalysisResult(result);
    if (showToast) {
      showToast('Gage R&R 분석이 완료되었습니다.', 'success');
    }
  };

  // 새로운 네비게이션 함수들
  const handleShowLanding = () => setShowLanding(true);
  const handleCloseLanding = () => setShowLanding(false);
  const handleShowDetailedAnalysis = () => {
    if (analysisResult) {
      setShowDetailedAnalysis(true);
    }
  };
  const handleCloseDetailedAnalysis = () => setShowDetailedAnalysis(false);

  // 랜딩 페이지 오버레이 렌더링
  if (showLanding) {
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩 중...</div>}>
        <LandingPage onGetStarted={handleCloseLanding} />
        {toast && (
          <React.Suspense fallback={null}>
            <Toast {...toast} />
          </React.Suspense>
        )}
      </React.Suspense>
    );
  }

  // 상세 분석 페이지 오버레이 렌더링
  if (showDetailedAnalysis && analysisResult) {
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">로딩 중...</div>}>
        <DetailedAnalysisPage
          analysisResult={analysisResult}
          measurements={measurements}
          sessionName={currentSession?.name || '분석 결과'}
          onBack={handleCloseDetailedAnalysis}
        />
        {toast && (
          <React.Suspense fallback={null}>
            <Toast {...toast} />
          </React.Suspense>
        )}
      </React.Suspense>
    );
  }

  // 기존 메인 애플리케이션 렌더링 (100% 보존, 헤더만 확장)
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  물류 작업현장 Gage R&R 분석 시스템
                </h1>
                <p className="text-sm text-gray-600 mt-1">MSA 규격 완전 준수 · SOLID 원칙 적용</p>
              </div>
            </div>
            
            {/* 새로운 네비게이션 버튼들 추가 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShowLanding}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="소개 페이지 (Ctrl+H)"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">소개</span>
              </button>
              
              {analysisResult && (
                <button
                  onClick={handleShowDetailedAnalysis}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  title="상세 분석 보기"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">상세 분석</span>
                </button>
              )}
              
              <button
                onClick={() => setShowHelpModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="도움말 (F1)"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">도움말</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 기존 메인 컨텐츠 100% 그대로 유지 */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 좌측: 타이머 및 세션 관리 */}
          <div className="space-y-6">
            <SessionManager
              sessions={sessions}
              currentSession={currentSession}
              onCreateSession={createSession}
              onSelectSession={selectSession}
            />

            {currentSession && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4">측정 설정</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      측정자 선택
                    </label>
                    <select
                      value={selectedOperator}
                      onChange={(e) => setSelectedOperator(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">선택하세요</option>
                      {currentSession.operators.map((operator) => (
                        <option key={operator} value={operator}>
                          {operator}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      대상자 선택
                    </label>
                    <select
                      value={selectedPart}
                      onChange={(e) => setSelectedPart(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">선택하세요</option>
                      {currentSession.parts.map((part) => (
                        <option key={part} value={part}>
                          {part}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white p-8 rounded-lg shadow-lg">
              <TimerDisplay currentTime={currentTime} isRunning={isRunning} />
              <TimerControls
                isRunning={isRunning}
                onStart={start}
                onStop={stop}
                onReset={reset}
                onLap={handleLapTime}
                disabled={!currentSession || !selectedOperator || !selectedPart}
              />
            </div>

            {measurements.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">측정 현황</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAnalysis(!showAnalysis)}
                      disabled={!canPerformAnalysis()}
                      className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                        canPerformAnalysis()
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <BarChart3 size={16} />
                      분석
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
                    >
                      <Download size={16} />
                      CSV
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {measurements.length}
                    </div>
                    <div className="text-sm text-gray-600">총 측정 수</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-2xl font-bold text-green-600">
                      {new Set(measurements.map(m => m.operatorId)).size}
                    </div>
                    <div className="text-sm text-gray-600">측정자 수</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-2xl font-bold text-purple-600">
                      {new Set(measurements.map(m => m.partId)).size}
                    </div>
                    <div className="text-sm text-gray-600">대상자 수</div>
                  </div>
                </div>

                {!canPerformAnalysis() && (
                  <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
                    MSA 규격 분석을 위해서는 최소 10회 측정, 2명 이상의 측정자, 5개 이상의 대상자가 필요합니다.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 우측: 분석 결과 */}
          <div className="space-y-6">
            {showAnalysis && canPerformAnalysis() && (
              <GageRRAnalysis
                measurements={measurements}
                onAnalysisComplete={handleAnalysisComplete}
              />
            )}

            {measurements.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4">최근 측정 기록</h3>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">시간</th>
                        <th className="px-3 py-2 text-left">측정자</th>
                        <th className="px-3 py-2 text-left">대상자</th>
                        <th className="px-3 py-2 text-left">측정값</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measurements.slice(-20).reverse().map((measurement) => (
                        <tr key={measurement.id} className="border-t">
                          <td className="px-3 py-2">
                            {measurement.timestamp.toLocaleTimeString()}
                          </td>
                          <td className="px-3 py-2">{measurement.operatorId}</td>
                          <td className="px-3 py-2">{measurement.partId}</td>
                          <td className="px-3 py-2 font-mono">
                            {measurement.time.toFixed(3)}s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 모달 및 알림 (조건부 렌더링) */}
      {showHelpModal && (
        <React.Suspense fallback={null}>
          <HelpModal 
            isOpen={showHelpModal} 
            onClose={() => setShowHelpModal(false)} 
          />
        </React.Suspense>
      )}
      
      {toast && (
        <React.Suspense fallback={null}>
          <Toast {...toast} />
        </React.Suspense>
      )}
    </div>
  );
}

export default App;
