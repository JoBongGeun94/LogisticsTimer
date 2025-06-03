import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatTime, getHighPrecisionTime } from "@/lib/timer-utils";
import { Link } from "wouter";
import { BarChart3, Download, Moon, Sun, Play, Pause, Square, RotateCcw, History } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface WorkSession {
  id: number;
  taskType: string;
  partNumber?: string;
  operatorName?: string;
  targetName?: string;
}

interface Measurement {
  id: number;
  timeInMs: number;
  timestamp: string;
  operatorName?: string;
  partName?: string;
}

export default function Timer() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [lastStartTime, setLastStartTime] = useState<number | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Fetch active work session
  const { data: activeSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ["/api/work-sessions/active"],
    retry: false,
  }) as { data: WorkSession | null; isLoading: boolean };

  // Fetch measurements for active session
  const { data: measurements = [], isLoading: isLoadingMeasurements } = useQuery({
    queryKey: ["/api/measurements/session", activeSession?.id],
    enabled: !!activeSession?.id,
    retry: false,
  }) as { data: Measurement[]; isLoading: boolean };

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
      console.error("Failed to create work session:", error);
      toast({
        title: "오류",
        description: "작업 세션 생성에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Save measurement mutation
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
      saveMeasurementMutation.mutate({
        timeInMs: Math.round(currentTime),
        operatorName: "Demo User",
        partName: activeSession?.partNumber || "Unknown"
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

  const handleStartSession = () => {
    createSessionMutation.mutate({
      taskType: "timing_measurement",
      partNumber: "PART-001"
    });
  };

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">LT</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">물류 타이머</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="text-slate-600 dark:text-slate-300"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Link href="/analysis">
                <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  분석
                </Button>
              </Link>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300">
                  <History className="h-4 w-4 mr-2" />
                  기록
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timer Card */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-center text-slate-900 dark:text-white">정밀 타이머</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timer Display */}
              <div className="text-center">
                <div className="text-6xl md:text-7xl font-mono font-bold text-slate-900 dark:text-white mb-4">
                  {formatTime(currentTime)}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  정확도: ±0.01초
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex justify-center space-x-4">
                {!isRunning && !isPaused && (
                  <Button
                    onClick={startTimer}
                    disabled={!activeSession}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-3"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    시작
                  </Button>
                )}
                
                {isRunning && (
                  <Button
                    onClick={pauseTimer}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    일시정지
                  </Button>
                )}
                
                {isPaused && (
                  <Button
                    onClick={startTimer}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-3"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    재개
                  </Button>
                )}
                
                {(isRunning || isPaused) && (
                  <>
                    <Button
                      onClick={stopTimer}
                      className="bg-red-500 hover:bg-red-600 text-white px-8 py-3"
                    >
                      <Square className="h-5 w-5 mr-2" />
                      정지
                    </Button>
                    <Button
                      onClick={resetTimer}
                      variant="outline"
                      className="px-8 py-3"
                    >
                      <RotateCcw className="h-5 w-5 mr-2" />
                      리셋
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Info Card */}
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">작업 세션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeSession ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    활성 작업 세션이 없습니다.
                  </p>
                  <Button
                    onClick={handleStartSession}
                    disabled={createSessionMutation.isPending}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    세션 시작
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">작업 유형</label>
                    <p className="text-slate-900 dark:text-white">{activeSession.taskType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">부품 번호</label>
                    <p className="text-slate-900 dark:text-white">{activeSession.partNumber || "미설정"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">측정 횟수</label>
                    <p className="text-slate-900 dark:text-white">{measurements.length}회</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Measurements History */}
        {measurements.length > 0 && (
          <Card className="mt-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">측정 기록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {measurements.map((measurement: Measurement, index: number) => (
                  <div
                    key={measurement.id}
                    className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                  >
                    <span className="font-medium text-slate-900 dark:text-white">
                      측정 #{measurements.length - index}
                    </span>
                    <span className="font-mono text-lg text-slate-900 dark:text-white">
                      {formatTime(measurement.timeInMs)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}