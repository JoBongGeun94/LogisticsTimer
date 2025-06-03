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
  const { user, isLoading } = useAuth() as { user: User | null; isLoading: boolean };
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  // SOLID Principle: Single Responsibility - 세션 상태 관리 분리
  const {
    activeSession,
    isSessionReady,
    isCreatingSession,
    canStartMeasurement,
    createSession,
    updateSession,
  } = useSessionState(user?.id);

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



  // 세션 생성 로직은 useSessionState 훅에서 처리

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
      // Force refresh measurements data
      queryClient.invalidateQueries({ queryKey: [`/api/measurements/session/${activeSession?.id}`] });
      refetchMeasurements();
      
      // Enhanced success feedback with next step guidance
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
      
      // Reset timer after successful measurement
      resetTimer();
      
      // Visual feedback: brief flash animation
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
          // Move to next part or operator
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

  // 세션 업데이트는 useSessionState에서 처리

  // Timer functions with error handling
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
    
    // Clear any existing interval to prevent memory leaks
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
        title: "측정 불가",
        description: "타이머를 시작한 후 측정해주세요.",
        variant: "destructive",
      });
      return;
    }

    if ((isRunning || isPaused) && currentTime > 0) {
      saveMeasurement();
      
      // Complete timer reset after measurement
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
    // Comprehensive validation before measurement
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

    if (currentTime > 3600000) { // 1시간 초과
      toast({
        title: "측정 시간 초과",
        description: "측정 시간이 너무 깁니다. 1시간을 초과할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    // Gage R&R mode validation
    if (activeSession.operators && activeSession.parts) {
      if (!selectedOperator || !selectedPart) {
        toast({
          title: "선택 항목 확인",
          description: !selectedOperator && !selectedPart ? 
            "GRR 모드에서는 측정자와 대상자를 모두 선택해야 합니다." :
            !selectedOperator ? "측정자를 선택해주세요." : "대상자를 선택해주세요.",
          variant: "destructive",
        });
        return;
      }
      
      const operator = activeSession.operators.find((op: any) => op.id === selectedOperator);
      const part = activeSession.parts.find((p: any) => p.id === selectedPart);
      
      if (!operator || !part) {
        toast({
          title: "데이터 오류",
          description: "선택된 측정자 또는 대상자 정보를 찾을 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      
      createMeasurementMutation.mutate({
        sessionId: activeSession.id,
        attemptNumber: measurements.length + 1,
        timeInMs: Math.round(currentTime), // 정수로 변환
        taskType: activeSession.taskType,
        partNumber: activeSession.partNumber || "",
        operatorName: operator.name,
        partId: selectedPart,
        partName: part.name,
        trialNumber: currentTrial,
      });
    } else {
      // Basic mode validation
      if (!activeSession.operatorName || activeSession.operatorName.trim() === '') {
        toast({
          title: "측정자 정보 필요",
          description: "현재 측정자 정보를 입력해주세요.",
          variant: "destructive",
        });
        return;
      }

      createMeasurementMutation.mutate({
        sessionId: activeSession.id,
        attemptNumber: measurements.length + 1,
        timeInMs: Math.round(currentTime),
        taskType: activeSession.taskType,
        partNumber: activeSession.partNumber || "",
        operatorName: activeSession.operatorName,
        partId: undefined,
        partName: activeSession.targetName || "",
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
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      
      if (error instanceof Error && isUnauthorizedError(error)) {
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

  // Keyboard shortcuts (after timer functions are defined)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        return;
      }

      // Prevent default only for our shortcuts
      switch (event.key.toLowerCase()) {
        case ' ': // Spacebar - Start/Pause
          event.preventDefault();
          if (activeSession) {
            if (!isRunning && !isPaused) {
              startTimer();
            } else if (isRunning) {
              pauseTimer();
            } else if (isPaused) {
              startTimer();
            }
          }
          break;
        case 'enter': // Enter - Record measurement (lap)
          event.preventDefault();
          if ((isRunning || isPaused) && activeSession) {
            lapTimer();
          }
          break;
        case 'escape': // Escape - Stop timer
          event.preventDefault();
          if ((isRunning || isPaused) && activeSession) {
            stopTimer();
          }
          break;
        case 'r': // R - Reset
          event.preventDefault();
          if (activeSession) {
            resetTimer();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, isPaused, activeSession]);

  const stats = calculateStatistics(measurements.map(m => m.timeInMs));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">측정 시스템 로딩 중</p>
            <div className="flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
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
            <Link href="/history">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-blue-700"
                title="작업 히스토리"
              >
                <History className="h-4 w-4" />
              </Button>
            </Link>
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
                      
                      {selectedOperator && selectedPart && (
                        <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            현재: {activeSession.operators.find(op => op.id === selectedOperator)?.name} × {activeSession.parts.find(part => part.id === selectedPart)?.name}
                          </div>
                          <div className="flex items-center space-x-2">
                            {Array.from({ length: activeSession.trialsPerOperator || 3 }).map((_, index) => {
                              const isCompleted = measurements.filter(m => 
                                m.operatorName === activeSession.operators?.find(op => op.id === selectedOperator)?.name &&
                                m.partName === activeSession.parts?.find(part => part.id === selectedPart)?.name
                              ).length > index;
                              return (
                                <div 
                                  key={index}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                    isCompleted 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500'
                                  }`}
                                >
                                  {index + 1}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                          측정 진행도
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">
                          {measurements.length}/10 (권장)
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3">
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
                      <div className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                        {measurements.length < 3 ? "분석을 위해 최소 3회 측정이 필요합니다" :
                         measurements.length < 10 ? "신뢰성 향상을 위해 10회 측정을 권장합니다" :
                         "통계적으로 신뢰할 수 있는 데이터입니다"}
                      </div>
                    </div>
                  )}
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
                  <Save className="h-4 w-4 text-orange-600" />
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
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">🎹 키보드 단축키</h4>
                <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                  <div className="flex justify-between">
                    <span>스페이스바</span>
                    <span>타이머 시작/일시정지</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enter</span>
                    <span>측정 기록</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Esc</span>
                    <span>타이머 정지</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R</span>
                    <span>타이머 리셋</span>
                  </div>
                </div>
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
