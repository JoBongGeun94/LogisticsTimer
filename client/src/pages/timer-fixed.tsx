import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSessionState } from "@/hooks/useSessionState";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { formatTime, calculateStatistics, getHighPrecisionTime, validateMeasurementAccuracy } from "@/lib/timer-utils";
import { TimerAutoStopService } from "@/lib/TimerAutoStopService";
import { SessionDisplayService } from "@/lib/SessionDisplayService";
import { MeasurementHistory } from "@/components/MeasurementHistory";
import { Link } from "wouter";
import { BarChart3, Download, LogOut, Moon, Sun, Play, Pause, Square, RotateCcw, Save, Clock, Users, Target } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import * as XLSX from 'xlsx';

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

export default function TimerPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // Timer state
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Session state
  const { 
    activeSession, 
    isSessionReady, 
    isSessionLoading, 
    isCreatingSession, 
    isUpdatingSession,
    createSession, 
    updateSession, 
    refetchSession,
    hasActiveSession 
  } = useSessionState();
  
  // Form state
  const [taskType, setTaskType] = useState<string>("material_inspection");
  const [partNumber, setPartNumber] = useState<string>("저장-000-001");
  const [operatorName, setOperatorName] = useState<string>("");
  const [targetName, setTargetName] = useState<string>("");
  
  // GRR Mode state
  const [operators, setOperators] = useState<Array<{id: string, name: string}>>([]);
  const [parts, setParts] = useState<Array<{id: string, name: string}>>([]);
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [selectedPart, setSelectedPart] = useState<string>("");
  const [trialsPerOperator, setTrialsPerOperator] = useState<number>(3);
  
  // UI state
  const [showStatistics, setShowStatistics] = useState(false);
  const [showOperatorDialog, setShowOperatorDialog] = useState(false);
  const [showTargetDialog, setShowTargetDialog] = useState(false);
  const [newOperatorName, setNewOperatorName] = useState("");
  const [newTargetName, setNewTargetName] = useState("");

  const isGRRMode = taskType === "gage-rr";
  
  // Fetch measurements for current session
  const { data: measurements = [] } = useQuery({
    queryKey: ['/api/measurements/session', activeSession?.id],
    enabled: !!activeSession?.id,
  });

  // Create measurement mutation
  const createMeasurementMutation = useMutation({
    mutationFn: async (measurementData: any) => {
      return await apiRequest('/api/measurements', {
        method: 'POST',
        body: measurementData
      });
    },
    onSuccess: (data, variables) => {
      const measurementCount = measurements.length + 1;
      const totalRequired = isGRRMode 
        ? (operators.length * parts.length * trialsPerOperator)
        : 1;
      
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
      
      // Auto-stop timer after successful measurement recording
      const autoStopService = TimerAutoStopService.getInstance();
      autoStopService.stopTimerAfterMeasurement(stopTimer, isRunning, () => {
        autoStopService.provideVisualFeedback();
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
      
      console.error('Measurement creation error:', error);
      toast({
        title: "측정 기록 실패",
        description: "측정 데이터를 저장하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Timer functions
  const startTimer = () => {
    const now = getHighPrecisionTime();
    startTimeRef.current = now;
    setIsRunning(true);
    setIsPaused(false);
    
    intervalRef.current = setInterval(() => {
      const elapsed = getHighPrecisionTime() - (startTimeRef.current || 0);
      setCurrentTime(elapsed);
    }, 10);
  };

  const pauseTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(true);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
  };

  const resetTimer = () => {
    stopTimer();
    setCurrentTime(0);
    startTimeRef.current = null;
  };

  const recordMeasurement = () => {
    if (!activeSession) {
      toast({
        title: "세션 없음",
        description: "먼저 작업 세션을 생성해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (currentTime === 0) {
      toast({
        title: "측정값 없음",
        description: "타이머를 시작하고 측정해주세요.",
        variant: "destructive",
      });
      return;
    }

    const currentOperatorName = isGRRMode 
      ? operators.find(op => op.id === selectedOperator)?.name || ""
      : activeSession.operatorName || operatorName;
    
    const currentPartName = isGRRMode 
      ? parts.find(p => p.id === selectedPart)?.name || ""
      : activeSession.targetName || targetName;

    const measurementData = {
      sessionId: activeSession.id,
      attemptNumber: measurements.length + 1,
      timeInMs: currentTime,
      taskType: activeSession.taskType,
      partNumber: activeSession.partNumber,
      operatorName: currentOperatorName,
      partId: selectedPart || null,
      partName: currentPartName,
      trialNumber: isGRRMode ? getCurrentTrialNumber() : null,
    };

    createMeasurementMutation.mutate(measurementData);
  };

  const getCurrentTrialNumber = () => {
    if (!isGRRMode || !selectedOperator || !selectedPart) return 1;
    
    const sameCombinationMeasurements = measurements.filter(m => 
      m.operatorName === operators.find(op => op.id === selectedOperator)?.name &&
      m.partName === parts.find(p => p.id === selectedPart)?.name
    );
    
    return sameCombinationMeasurements.length + 1;
  };

  // Session creation functions
  const handleCreateSession = () => {
    if (isGRRMode) {
      if (operators.length === 0 || parts.length === 0) {
        toast({
          title: "필수 정보 누락",
          description: "Gage R&R 모드에서는 최소 1명의 측정자와 1개의 부품이 필요합니다.",
          variant: "destructive",
        });
        return;
      }
      
      const sessionData = {
        taskType,
        partNumber,
        operatorName: operators[0]?.name || "",
        targetName: "Gage R&R 분석",
        operators,
        parts,
        trialsPerOperator,
      };
      
      createSession(sessionData);
      setSelectedOperator(operators[0]?.id || "");
      setSelectedPart(parts[0]?.id || "");
    } else {
      if (!operatorName.trim() || !targetName.trim()) {
        toast({
          title: "필수 정보 누락",
          description: "측정자와 대상자 정보를 입력해주세요.",
          variant: "destructive",
        });
        return;
      }
      
      const sessionData = {
        taskType,
        partNumber,
        operatorName: operatorName.trim(),
        targetName: targetName.trim(),
      };
      
      createSession(sessionData);
    }
  };

  const addOperator = () => {
    if (!newOperatorName.trim()) return;
    
    const newOperator = {
      id: `op_${Date.now()}`,
      name: newOperatorName.trim()
    };
    
    setOperators(prev => [...prev, newOperator]);
    setNewOperatorName("");
    setShowOperatorDialog(false);
    
    toast({
      title: "측정자 추가됨",
      description: `${newOperator.name}이(가) 추가되었습니다.`,
    });
  };

  const addPart = () => {
    if (!newTargetName.trim()) return;
    
    const newPart = {
      id: `part_${Date.now()}`,
      name: newTargetName.trim()
    };
    
    setParts(prev => [...prev, newPart]);
    setNewTargetName("");
    setShowTargetDialog(false);
    
    toast({
      title: "부품 추가됨",
      description: `${newPart.name}이(가) 추가되었습니다.`,
    });
  };

  // Excel export function
  const exportToExcel = () => {
    if (measurements.length === 0) {
      toast({
        title: "데이터 없음",
        description: "내보낼 측정 데이터가 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const excelData = measurements.map((measurement, index) => ({
      '시도번호': measurement.attemptNumber,
      '측정시간(초)': (measurement.timeInMs / 1000).toFixed(3),
      '측정자': measurement.operatorName || '',
      '대상/부품': measurement.partName || measurement.partNumber || '',
      '작업유형': measurement.taskType,
      '측정일시': new Date(measurement.createdAt).toLocaleString('ko-KR'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '측정데이터');

    const fileName = `측정데이터_${activeSession?.partNumber || 'session'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Excel 내보내기 완료",
      description: `${fileName} 파일이 다운로드되었습니다.`,
    });
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Session display service
  const sessionDisplayService = activeSession ? new SessionDisplayService(activeSession) : null;
  const sessionInfo = activeSession && sessionDisplayService ? sessionDisplayService.getSessionInfo(activeSession) : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">공군 종합보급창</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">ID: {user?.id || 'AF-001'}</p>
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
        {/* Session Information */}
        {activeSession && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                활성 세션
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="whitespace-pre-line text-sm font-medium text-blue-900 dark:text-blue-100">
                  {sessionInfo}
                </div>
                
                {/* Operator and Part Selection for GRR Mode */}
                {isGRRMode && activeSession.operators && activeSession.parts && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="operator-select" className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        현재 측정자
                      </Label>
                      <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="측정자 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeSession.operators.map((operator: any) => (
                            <SelectItem key={operator.id} value={operator.id}>
                              {operator.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="part-select" className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        현재 부품
                      </Label>
                      <Select value={selectedPart} onValueChange={setSelectedPart}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="부품 선택" />
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
                  </div>
                )}
                
                {/* Basic Mode Operator/Target Display */}
                {!isGRRMode && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">측정자</div>
                        <div className="font-medium">{activeSession.operatorName}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOperatorDialog(true)}
                      >
                        변경
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">대상</div>
                        <div className="font-medium">{activeSession.targetName}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTargetDialog(true)}
                      >
                        변경
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Creation Form */}
        {!hasActiveSession && (
          <Card>
            <CardHeader>
              <CardTitle>새 작업 세션 생성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="task-type">작업 유형</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic_timing">기본 작업시간 측정</SelectItem>
                    <SelectItem value="material_inspection">물자검수팀</SelectItem>
                    <SelectItem value="assembly_line">조립라인 작업</SelectItem>
                    <SelectItem value="quality_control">품질관리</SelectItem>
                    <SelectItem value="maintenance">정비작업</SelectItem>
                    <SelectItem value="packaging">포장작업</SelectItem>
                    <SelectItem value="gage-rr">Gage R&R 분석</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="part-number">공정세부번호</Label>
                <Input
                  id="part-number"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="예: 저장-000-001"
                />
              </div>

              {!isGRRMode ? (
                <>
                  <div>
                    <Label htmlFor="operator-name">측정자</Label>
                    <Input
                      id="operator-name"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      placeholder="측정자 이름을 입력하세요"
                    />
                  </div>

                  <div>
                    <Label htmlFor="target-name">대상자</Label>
                    <Input
                      id="target-name"
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                      placeholder="측정 대상을 입력하세요"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>측정자 ({operators.length}명)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {operators.map(operator => (
                        <div key={operator.id} className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full text-sm">
                          {operator.name}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOperatorDialog(true)}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        추가
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>부품 ({parts.length}개)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {parts.map(part => (
                        <div key={part.id} className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full text-sm">
                          {part.name}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTargetDialog(true)}
                      >
                        <Target className="h-4 w-4 mr-1" />
                        추가
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="trials-per-operator">측정자당 반복 횟수</Label>
                    <Select value={trialsPerOperator.toString()} onValueChange={(value) => setTrialsPerOperator(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2회</SelectItem>
                        <SelectItem value="3">3회</SelectItem>
                        <SelectItem value="5">5회</SelectItem>
                        <SelectItem value="10">10회</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Button 
                onClick={handleCreateSession}
                disabled={isCreatingSession}
                className="w-full"
              >
                {isCreatingSession ? "세션 생성 중..." : "세션 시작"}
              </Button>
            </CardContent>
          </Card>
        )}

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
              <div className="flex justify-center space-x-3">
                {!isRunning && !isPaused && (
                  <Button onClick={startTimer} size="lg" className="bg-green-600 hover:bg-green-700">
                    <Play className="h-5 w-5 mr-2" />
                    시작
                  </Button>
                )}
                
                {isRunning && (
                  <Button onClick={pauseTimer} size="lg" variant="outline">
                    <Pause className="h-5 w-5 mr-2" />
                    일시정지
                  </Button>
                )}
                
                {(isRunning || isPaused) && (
                  <>
                    <Button onClick={stopTimer} size="lg" variant="outline">
                      <Square className="h-5 w-5 mr-2" />
                      정지
                    </Button>
                    
                    <Button onClick={recordMeasurement} size="lg" className="bg-blue-600 hover:bg-blue-700">
                      <Save className="h-5 w-5 mr-2" />
                      기록
                    </Button>
                  </>
                )}
                
                <Button onClick={resetTimer} size="lg" variant="outline">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  리셋
                </Button>
              </div>

              {/* Export Functions */}
              {measurements.length > 0 && (
                <div className="flex justify-center space-x-3">
                  <Button onClick={exportToExcel} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Excel 내보내기
                  </Button>
                  
                  <Button onClick={() => setShowStatistics(true)} variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    통계 보기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Measurement History */}
        {measurements.length > 0 && (
          <MeasurementHistory 
            measurements={measurements.slice(-10)} 
            title="최근 측정 기록"
          />
        )}
      </main>

      {/* Add Operator Dialog */}
      <Dialog open={showOperatorDialog} onOpenChange={setShowOperatorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>측정자 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-operator">측정자 이름</Label>
              <Input
                id="new-operator"
                value={newOperatorName}
                onChange={(e) => setNewOperatorName(e.target.value)}
                placeholder="측정자 이름을 입력하세요"
                onKeyPress={(e) => e.key === 'Enter' && addOperator()}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={addOperator} disabled={!newOperatorName.trim()}>
                추가
              </Button>
              <Button variant="outline" onClick={() => setShowOperatorDialog(false)}>
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Target/Part Dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isGRRMode ? "부품 추가" : "대상 변경"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-target">{isGRRMode ? "부품명" : "대상명"}</Label>
              <Input
                id="new-target"
                value={newTargetName}
                onChange={(e) => setNewTargetName(e.target.value)}
                placeholder={isGRRMode ? "부품명을 입력하세요" : "대상명을 입력하세요"}
                onKeyPress={(e) => e.key === 'Enter' && addPart()}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={addPart} disabled={!newTargetName.trim()}>
                {isGRRMode ? "추가" : "변경"}
              </Button>
              <Button variant="outline" onClick={() => setShowTargetDialog(false)}>
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Statistics Dialog */}
      <Dialog open={showStatistics} onOpenChange={setShowStatistics}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>측정 통계</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const stats = calculateStatistics(measurements.map(m => m.timeInMs));
              return stats.average !== null ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 dark:text-blue-400">평균</div>
                    <div className="text-2xl font-bold">{formatTime(stats.average)}</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="text-sm text-green-600 dark:text-green-400">최소</div>
                    <div className="text-2xl font-bold">{formatTime(stats.min || 0)}</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <div className="text-sm text-red-600 dark:text-red-400">최대</div>
                    <div className="text-2xl font-bold">{formatTime(stats.max || 0)}</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <div className="text-sm text-purple-600 dark:text-purple-400">표준편차</div>
                    <div className="text-2xl font-bold">{formatTime(stats.standardDeviation || 0)}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">측정 데이터가 충분하지 않습니다.</div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}