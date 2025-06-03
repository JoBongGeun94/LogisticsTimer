import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSessionState } from "@/hooks/useSessionState";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { formatTime, calculateStatistics, getHighPrecisionTime, validateMeasurementAccuracy } from "@/lib/timer-utils";
import { SessionValidationService } from "@/lib/SessionValidationService";
import { MeasurementForm } from "@/components/measurement-form";
import { SessionManager } from "@/components/SessionManager";
import { TimerControls } from "@/components/timer-controls";
import { LapHistory } from "@/components/lap-history";
import { Link } from "wouter";
import { BarChart3, Download, LogOut, Moon, Sun, Settings, HelpCircle, Play, Pause, Square, RotateCcw, Users, CheckCircle2, Save, History } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Type definitions
interface Operator {
  id: string;
  name: string;
}

interface Part {
  id: string;
  name: string;
}

interface Measurement {
  id: number;
  sessionId: number;
  userId: string;
  attemptNumber: number;
  timeInMs: number;
  taskType: string;
  partNumber?: string;
  operatorName?: string;
  partId?: string;
  partName?: string;
  trialNumber?: number;
  createdAt: string;
}

export default function Timer() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Session state management using SOLID principles
  const {
    activeSession,
    isSessionReady,
    isCreatingSession,
    canStartMeasurement,
    createSession,
    updateSession,
    completeSession
  } = useSessionState();

  // Timer state
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastStartTime, setLastStartTime] = useState<number | null>(null);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // GRR mode state
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [selectedPart, setSelectedPart] = useState<string>("");
  const [currentTrial, setCurrentTrial] = useState(1);

  // Dialog states
  const [showStatistics, setShowStatistics] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "인증 필요",
        description: "로그인이 필요합니다. 로그인 페이지로 이동합니다...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, isLoading, toast]);

  // Fetch measurements for active session
  const { data: measurements = [], refetch: refetchMeasurements } = useQuery<Measurement[]>({
    queryKey: [`/api/measurements/session/${activeSession?.id}`],
    enabled: !!activeSession?.id,
    retry: false,
  });

  // Auto-select first operator and part when session loads (GRR mode)
  useEffect(() => {
    if (activeSession?.operators && activeSession?.parts) {
      if (!selectedOperator && activeSession.operators.length > 0) {
        setSelectedOperator(activeSession.operators[0].id);
      }
      if (!selectedPart && activeSession.parts.length > 0) {
        setSelectedPart(activeSession.parts[0].id);
      }
    }
  }, [activeSession]);

  // Create measurement mutation
  const createMeasurementMutation = useMutation({
    mutationFn: async (measurementData: {
      sessionId: number;
      attemptNumber: number;
      timeInMs: number;
      taskType: string;
      partNumber?: string;
      operatorName?: string;
      partId?: string;
      partName?: string;
      trialNumber?: number;
    }) => {
      const response = await apiRequest("POST", "/api/measurements", measurementData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/measurements/session/${activeSession?.id}`] });
      refetchMeasurements();
      
      const measurementCount = Array.isArray(measurements) ? measurements.length + 1 : 1;
      const isGRRMode = activeSession?.taskType === 'gage-rr';
      const totalRequired = isGRRMode ? (activeSession?.operators?.length || 0) * (activeSession?.parts?.length || 0) * (activeSession?.trialsPerOperator || 3) : 10;
      
      let nextStepMessage = "";
      if (measurementCount >= totalRequired) {
        nextStepMessage = " 충분한 데이터가 수집되었습니다. 분석 페이지로 이동하여 결과를 확인하세요.";
      } else if (isGRRMode) {
        const remainingTrials = totalRequired - measurementCount;
        nextStepMessage = ` 다음 측정을 진행하세요. (${remainingTrials}회 남음)`;
      } else {
        nextStepMessage = " 다음 측정을 계속 진행하거나 분석을 시작하세요.";
      }
      
      toast({
        title: "✅ 측정 완료",
        description: `${measurementCount}번째 측정이 성공적으로 기록되었습니다. (${formatTime(currentTime)})${nextStepMessage}`,
        className: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
        duration: measurementCount >= totalRequired ? 8000 : 5000,
      });
      
      resetTimer();
      
      // Visual feedback
      document.body.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      setTimeout(() => {
        document.body.style.background = '';
      }, 200);
      
      // Auto-advance logic for GRR mode
      if (isGRRMode && activeSession?.operators && activeSession?.parts) {
        const currentOperatorIndex = activeSession.operators.findIndex(op => op.id === selectedOperator);
        const currentPartIndex = activeSession.parts.findIndex(part => part.id === selectedPart);
        const currentTrialsForThisCombination = measurements.filter(m => 
          m.operatorName === activeSession.operators?.[currentOperatorIndex]?.name &&
          m.partName === activeSession.parts?.[currentPartIndex]?.name
        ).length + 1;
        
        if (currentTrialsForThisCombination >= (activeSession.trialsPerOperator || 3)) {
          if (currentPartIndex < activeSession.parts.length - 1) {
            setSelectedPart(activeSession.parts[currentPartIndex + 1].id);
            toast({
              title: "자동 전환",
              description: `다음 부품으로 자동 전환: ${activeSession.parts[currentPartIndex + 1].name}`,
              className: "border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
            });
          } else if (currentOperatorIndex < activeSession.operators.length - 1) {
            setSelectedOperator(activeSession.operators[currentOperatorIndex + 1].id);
            setSelectedPart(activeSession.parts[0].id);
            toast({
              title: "자동 전환",
              description: `다음 측정자로 자동 전환: ${activeSession.operators[currentOperatorIndex + 1].name}`,
              className: "border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
            });
          }
        }
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "인증 오류",
          description: "다시 로그인해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "오류",
        description: "측정을 기록할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  // Timer functions
  const startTimer = () => {
    if (!activeSession) {
      toast({
        title: "세션 필요",
        description: "먼저 작업 정보를 설정해주세요.",
        variant: "destructive",
      });
      return;
    }

    const now = Date.now();
    
    if (!isRunning && !isPaused) {
      setAccumulatedTime(0);
      setCurrentTime(0);
    }
    
    setLastStartTime(now);
    setIsRunning(true);
    setIsPaused(false);
    
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    const id = setInterval(() => {
      const elapsed = Date.now() - now;
      setCurrentTime(accumulatedTime + elapsed);
    }, 10);
    setIntervalId(id);

    toast({
      title: isPaused ? "타이머 재시작" : "측정 시작",
      description: isPaused ? "타이머가 재시작되었습니다." : "타이머가 시작되었습니다.",
    });
  };

  const pauseTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setAccumulatedTime(currentTime);
    setIsRunning(false);
    setIsPaused(true);
    setLastStartTime(null);

    toast({
      title: "타이머 일시정지",
      description: "타이머가 일시정지되었습니다.",
    });
  };

  const stopTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsRunning(false);
    setIsPaused(false);
    
    toast({
      title: "타이머 정지",
      description: "타이머가 정지되었습니다.",
    });
  };

  const resetTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsRunning(false);
    setIsPaused(false);
    setCurrentTime(0);
    setAccumulatedTime(0);
    setLastStartTime(null);
  };

  const lapTimer = () => {
    if (!isRunning) return;
    
    toast({
      title: "랩 타임",
      description: `현재 시간: ${formatTime(currentTime)}`,
      className: "border-blue-200 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
    });
  };

  const saveMeasurement = () => {
    if (!activeSession) {
      toast({
        title: "세션 필요",
        description: "먼저 작업 정보를 설정해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (currentTime <= 0) {
      toast({
        title: "측정 시간 오류",
        description: "유효한 측정 시간이 필요합니다. 타이머를 시작한 후 측정해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (currentTime > 3600000) {
      toast({
        title: "측정 시간 초과",
        description: "측정 시간이 너무 깁니다. 1시간을 초과할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    // SOLID-based validation using SessionValidationService
    const validationService = new SessionValidationService({
      taskType: activeSession.taskType,
      operatorName: activeSession.operatorName,
      targetName: activeSession.targetName,
      operators: activeSession.operators,
      parts: activeSession.parts,
      selectedOperator,
      selectedPart
    });
    
    const validation = validationService.validate();
    if (!validation.canStart) {
      toast({
        title: "선택 항목 확인",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    // Prepare measurement data based on session type
    let measurementData;
    
    if (activeSession.taskType === 'gage-rr' && activeSession.operators && activeSession.parts) {
      // GRR mode measurement data
      const operator = activeSession.operators.find((op: any) => op.id === selectedOperator);
      const part = activeSession.parts.find((p: any) => p.id === selectedPart);
      
      measurementData = {
        sessionId: activeSession.id,
        attemptNumber: measurements.length + 1,
        timeInMs: Math.round(currentTime),
        taskType: activeSession.taskType,
        partNumber: activeSession.partNumber || "",
        operatorName: operator?.name || "",
        partId: selectedPart,
        partName: part?.name || "",
        trialNumber: currentTrial,
      };
    } else {
      // Basic mode measurement data
      measurementData = {
        sessionId: activeSession.id,
        attemptNumber: measurements.length + 1,
        timeInMs: Math.round(currentTime),
        taskType: activeSession.taskType,
        partNumber: activeSession.partNumber || "",
        operatorName: activeSession.operatorName || "측정자1",
        partId: undefined,
        partName: activeSession.targetName || "대상자1",
        trialNumber: undefined,
      };
    }

    createMeasurementMutation.mutate(measurementData);
  };

  const handleLogout = () => {
    if (isRunning) {
      if (!confirm("측정이 진행 중입니다. 로그아웃하시겠습니까?")) {
        return;
      }
      resetTimer();
    }
    window.location.href = "/api/logout";
  };

  const handleExport = async () => {
    if (!activeSession || measurements.length === 0) {
      toast({
        title: "데이터 없음",
        description: "내보낼 측정 데이터가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = `/api/export/excel/${activeSession.id}/download`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `측정데이터_${activeSession.taskType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "다운로드 완료",
        description: "측정 데이터를 Excel 파일로 다운로드했습니다.",
        className: "border-green-200 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100",
      });
      
      setShowExportDialog(false);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "다운로드 실패",
        description: "파일 다운로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleOperatorSelect = (operatorId: string) => {
    setSelectedOperator(operatorId);
    console.log("Operator selected:", operatorId);
  };

  const handlePartSelect = (partId: string) => {
    setSelectedPart(partId);
    console.log("Part selected:", partId);
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                공
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">공군 종합보급창</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">ID: {user.id}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              <Link href="/analysis">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  분석
                </Button>
              </Link>
              
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 space-y-4">
          {/* Session Manager */}
          <SessionManager
            activeSession={activeSession}
            isSessionReady={isSessionReady}
            isCreatingSession={isCreatingSession}
            canStartMeasurement={canStartMeasurement}
          >
            <MeasurementForm
              onSessionCreate={createSession}
              activeSession={activeSession}
              isLoading={isCreatingSession}
              onOperatorChange={(operatorName) => updateSession({ operatorName })}
              onTargetChange={(targetName) => updateSession({ targetName })}
              selectedOperator={selectedOperator}
              selectedPart={selectedPart}
              onOperatorSelect={handleOperatorSelect}
              onPartSelect={handlePartSelect}
              currentTrial={currentTrial}
              measurements={measurements}
            />
          </SessionManager>

          {/* Timer Section */}
          {activeSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    타이머
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    시도 #{measurements.length + 1}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timer Display */}
                <div className="relative bg-gray-900 dark:bg-gray-800 rounded-lg p-8 text-center">
                  <div className="text-6xl font-mono font-bold text-white mb-2">
                    {formatTime(currentTime)}
                  </div>
                  <div className="text-sm text-gray-400">
                    시도 #{measurements.length + 1}
                  </div>
                  
                  {/* Running indicator */}
                  {isRunning && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse opacity-20"></div>
                    </div>
                  )}
                </div>

                {/* Timer Controls */}
                <TimerControls
                  isRunning={isRunning}
                  isPaused={isPaused}
                  onStart={startTimer}
                  onPause={pauseTimer}
                  onStop={stopTimer}
                  onLap={lapTimer}
                  onReset={resetTimer}
                  disabled={!canStartMeasurement}
                />

                {/* Enhanced Progress Display */}
                {(measurements.length > 0 || activeSession?.taskType === 'gage-rr') && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg mb-4 border border-blue-200 dark:border-blue-800">
                    {activeSession?.taskType === 'gage-rr' && activeSession?.operators && activeSession?.parts ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                            Gage R&R 진행도
                          </span>
                          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                            {measurements.length}/{(activeSession.operators.length * activeSession.parts.length * (activeSession.trialsPerOperator || 3))} 측정
                          </span>
                        </div>
                        
                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 mb-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${Math.min(100, (measurements.length / (activeSession.operators.length * activeSession.parts.length * (activeSession.trialsPerOperator || 3))) * 100)}%` }}
                          >
                            {measurements.length > 0 && (
                              <div className="text-xs text-white font-medium">
                                {Math.round((measurements.length / (activeSession.operators.length * activeSession.parts.length * (activeSession.trialsPerOperator || 3))) * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                            기본 모드 진행도
                          </span>
                          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                            {measurements.length}/10 측정
                          </span>
                        </div>
                        
                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 mb-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${Math.min(100, (measurements.length / 10) * 100)}%` }}
                          >
                            {measurements.length > 0 && (
                              <div className="text-xs text-white font-medium">
                                {Math.round((measurements.length / 10) * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    onClick={saveMeasurement}
                    disabled={!isRunning && !isPaused && !canStartMeasurement}
                    className="flex-1"
                    size="lg"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    기록
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowStatistics(true)}
                    disabled={measurements.length === 0}
                    size="lg"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    통계
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowExportDialog(true)}
                    disabled={measurements.length === 0}
                    size="lg"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    내보내기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Measurements */}
          {measurements.length > 0 && (
            <LapHistory 
              measurements={measurements.filter(m => 
                !activeSession?.operators || 
                (m.operatorName === activeSession.operators.find((op: any) => op.id === selectedOperator)?.name &&
                 m.partName === activeSession?.parts?.find((p: any) => p.id === selectedPart)?.name)
              ).slice(-5)} 
              currentTrial={currentTrial}
            />
          )}
        </main>

        {/* Statistics Dialog */}
        <Dialog open={showStatistics} onOpenChange={setShowStatistics}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>측정 통계</DialogTitle>
              <DialogDescription>
                현재 세션의 측정 데이터 통계입니다.
              </DialogDescription>
            </DialogHeader>
            
            {measurements.length > 0 && (
              <div className="space-y-4">
                {(() => {
                  const stats = calculateStatistics(measurements.map(m => m.timeInMs));
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-sm text-gray-500 dark:text-gray-400">총 측정 횟수</div>
                        <div className="text-2xl font-bold">{measurements.length}회</div>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-sm text-gray-500 dark:text-gray-400">평균 시간</div>
                        <div className="text-2xl font-bold">{formatTime(stats.mean)}</div>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-sm text-gray-500 dark:text-gray-400">최소 시간</div>
                        <div className="text-2xl font-bold">{formatTime(stats.min)}</div>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-sm text-gray-500 dark:text-gray-400">최대 시간</div>
                        <div className="text-2xl font-bold">{formatTime(stats.max)}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>데이터 내보내기</DialogTitle>
              <DialogDescription>
                측정 데이터를 Excel 파일로 내보냅니다.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium mb-2">내보낼 데이터</h4>
                <ul className="text-sm space-y-1">
                  <li>• 총 측정 횟수: {measurements.length}회</li>
                  <li>• 작업 유형: {activeSession?.taskType}</li>
                  <li>• 측정자: {activeSession?.operatorName || selectedOperator}</li>
                  <li>• 대상: {activeSession?.targetName || selectedPart}</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <Button onClick={handleExport} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Excel 다운로드
                </Button>
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  취소
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}