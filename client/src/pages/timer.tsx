import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { formatTime, calculateStatistics, getHighPrecisionTime, validateMeasurementAccuracy } from "@/lib/timer-utils";
import { MeasurementForm } from "@/components/measurement-form";
import { TimerControls } from "@/components/timer-controls";
import { LapHistory } from "@/components/lap-history";
import { Link } from "wouter";
import { BarChart3, Download, LogOut, Moon, Sun, Settings, HelpCircle, Play, Pause, Flag, RotateCcw, Users } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Timer() {
  const { user, isLoading } = useAuth();
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
  const [currentTrial, setCurrentTrial] = useState(1);

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
    queryKey: [`/api/measurements/session/${activeSession?.id}`],
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
      // Force refresh measurements data
      queryClient.invalidateQueries({ queryKey: [`/api/measurements/session/${activeSession?.id}`] });
      refetchMeasurements();
      toast({
        title: "측정 기록",
        description: `${Array.isArray(measurements) ? measurements.length + 1 : 1}번째 측정이 기록되었습니다.`,
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

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (updateData: {
      operatorName?: string;
      targetName?: string;
    }) => {
      const response = await apiRequest("PUT", `/api/work-sessions/${activeSession?.id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      // Force refresh session data
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions/active"] });
      toast({
        title: "정보 업데이트",
        description: "측정자 정보가 업데이트되었습니다.",
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
        description: "정보를 업데이트할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  // Timer functions
  const startTimer = () => {
    const now = Date.now();
    
    if (!isRunning && !isPaused) {
      // Starting fresh
      setAccumulatedTime(0);
      setCurrentTime(0);
    }
    
    setLastStartTime(now);
    setIsRunning(true);
    setIsPaused(false);
    
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
    if (isRunning && intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      setIsRunning(false);
      setIsPaused(true);
      setAccumulatedTime(currentTime);
      
      toast({
        title: "타이머 일시정지",
        description: "재시작 버튼을 눌러 계속하거나 깃발 버튼으로 측정하세요.",
      });
    }
  };

  const stopTimer = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setIsRunning(false);
    setIsPaused(false);
    setCurrentTime(0);
    setAccumulatedTime(0);
    setLastStartTime(null);
    
    toast({
      title: "타이머 정지",
      description: "타이머가 초기화되었습니다.",
    });
  };

  const lapTimer = () => {
    if ((isRunning || isPaused) && activeSession && currentTime > 0) {
      saveMeasurement();
      
      // Stop the timer completely (like pressing stop button)
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      setIsRunning(false);
      setIsPaused(false);
      setCurrentTime(0);
      setAccumulatedTime(0);
      setLastStartTime(null);
    }
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

  const saveMeasurement = () => {
    if (!activeSession) {
      toast({
        title: "세션 필요",
        description: "먼저 작업 정보를 설정해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Check if Gage R&R mode requires operator and part selection
    if (activeSession.operators && activeSession.parts) {
      if (!selectedOperator || !selectedPart) {
        toast({
          title: "선택 필요",
          description: "측정자와 부품을 선택해주세요.",
          variant: "destructive",
        });
        return;
      }
      
      // Get operator name from selected operator
      const operator = activeSession.operators.find((op: any) => op.id === selectedOperator);
      const part = activeSession.parts.find((p: any) => p.id === selectedPart);
      
      createMeasurementMutation.mutate({
        sessionId: activeSession.id,
        attemptNumber: measurements.length + 1,
        timeInMs: currentTime,
        taskType: activeSession.taskType,
        partNumber: activeSession.partNumber || "",
        operatorName: operator?.name || "",
        partId: selectedPart,
        trialNumber: currentTrial,
      });
    } else {
      // Basic mode - single operator
      createMeasurementMutation.mutate({
        sessionId: activeSession.id,
        attemptNumber: measurements.length + 1,
        timeInMs: currentTime,
        taskType: activeSession.taskType,
        partNumber: activeSession.partNumber || "",
        operatorName: activeSession.operatorName || "",
        partId: null,
        trialNumber: 1,
      });
    }
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
      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile, use window.location to force download with simple mode
        const downloadUrl = `/api/export/excel/${activeSession.id}/download?simple=true`;
        
        // Try multiple methods for mobile compatibility
        try {
          // Method 1: Direct window.location assignment
          window.location.href = downloadUrl;
          
          toast({
            title: "Excel 파일 다운로드 시작",
            description: "파일 다운로드가 시작됩니다. 브라우저의 다운로드 알림을 확인해주세요.",
          });
        } catch (error) {
          // Method 2: Open in new window as fallback
          const newWindow = window.open(downloadUrl, '_blank');
          if (newWindow) {
            toast({
              title: "Excel 파일 다운로드",
              description: "새 창에서 파일이 다운로드됩니다.",
            });
          } else {
            toast({
              title: "다운로드 차단됨",
              description: "팝업 차단을 해제하고 다시 시도해주세요.",
              variant: "destructive",
            });
          }
        }
      } else {
        // Desktop: Try to use File System Access API for save location choice
        if ('showSaveFilePicker' in window) {
          try {
            // Generate filename
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
            
            const teamNames: { [key: string]: string } = {
              'material_inspection': '물자검수팀',
              'storage_management': '저장관리팀',
              'packaging_management': '포장관리팀',
            };
            
            const taskTypeName = teamNames[activeSession.taskType] || activeSession.taskType;
            const suggestedName = `${taskTypeName} ${activeSession.partNumber || '측정'} 결과(${timestamp}).xlsx`;
            
            // Show save dialog
            const fileHandle = await (window as any).showSaveFilePicker({
              suggestedName: suggestedName,
              types: [
                {
                  description: 'Excel 파일',
                  accept: {
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                  },
                },
              ],
            });
            
            // Get file data from server with simple mode
            const downloadUrl = `/api/export/excel/${activeSession.id}/download?simple=true`;
            const response = await fetch(downloadUrl);
            const excelBuffer = await response.arrayBuffer();
            
            // Write file to chosen location
            const writable = await fileHandle.createWritable();
            await writable.write(excelBuffer);
            await writable.close();
            
            toast({
              title: "Excel 파일 저장 완료",
              description: `파일이 "${fileHandle.name}"로 저장되었습니다.`,
            });
            
          } catch (error: any) {
            if (error.name === 'AbortError') {
              toast({
                title: "저장 취소",
                description: "파일 저장이 취소되었습니다.",
              });
            } else {
              // Fallback to regular download
              const downloadUrl = `/api/export/excel/${activeSession.id}/download?simple=true`;
              window.open(downloadUrl, '_blank');
              
              toast({
                title: "Excel 파일 다운로드",
                description: "Excel 파일이 기본 다운로드 폴더에 저장됩니다.",
              });
            }
          }
        } else {
          // Fallback for older browsers
          const downloadUrl = `/api/export/excel/${activeSession.id}/download?simple=true`;
          window.open(downloadUrl, '_blank');
          
          toast({
            title: "Excel 파일 다운로드",
            description: "Excel 파일이 기본 다운로드 폴더에 저장됩니다.",
          });
        }
      }
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
      console.error('Download error:', error);
      toast({
        title: "다운로드 오류",
        description: "Excel 파일 다운로드에 실패했습니다.",
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
              <HelpCircle className="h-4 w-4" />
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
            onOperatorChange={(operatorName) => updateSessionMutation.mutate({ operatorName })}
            onTargetChange={(targetName) => updateSessionMutation.mutate({ targetName })}
          />

          {/* Gage R&R Selection - only show if active session has multiple operators/parts */}
          {activeSession && activeSession.operators && activeSession.parts && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-600" />
                  Gage R&R 측정 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">현재 측정자</Label>
                  <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="측정자를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSession.operators.map((op: any) => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">현재 대상자</Label>
                  <Select value={selectedPart} onValueChange={setSelectedPart}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="대상자를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSession.parts.map((part: any) => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-gray-500">
                  시행 {currentTrial}/{activeSession.trialsPerOperator || 3}
                </div>
              </CardContent>
            </Card>
          )}

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
                isPaused={isPaused}
                onStart={startTimer}
                onPause={pauseTimer}
                onStop={stopTimer}
                onLap={lapTimer}
                onReset={resetTimer}
                disabled={!activeSession}
              />

              {/* Measurement Progress */}
              {measurements.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      측정 진행도
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {measurements.length}/10 (권장)
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (measurements.length / 10) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                    {measurements.length < 3 ? "분석을 위해 최소 3회 측정이 필요합니다" :
                     measurements.length < 10 ? "신뢰성 향상을 위해 10회 측정을 권장합니다" :
                     "통계적으로 신뢰할 수 있는 데이터입니다"}
                  </div>
                </div>
              )}

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
            measurements={Array.isArray(measurements) ? measurements : []}
            onDelete={async (id) => {
              try {
                await apiRequest('DELETE', `/api/measurements/${id}`);
                queryClient.invalidateQueries({ queryKey: [`/api/measurements/session/${activeSession?.id}`] });
                refetchMeasurements();
                toast({
                  title: "측정값 삭제",
                  description: "선택한 측정값이 삭제되었습니다.",
                });
              } catch (error) {
                toast({
                  title: "삭제 실패",
                  description: "측정값을 삭제할 수 없습니다.",
                  variant: "destructive",
                });
              }
            }}
          />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/analysis">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2"
                disabled={!Array.isArray(measurements) || measurements.length < 3}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Gage R&R 분석</span>
              </Button>
            </Link>
            
            <Button 
              onClick={handleExport}
              variant="outline"
              className="w-full flex items-center justify-center space-x-2"
              disabled={!Array.isArray(measurements) || measurements.length === 0}
            >
              <Download className="h-4 w-4" />
              <span>Excel로 내보내기</span>
            </Button>
            
            <Button 
              onClick={async () => {
                if (!activeSession) return;
                
                try {
                  // Delete all measurements for this session
                  if (Array.isArray(measurements)) {
                    for (const measurement of measurements) {
                      await apiRequest('DELETE', `/api/measurements/${measurement.id}`);
                    }
                  }
                  
                  queryClient.invalidateQueries({ queryKey: [`/api/measurements/session/${activeSession.id}`] });
                  refetchMeasurements();
                  
                  // Reset timer state
                  if (intervalId) {
                    clearInterval(intervalId);
                    setIntervalId(null);
                  }
                  setIsRunning(false);
                  setIsPaused(false);
                  setCurrentTime(0);
                  setAccumulatedTime(0);
                  setLastStartTime(null);
                  
                  toast({
                    title: "전체 초기화 완료",
                    description: "모든 측정 기록이 삭제되고 타이머가 초기화되었습니다.",
                  });
                } catch (error) {
                  toast({
                    title: "초기화 실패",
                    description: "측정 기록을 삭제할 수 없습니다.",
                    variant: "destructive",
                  });
                }
              }}
              variant="destructive"
              className="w-full flex items-center justify-center space-x-2"
              disabled={!Array.isArray(measurements) || measurements.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
              <span>전체 초기화</span>
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
