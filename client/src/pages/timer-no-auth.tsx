import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatTime, calculateStatistics, getHighPrecisionTime, validateMeasurementAccuracy } from "@/lib/timer-utils";
import { MeasurementForm } from "@/components/measurement-form";
import { TimerControls } from "@/components/timer-controls";
import { StatisticsDisplay } from "@/components/statistics-display";
import { MeasurementsList } from "@/components/measurements-list";
import { SessionForm } from "@/components/session-form";
import { OperatorSelector } from "@/components/operator-selector";
import { PartSelector } from "@/components/part-selector";
import { GageRRForm } from "@/components/gage-rr-form";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { ExportDialog } from "@/components/export-dialog";
import { 
  Play, Pause, Square, RotateCcw, 
  Settings, Download, BarChart3, Clock, 
  Users, Package, FileText, Moon, Sun,
  Plus, Trash2, Edit, Save, X,
  Timer as TimerIcon, Target, Gauge,
  History, Database, AlertCircle,
  CheckCircle, XCircle, Info
} from "lucide-react";

interface Operator {
  id: string;
  name: string;
}

interface Part {
  id: string;
  name: string;
  specification?: string;
}

interface WorkSession {
  id: number;
  taskType: string;
  partNumber?: string;
  operatorName?: string;
  targetName?: string;
  operators?: Operator[];
  parts?: Part[];
  trialsPerOperator?: number;
}

interface Measurement {
  id: number;
  timeInMs: number;
  timestamp: string;
  operatorName?: string;
  partName?: string;
}

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  workerId?: string;
}

