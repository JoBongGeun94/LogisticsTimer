import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { formatTime, calculateStatistics } from "@/lib/timer-utils";
import { MeasurementForm } from "@/components/measurement-form";
import { TimerControls } from "@/components/timer-controls";
import { LapHistory } from "@/components/lap-history";
import { Link } from "wouter";
import { BarChart3, Download, LogOut, Moon, Sun, Settings, HelpCircle, Play, Pause, Flag } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function Timer() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Redirect to login if unauthorized
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

  // Fetch active work session
  const { data: activeSession } = useQuery({
    queryKey: ["/api/work-sessions/active"],
    enabled: !!user,
    retry: false,
  });

  // Fetch measurements for active session
  const { data: measurements = [], refetch: refetchMeasurements } = useQuery({
    queryKey: ["/api/measurements/session", activeSession?.id],
    enabled: !!activeSession?.id,
    retry: false,
  });

  // Create work session mutation
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
        description: "작업 세션을 시작할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  // Create measurement mutation
  const createMeasurementMutation = useMutation({
    mutationFn: async (measurementData: {
      sessionId: number;
      attemptNumber: number;
      timeInMs: number;
      taskType: string;
      partNumber?: string;
    }) => {
      const response = await apiRequest("POST", "/api/measurements", measurementData);
      return response.json();
    },
    onSuccess: () => {
      refetchMeasurements();
      toast({
        title: "측정 기록",
        description: `${measurements.length + 1}번째 측정이 기록되었습니다.`,
      });
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
    if (!isRunning) {
      const now = Date.now();
      setStartTime(now);
      setIsRunning(true);
      
      const id = setInterval(() => {
        setCurrentTime(Date.now() - now);
      }, 10);
      setIntervalId(id);

      toast({
        title: "측정 시작",
        description: "타이머가 시작되었습니다.",
      });
    }
  };

  const stopTimer = () => {
    if (isRunning && intervalId) {
      setIsRunning(false);
      clearInterval(intervalId);
      setIntervalId(null);
      
      // Save measurement if there's an active session
      if (activeSession && currentTime > 0) {
        saveMeasurement();
      }

      toast({
        title: "측정 완료",
        description: "타이머가 정지되었습니다.",
      });
    }
  };

  const lapTimer = () => {
    if (isRunning && activeSession && currentTime > 0) {
      saveMeasurement();
      // Reset current time for next measurement
      setCurrentTime(0);
      const now = Date.now();
      setStartTime(now);
    }
  };

  const resetTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    setIsRunning(false);
    setCurrentTime(0);
    setStartTime(null);
    setIntervalId(null);
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

    createMeasurementMutation.mutate({
      sessionId: activeSession.id,
      attemptNumber: measurements.length + 1,
      timeInMs: currentTime,
      taskType: activeSession.taskType,
      partNumber: activeSession.partNumber || "",
    });
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
      const response = await apiRequest("POST", "/api/export/excel", {
        sessionId: activeSession.id,
      });
      const data = await response.json();
      
      // In a real implementation, this would trigger file download
      console.log("Export data:", data);
      
      toast({
        title: "데이터 내보내기",
        description: "Excel 파일이 생성되었습니다.",
      });
    } catch (error) {
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
        description: "데이터를 내보낼 수 없습니다.",
        variant: "destructive",
      });
    }
  };

  const stats = calculateStatistics(measurements.map(m => m.timeInMs));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 min-h-screen">
        {/* Header */}
        <header className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">
                {user.firstName?.charAt(0) || user.workerId?.charAt(0) || "U"}
              </span>
            </div>
            <div>
              <div className="font-medium">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user.workerId || "사용자"}
              </div>
              <div className="text-blue-200 text-sm">
                ID: {user.workerId || user.id}
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(true)}
              className="text-white hover:bg-blue-700"
              title="도움말"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="text-white hover:bg-blue-700"
              title="테마 변경"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white hover:bg-blue-700"
              title="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 space-y-4">
          {/* Measurement Form */}
          <MeasurementForm
            onSessionCreate={(sessionData) => createSessionMutation.mutate(sessionData)}
            activeSession={activeSession}
            isLoading={createSessionMutation.isPending}
          />

          {/* Timer Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2 text-blue-600" />
                타이머
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {/* Timer Display */}
              <div className="relative">
                <div className="text-6xl font-mono font-light text-gray-800 dark:text-gray-200 mb-2">
                  {formatTime(currentTime)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
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
                onStart={startTimer}
                onStop={stopTimer}
                onLap={lapTimer}
                onReset={resetTimer}
                disabled={!activeSession}
              />

              {/* Timer Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-medium text-green-500">
                    {measurements.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">총 측정</div>
                </div>
                <div>
                  <div className="text-2xl font-medium text-blue-600">
                    {stats.average ? formatTime(stats.average) : "--"}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">평균 시간</div>
                </div>
                <div>
                  <div className="text-2xl font-medium text-orange-500">
                    {stats.min ? formatTime(stats.min) : "--"}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">최단 시간</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lap History */}
          <LapHistory
            measurements={measurements}
            onDelete={(id) => {
              // Handle delete measurement
              console.log("Delete measurement:", id);
            }}
          />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/analysis">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2"
                disabled={measurements.length < 3}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Gage R&R 분석</span>
              </Button>
            </Link>
            
            <Button 
              onClick={handleExport}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2"
              disabled={measurements.length === 0}
            >
              <Download className="h-4 w-4" />
              <span>데이터 내보내기</span>
            </Button>
          </div>
        </main>

        {/* Help Dialog */}
        <Dialog open={showHelp} onOpenChange={setShowHelp}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                사용법 도움말
              </DialogTitle>
              <DialogDescription>
                물류 작업 측정 타이머 사용 방법을 안내해드립니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Play className="h-4 w-4 text-green-600" />
                  1. 작업 시작하기
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  작업 유형을 선택하고 부품번호를 입력한 후 "세션 시작" 버튼을 눌러주세요.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Pause className="h-4 w-4 text-blue-600" />
                  2. 타이머 사용하기
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  "시작" 버튼으로 타이머를 시작하고, 작업이 끝나면 "중지" 버튼을 눌러주세요.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Flag className="h-4 w-4 text-orange-600" />
                  3. 측정 기록하기
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  타이머가 실행 중일 때 깃발 버튼을 누르면 현재 시간이 측정값으로 기록되고 타이머가 리셋됩니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">4. 작업 변경하기</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  현재 활성 세션에서 "작업 변경" 버튼을 눌러 새로운 작업을 선택할 수 있습니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">5. 분석 및 내보내기</h4>
                <p className="text-gray-600 dark:text-gray-400">
                  측정이 완료되면 "Gage R&R 분석"에서 통계 분석 결과를 확인하고 Excel로 내보낼 수 있습니다.
                </p>
              </div>
            </div>
            <div className="pt-4">
              <Button onClick={() => setShowHelp(false)} className="w-full">
                확인
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
