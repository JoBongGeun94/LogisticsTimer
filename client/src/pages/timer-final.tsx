import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatTime, calculateStatistics, getHighPrecisionTime } from "@/lib/timer-utils";
import { useTheme } from "@/components/theme-provider";
import { 
  Play, Pause, Square, RotateCcw, 
  Settings, Download, BarChart3, Clock, 
  Users, Package, FileText, Moon, Sun,
  Plus, Trash2, CheckCircle, Info,
  Timer as TimerIcon, Target, Database
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

export default function Timer() {
  // Mock user for demo (no authentication)
  const user = { id: "demo-user", email: "demo@example.com", firstName: "Demo", lastName: "User" };
  const isLoading = false;

  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  // Timer state
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [lastStartTime, setLastStartTime] = useState<number | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Session state
  const [selectedOperator, setSelectedOperator] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);

  // Session form state
  const [taskType, setTaskType] = useState("timing_measurement");
  const [partNumber, setPartNumber] = useState("");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [newOperatorName, setNewOperatorName] = useState("");
  const [newPartName, setNewPartName] = useState("");

  // Fetch active work session
  const { data: activeSession } = useQuery({
    queryKey: ["/api/work-sessions/active"],
    retry: false,
  });

  // Fetch measurements for active session
  const { data: measurements = [] } = useQuery({
    queryKey: ["/api/measurements/session", (activeSession as any)?.id],
    enabled: !!(activeSession as any)?.id,
    retry: false,
  });

  // Session mutations
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: { taskType: string; partNumber?: string; operators?: Operator[]; parts?: Part[] }) => {
      const response = await apiRequest("POST", "/api/work-sessions", sessionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions/active"] });
      setShowSessionForm(false);
      toast({
        title: "작업 세션 시작",
        description: "새로운 작업 세션이 시작되었습니다.",
      });
    },
    onError: () => {
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
      toast({
        title: "세션 완료",
        description: "작업 세션이 완료되었습니다.",
      });
    },
  });

  // Measurement mutations
  const saveMeasurementMutation = useMutation({
    mutationFn: async (measurementData: { timeInMs: number; operatorName?: string; partName?: string }) => {
      if (!(activeSession as any)?.id) throw new Error("No active session");
      const response = await apiRequest("POST", `/api/measurements/session/${(activeSession as any).id}`, measurementData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements/session", (activeSession as any)?.id] });
      toast({
        title: "측정 저장됨",
        description: "측정 결과가 저장되었습니다.",
      });
    },
  });

  const deleteMeasurementMutation = useMutation({
    mutationFn: async (measurementId: number) => {
      const response = await apiRequest("DELETE", `/api/measurements/${measurementId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/measurements/session", (activeSession as any)?.id] });
      toast({
        title: "측정 삭제됨",
        description: "측정 결과가 삭제되었습니다.",
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
        (activeSession as any)?.operators?.find((op: any) => op.id === selectedOperator)?.name : 
        "Demo User";
      const partName = selectedPart ? 
        (activeSession as any)?.parts?.find((part: any) => part.id === selectedPart)?.name : 
        (activeSession as any)?.partNumber || "Unknown Part";

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

  // Session form functions
  const addOperator = () => {
    if (newOperatorName.trim()) {
      const newOperator: Operator = {
        id: `op-${Date.now()}`,
        name: newOperatorName.trim()
      };
      setOperators([...operators, newOperator]);
      setNewOperatorName("");
    }
  };

  const removeOperator = (id: string) => {
    setOperators(operators.filter(op => op.id !== id));
  };

  const addPart = () => {
    if (newPartName.trim()) {
      const newPart: Part = {
        id: `part-${Date.now()}`,
        name: newPartName.trim()
      };
      setParts([...parts, newPart]);
      setNewPartName("");
    }
  };

  const removePart = (id: string) => {
    setParts(parts.filter(part => part.id !== id));
  };

  const handleStartSession = () => {
    createSessionMutation.mutate({
      taskType,
      partNumber: partNumber || undefined,
      operators: operators.length > 0 ? operators : undefined,
      parts: parts.length > 0 ? parts : undefined
    });
  };

  const handleCompleteSession = () => {
    if ((activeSession as any)?.id) {
      completeSessionMutation.mutate((activeSession as any).id);
    }
  };

  // Statistics calculation
  const statistics = (measurements as any[]).length > 0 ? calculateStatistics(measurements as any[]) : null;

  // Clean up interval on unmount
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
                className="text-slate-600 dark:text-slate-300"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
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
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>작업 유형</Label>
                          <Select value={taskType} onValueChange={setTaskType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="timing_measurement">시간 측정</SelectItem>
                              <SelectItem value="dimension_measurement">치수 측정</SelectItem>
                              <SelectItem value="quality_inspection">품질 검사</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>부품 번호</Label>
                          <Input
                            value={partNumber}
                            onChange={(e) => setPartNumber(e.target.value)}
                            placeholder="예: PART-001"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Operators */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        <h3 className="text-lg font-semibold">작업자 설정</h3>
                        <Badge variant="outline">{operators.length}명</Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Input
                          value={newOperatorName}
                          onChange={(e) => setNewOperatorName(e.target.value)}
                          placeholder="작업자 이름"
                          onKeyPress={(e) => e.key === 'Enter' && addOperator()}
                        />
                        <Button onClick={addOperator} disabled={!newOperatorName.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {operators.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {operators.map((operator) => (
                            <div key={operator.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <span className="text-sm font-medium">{operator.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOperator(operator.id)}
                                className="text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Parts */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-green-500" />
                        <h3 className="text-lg font-semibold">부품 설정</h3>
                        <Badge variant="outline">{parts.length}개</Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Input
                          value={newPartName}
                          onChange={(e) => setNewPartName(e.target.value)}
                          placeholder="부품 이름"
                          onKeyPress={(e) => e.key === 'Enter' && addPart()}
                        />
                        <Button onClick={addPart} disabled={!newPartName.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {parts.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {parts.map((part) => (
                            <div key={part.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <span className="text-sm font-medium">{part.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePart(part.id)}
                                className="text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button onClick={handleStartSession} disabled={createSessionMutation.isPending} className="w-full">
                      {createSessionMutation.isPending ? "세션 생성 중..." : "작업 세션 시작"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Active Session Info */}
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
                        <p className="font-medium text-slate-900 dark:text-white">{(activeSession as any)?.taskType || "시간 측정"}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">부품 번호:</span>
                        <p className="font-medium text-slate-900 dark:text-white">{(activeSession as any)?.partNumber || "미설정"}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">측정 횟수:</span>
                        <p className="font-medium text-slate-900 dark:text-white">{(measurements as any[]).length}회</p>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">세션 ID:</span>
                        <p className="font-medium text-slate-900 dark:text-white">#{(activeSession as any)?.id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timer */}
                <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-center flex items-center justify-center text-slate-900 dark:text-white">
                      <Clock className="h-5 w-5 mr-2" />
                      정밀 타이머 (±0.01초)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Timer Display */}
                      <div className="text-center">
                        <div className="text-6xl md:text-7xl font-mono font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                          {formatTime(currentTime)}
                        </div>
                        <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                          <Clock className="h-4 w-4" />
                          <span>정확도: ±0.01초</span>
                        </div>
                      </div>

                      {/* Control Buttons */}
                      <div className="flex justify-center space-x-4">
                        {!isRunning && !isPaused ? (
                          <Button
                            onClick={startTimer}
                            size="lg"
                            className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg rounded-xl shadow-lg"
                          >
                            <Play className="h-6 w-6 mr-2" />
                            시작
                          </Button>
                        ) : isRunning ? (
                          <Button
                            onClick={pauseTimer}
                            size="lg"
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 text-lg rounded-xl shadow-lg"
                          >
                            <Pause className="h-6 w-6 mr-2" />
                            일시정지
                          </Button>
                        ) : (
                          <Button
                            onClick={startTimer}
                            size="lg"
                            className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg rounded-xl shadow-lg"
                          >
                            <Play className="h-6 w-6 mr-2" />
                            재개
                          </Button>
                        )}

                        {(isRunning || isPaused) && (
                          <>
                            <Button
                              onClick={stopTimer}
                              size="lg"
                              className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 text-lg rounded-xl shadow-lg"
                            >
                              <Square className="h-6 w-6 mr-2" />
                              정지
                            </Button>
                            
                            <Button
                              onClick={resetTimer}
                              variant="outline"
                              size="lg"
                              className="px-8 py-4 text-lg rounded-xl shadow-lg"
                            >
                              <RotateCcw className="h-6 w-6 mr-2" />
                              리셋
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Status */}
                      <div className="text-center">
                        <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
                          isRunning 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : isPaused 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            isRunning ? 'bg-green-500 animate-pulse' : isPaused ? 'bg-yellow-500' : 'bg-slate-400'
                          }`} />
                          <span>
                            {isRunning ? '측정 중' : isPaused ? '일시정지됨' : '대기 중'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Panel */}
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
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">평균:</span>
                      <span className="font-mono font-medium">{formatTime(statistics.mean)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">중앙값:</span>
                      <span className="font-mono font-medium">{formatTime(statistics.median)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">최소값:</span>
                      <span className="font-mono font-medium text-green-600">{formatTime(statistics.min)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">최대값:</span>
                      <span className="font-mono font-medium text-red-600">{formatTime(statistics.max)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">표준편차:</span>
                      <span className="font-mono font-medium">{formatTime(statistics.standardDeviation)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">변동계수:</span>
                      <span className="font-mono font-medium">{(statistics.coefficientOfVariation * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Measurements List */}
            {(measurements as any[]).length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center text-slate-900 dark:text-white">
                    <Database className="h-5 w-5 mr-2" />
                    측정 기록 ({(measurements as any[]).length}건)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {(measurements as any[]).map((measurement: any, index: number) => (
                        <div
                          key={measurement.id}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                {(measurements as any[]).length - index}
                              </span>
                            </div>
                            <div>
                              <div className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                                {formatTime(measurement.timeInMs)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(measurement.timestamp).toLocaleTimeString('ko-KR')}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMeasurementMutation.mutate(measurement.id)}
                            disabled={deleteMeasurementMutation.isPending}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}