export default function Timer() {
  // Mock user for demo (no authentication)
  const user = { id: "demo-user", email: "demo@example.com", firstName: "Demo", lastName: "User" };
  const isLoading = false;

  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [lastStartTime, setLastStartTime] = useState<number | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState("");
  const [selectedPart, setSelectedPart] = useState("");

  // Add logging for selection changes
  const handleOperatorSelect = (operatorId: string) => {
    console.log("Operator selected:", operatorId);
    setSelectedOperator(operatorId);
  };

  const handlePartSelect = (partId: string) => {
    console.log("Part selected:", partId);
    setSelectedPart(partId);
  };

  // Fetch active work session
  const { data: activeSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ["/api/work-sessions/active"],
    retry: false,
  });

  // Fetch measurements for active session
  const { data: measurements = [], isLoading: isLoadingMeasurements } = useQuery({
    queryKey: ["/api/measurements/session", activeSession?.id],
    enabled: !!activeSession?.id,
    retry: false,
  });

  // Session mutations
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: { taskType: string; partNumber?: string }) => {
      const response = await apiRequest("POST", "/api/work-sessions", sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions/active"] });
      toast({
        title: "작업 세션 시작",
        description: "새로운 작업 세션이 시작되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Failed to create work session:", error);
      toast({
        title: "오류",
        description: "작업 세션 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest("PATCH", `/api/work-sessions/${sessionId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions"] });
      toast({
        title: "세션 완료",
        description: "작업 세션이 완료되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Failed to complete session:", error);
      toast({
        title: "오류",
        description: "세션 완료에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Measurement mutations
  const saveMeasurementMutation = useMutation({
    mutationFn: async (measurementData: { timeInMs: number; operatorName?: string; partName?: string }) => {
      if (!activeSession?.id) throw new Error("No active session");
      const response = await apiRequest("POST", `/api/measurements/session/${activeSession.id}`, measurementData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements/session", activeSession?.id] });
      toast({
        title: "측정 저장됨",
        description: "측정 결과가 저장되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Failed to save measurement:", error);
      toast({
        title: "오류",
        description: "측정 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteMeasurementMutation = useMutation({
    mutationFn: async (measurementId: number) => {
      const response = await apiRequest("DELETE", `/api/measurements/${measurementId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements/session", activeSession?.id] });
      toast({
        title: "측정 삭제됨",
        description: "측정 결과가 삭제되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Failed to delete measurement:", error);
      toast({
        title: "오류",
        description: "측정 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Timer functions
  const startTimer = () => {
    const startTime = getHighPrecisionTime();
    setLastStartTime(startTime);
    setIsRunning(true);
    setIsPaused(false);

    const id = setInterval(() => {
      const currentTimestamp = getHighPrecisionTime();
      const elapsed = currentTimestamp - startTime;
      setCurrentTime(accumulatedTime + elapsed);
    }, 10);

    setIntervalId(id);
  };

  const pauseTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsRunning(false);
    setIsPaused(true);
    setAccumulatedTime(currentTime);
  };

  const stopTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    
    if (currentTime > 0) {
      const operatorName = selectedOperator ? 
        activeSession?.operators?.find(op => op.id === selectedOperator)?.name : 
        "Unknown Operator";
      const partName = selectedPart ? 
        activeSession?.parts?.find(part => part.id === selectedPart)?.name : 
        activeSession?.partNumber || "Unknown Part";

      saveMeasurementMutation.mutate({
        timeInMs: Math.round(currentTime),
        operatorName,
        partName
      });
    }

    setIsRunning(false);
    setIsPaused(false);
    setCurrentTime(0);
    setAccumulatedTime(0);
    setLastStartTime(null);
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

  const handleStartSession = (sessionData: { taskType: string; partNumber?: string; operators?: Operator[]; parts?: Part[]; trialsPerOperator?: number }) => {
    createSessionMutation.mutate(sessionData);
  };

  const handleCompleteSession = () => {
    if (activeSession?.id) {
      completeSessionMutation.mutate(activeSession.id);
    }
  };

  const handleDeleteMeasurement = (measurementId: number) => {
    deleteMeasurementMutation.mutate(measurementId);
  };

  // Statistics calculation
  const statistics = measurements.length > 0 ? calculateStatistics(measurements) : null;

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Enhanced Header */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                    <TimerIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">물류 정밀 타이머</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Gage R&R 전용 측정 시스템</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                  <Users className="h-4 w-4" />
                  <span>{user?.firstName} {user?.lastName}</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                
                <ExportDialog 
                  measurements={measurements} 
                  statistics={statistics}
                  sessionInfo={activeSession}
                />
                
                <Dialog open={showHelp} onOpenChange={setShowHelp}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300">
                      <Info className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>사용 가이드</DialogTitle>
                      <DialogDescription>
                        정밀 타이머 사용법과 Gage R&R 측정 절차
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2">1. 작업 세션 시작</h4>
                        <p>먼저 새로운 작업 세션을 생성하고 작업자와 부품을 설정하세요.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">2. 측정 수행</h4>
                        <p>시작 버튼을 눌러 타이머를 시작하고, 작업 완료 후 정지 버튼을 누르세요.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">3. 데이터 분석</h4>
                        <p>충분한 측정 후 통계 분석을 통해 Gage R&R 결과를 확인하세요.</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Timer Section */}
            <div className="lg:col-span-2 space-y-8">
              {/* Session Management */}
              {!activeSession ? (
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-slate-900 dark:text-white">
                      <Settings className="h-5 w-5 mr-2" />
                      작업 세션 설정
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SessionForm 
                      onSubmit={handleStartSession}
                      isLoading={createSessionMutation.isPending}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Session Info */}
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-slate-900 dark:text-white">
                          <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                          활성 세션
                        </CardTitle>
                        <Button
                          onClick={handleCompleteSession}
                          variant="outline"
                          size="sm"
                          disabled={completeSessionMutation.isPending}
                        >
                          세션 완료
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">작업 유형:</span>
                          <p className="font-medium text-slate-900 dark:text-white">{activeSession.taskType}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">부품 번호:</span>
                          <p className="font-medium text-slate-900 dark:text-white">{activeSession.partNumber || "미설정"}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">작업자:</span>
                          <p className="font-medium text-slate-900 dark:text-white">{activeSession.operators?.length || 0}명</p>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">측정 횟수:</span>
                          <p className="font-medium text-slate-900 dark:text-white">{measurements.length}회</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Operator and Part Selection */}
                  {activeSession.operators && activeSession.operators.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                        <CardHeader>
                          <CardTitle className="flex items-center text-slate-900 dark:text-white">
                            <Users className="h-5 w-5 mr-2" />
                            작업자 선택
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <OperatorSelector
                            operators={activeSession.operators}
                            selectedOperator={selectedOperator}
                            onOperatorSelect={handleOperatorSelect}
                          />
                        </CardContent>
                      </Card>

                      {activeSession.parts && activeSession.parts.length > 0 && (
                        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
                          <CardHeader>
                            <CardTitle className="flex items-center text-slate-900 dark:text-white">
                              <Package className="h-5 w-5 mr-2" />
                              부품 선택
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <PartSelector
                              parts={activeSession.parts}
                              selectedPart={selectedPart}
                              onPartSelect={handlePartSelect}
                            />
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Timer */}
                  <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-center flex items-center justify-center text-slate-900 dark:text-white">
                        <Clock className="h-5 w-5 mr-2" />
                        정밀 타이머 (±0.01초)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TimerControls
                        currentTime={currentTime}
                        isRunning={isRunning}
                        isPaused={isPaused}
                        onStart={startTimer}
                        onPause={pauseTimer}
                        onStop={stopTimer}
                        onReset={resetTimer}
                        canStart={!!activeSession && (!activeSession.operators || selectedOperator !== "")}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Statistics and Data Section */}
            <div className="space-y-8">
              {/* Statistics */}
              {statistics && (
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-slate-900 dark:text-white">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      통계 분석
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StatisticsDisplay statistics={statistics} />
                  </CardContent>
                </Card>
              )}

              {/* Measurements List */}
              {measurements.length > 0 && (
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-slate-900 dark:text-white">
                      <Database className="h-5 w-5 mr-2" />
                      측정 기록 ({measurements.length}건)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MeasurementsList
                      measurements={measurements}
                      onDelete={handleDeleteMeasurement}
                      isDeleting={deleteMeasurementMutation.isPending}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-900 dark:text-white">
                    <Target className="h-5 w-5 mr-2" />
                    빠른 작업
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full justify-start" 
                    variant="ghost"
                    onClick={() => setShowHelp(true)}
                  >
                    <Info className="h-4 w-4 mr-2" />
                    사용 가이드
                  </Button>
                  
                  {activeSession && (
                    <>
                      <ExportDialog 
                        measurements={measurements} 
                        statistics={statistics}
                        sessionInfo={activeSession}
                        trigger={
                          <Button className="w-full justify-start" variant="ghost">
                            <Download className="h-4 w-4 mr-2" />
                            데이터 내보내기
                          </Button>
                        }
                      />
                      
                      <Button 
                        className="w-full justify-start" 
                        variant="ghost"
                        onClick={handleCompleteSession}
                        disabled={completeSessionMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        세션 완료
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}