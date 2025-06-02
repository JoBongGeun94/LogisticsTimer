import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, Plus, X } from "lucide-react";

interface Operator {
  id: string;
  name: string;
}

interface Part {
  id: string;
  name: string;
}

interface MeasurementFormProps {
  onSessionCreate: (sessionData: { 
    taskType: string; 
    partNumber?: string; 
    operatorName?: string; 
    targetName?: string;
    operators?: Operator[];
    parts?: Part[];
    trialsPerOperator?: number;
  }) => void;
  activeSession?: any;
  isLoading?: boolean;
  onOperatorChange?: (operatorName: string) => void;
  onTargetChange?: (targetName: string) => void;
  selectedOperator?: string;
  selectedPart?: string;
  onOperatorSelect?: (operatorId: string) => void;
  onPartSelect?: (partId: string) => void;
  currentTrial?: number;
}

export function MeasurementForm({ 
  onSessionCreate, 
  activeSession, 
  isLoading, 
  onOperatorChange, 
  onTargetChange,
  selectedOperator,
  selectedPart,
  onOperatorSelect,
  onPartSelect,
  currentTrial
}: MeasurementFormProps) {
  const [taskType, setTaskType] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [targetName, setTargetName] = useState("");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [trialsPerOperator, setTrialsPerOperator] = useState(3);
  const [newOperatorName, setNewOperatorName] = useState("");
  const [newPartName, setNewPartName] = useState("");
  const [useAdvancedMode, setUseAdvancedMode] = useState(false);
  const [isEditingOperator, setIsEditingOperator] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempOperatorName, setTempOperatorName] = useState("");
  const [tempTargetName, setTempTargetName] = useState("");

  // 과거 데이터 가져오기
  const { data: historyData } = useQuery<{ operators: string[], targets: string[] }>({
    queryKey: ["/api/work-sessions/history/operators-targets"],
    retry: false,
  });



  const addOperator = () => {
    if (newOperatorName.trim()) {
      const newOperator: Operator = {
        id: `op_${Date.now()}`,
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
        id: `part_${Date.now()}`,
        name: newPartName.trim()
      };
      setParts([...parts, newPart]);
      setNewPartName("");
    }
  };

  const removePart = (id: string) => {
    setParts(parts.filter(part => part.id !== id));
  };

  const handleOperatorEdit = () => {
    setTempOperatorName(activeSession?.operatorName || "");
    setIsEditingOperator(true);
  };

  const saveOperatorEdit = () => {
    if (tempOperatorName.trim() && onOperatorChange) {
      onOperatorChange(tempOperatorName.trim());
      setIsEditingOperator(false);
      setTempOperatorName("");
    }
  };

  const cancelOperatorEdit = () => {
    setIsEditingOperator(false);
    setTempOperatorName("");
  };

  const handleTargetEdit = () => {
    setTempTargetName(activeSession?.targetName || "");
    setIsEditingTarget(true);
  };

  const saveTargetEdit = () => {
    if (tempTargetName.trim() && onTargetChange) {
      onTargetChange(tempTargetName.trim());
      setIsEditingTarget(false);
      setTempTargetName("");
    }
  };

  const cancelTargetEdit = () => {
    setIsEditingTarget(false);
    setTempTargetName("");
  };

  const selectOperatorFromHistory = (selectedOperator: string) => {
    if (onOperatorChange) {
      onOperatorChange(selectedOperator);
    }
  };

  const selectTargetFromHistory = (selectedTarget: string) => {
    if (onTargetChange) {
      onTargetChange(selectedTarget);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (useAdvancedMode) {
      // Gage R&R 모드: 최소 2명의 측정자와 1개 이상의 부품 필요
      if (taskType && operators.length >= 2 && parts.length >= 1) {
        onSessionCreate({
          taskType,
          partNumber: partNumber || undefined,
          operatorName: operators[0]?.name, // 첫 번째 측정자를 기본으로 설정
          targetName: targetName || "Gage R&R 분석",
          operators,
          parts,
          trialsPerOperator,
        });
        // 리셋
        setTaskType("");
        setPartNumber("");
        setOperators([]);
        setParts([]);
        setTrialsPerOperator(3);
      }
    } else {
      // 기본 모드: 기존 로직
      if (taskType && operatorName && targetName) {
        onSessionCreate({
          taskType,
          partNumber: partNumber || undefined,
          operatorName,
          targetName,
        });
        setTaskType("");
        setPartNumber("");
        setOperatorName("");
        setTargetName("");
      }
    }
  };

  const taskTypes = [
    { value: "material_inspection", label: "물자검수팀" },
    { value: "storage_management", label: "저장관리팀" },
    { value: "packaging_management", label: "포장관리팀" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ClipboardList className="h-5 w-5 mr-2 text-blue-600" />
          작업 정보 선택
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeSession ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div>
                <div className="font-medium text-green-800 dark:text-green-200">
                  {taskTypes.find(t => t.value === activeSession.taskType)?.label || activeSession.taskType}
                </div>
                {activeSession.partNumber && (
                  <div className="text-sm text-green-600 dark:text-green-300">
                    공정세부번호: {activeSession.partNumber}
                  </div>
                )}
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>

            {/* 측정자 정보 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">현재 측정자</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOperatorEdit}
                  className="h-6 px-2 text-xs"
                >
                  변경
                </Button>
              </div>
              {isEditingOperator ? (
                <div className="space-y-2">
                  <Select value={tempOperatorName} onValueChange={setTempOperatorName}>
                    <SelectTrigger>
                      <SelectValue placeholder="측정자를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* GRR 모드 */}
                      {activeSession?.operators && activeSession.operators.map((op: any) => (
                        <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>
                      ))}
                      {/* 기본 모드 */}
                      {activeSession && !activeSession.operators && activeSession.operatorName && (
                        <SelectItem key={activeSession.operatorName} value={activeSession.operatorName}>
                          {activeSession.operatorName}
                        </SelectItem>
                      )}
                      {/* 세션 없을 때 */}
                      {!activeSession && (
                        <>
                          {historyData && historyData.operators.map((operator: string) => (
                            <SelectItem key={operator} value={operator}>{operator}</SelectItem>
                          ))}
                          {(!historyData || historyData.operators.length === 0) && (
                            <>
                              <SelectItem value="측정자1">측정자1</SelectItem>
                              <SelectItem value="측정자2">측정자2</SelectItem>
                              <SelectItem value="홍길동">홍길동</SelectItem>
                              <SelectItem value="김철수">김철수</SelectItem>
                              <SelectItem value="이영희">이영희</SelectItem>
                            </>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={saveOperatorEdit}
                      disabled={!tempOperatorName.trim()}
                      className="flex-1"
                    >
                      저장
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelOperatorEdit}
                      className="flex-1"
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    <span className="text-sm">{activeSession?.operatorName || "미설정"}</span>
                  </div>
                  {/* GRR 모드일 때 전체 측정자 목록 표시 */}
                  {activeSession?.operators && (
                    <div className="grid grid-cols-2 gap-2">
                      {activeSession.operators.map((op: any) => (
                        <div key={op.id} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border text-center">
                          <span className="text-sm font-medium">{op.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>



            {/* 대상자 정보 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">현재 대상자</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTargetEdit}
                  className="h-6 px-2 text-xs"
                >
                  변경
                </Button>
              </div>
              {isEditingTarget ? (
                <div className="space-y-2">
                  <Select value={tempTargetName} onValueChange={setTempTargetName}>
                    <SelectTrigger>
                      <SelectValue placeholder="대상자를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* GRR 모드 */}
                      {activeSession?.parts && activeSession.parts.map((part: any) => (
                        <SelectItem key={part.id} value={part.name}>{part.name}</SelectItem>
                      ))}
                      {/* 기본 모드 */}
                      {activeSession && !activeSession.parts && activeSession.targetName && (
                        <SelectItem key={activeSession.targetName} value={activeSession.targetName}>
                          {activeSession.targetName}
                        </SelectItem>
                      )}
                      {/* 세션 없을 때 */}
                      {!activeSession && (
                        <>
                          {historyData && historyData.targets.map((target: string) => (
                            <SelectItem key={target} value={target}>{target}</SelectItem>
                          ))}
                          {(!historyData || historyData.targets.length === 0) && (
                            <>
                              <SelectItem value="대상자1">대상자1</SelectItem>
                              <SelectItem value="대상자2">대상자2</SelectItem>
                              <SelectItem value="작업자A">작업자A</SelectItem>
                              <SelectItem value="작업자B">작업자B</SelectItem>
                              <SelectItem value="신입사원">신입사원</SelectItem>
                              <SelectItem value="베테랑">베테랑</SelectItem>
                            </>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={saveTargetEdit}
                      disabled={!tempTargetName.trim()}
                      className="flex-1"
                    >
                      저장
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelTargetEdit}
                      className="flex-1"
                    >
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                    <span className="text-sm">{activeSession?.targetName || "미설정"}</span>
                  </div>
                  {/* GRR 모드일 때 전체 대상자 목록 표시 */}
                  {activeSession?.parts && (
                    <div className="grid grid-cols-2 gap-2">
                      {activeSession.parts.map((part: any) => (
                        <div key={part.id} className="p-2 bg-green-50 dark:bg-green-900/20 rounded border text-center">
                          <span className="text-sm font-medium">{part.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GRR 모드에서 측정자/대상자 선택 */}
            {activeSession?.operators && activeSession?.parts && (
              <div className="space-y-3 border-t pt-3">
                <div>
                  <Label className="text-sm font-medium">측정 진행</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label className="text-xs text-gray-500">현재 측정자</Label>
                      <Select value={selectedOperator} onValueChange={onOperatorSelect}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="측정자 선택" />
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
                      <Label className="text-xs text-gray-500">현재 대상자</Label>
                      <Select value={selectedPart} onValueChange={onPartSelect}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="대상자 선택" />
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
                  <div className="text-xs text-gray-500 mt-2">
                    시행 {currentTrial || 1}/{activeSession.trialsPerOperator || 3}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                현재 활성 세션입니다. 타이머를 사용하여 측정을 진행하세요.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    // Complete current session to enable creating a new one
                    await fetch(`/api/work-sessions/${activeSession.id}/complete`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    });
                    // Refresh the page to show session creation form
                    window.location.reload();
                  } catch (error) {
                    console.error('Error completing session:', error);
                  }
                }}
                className="text-xs"
              >
                작업 변경
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 모드 선택 */}
            <div className="mb-4">
              <Label className="text-sm font-medium">측정 모드</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={!useAdvancedMode}
                    onChange={() => setUseAdvancedMode(false)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">기본 모드 (단일 측정자)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={useAdvancedMode}
                    onChange={() => setUseAdvancedMode(true)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Gage R&R 분석 모드 (다중 측정자)</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="taskType" className="text-sm font-medium">
                작업 유형
              </Label>
              <Select value={taskType} onValueChange={setTaskType} required>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="작업 유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="partNumber" className="text-sm font-medium">
                공정세부번호 (선택사항)
              </Label>
              <Input
                id="partNumber"
                type="text"
                placeholder="예: PT-2024-001"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className="mt-1"
              />
            </div>

            {useAdvancedMode ? (
              <>
                {/* Gage R&R 모드 */}
                <div>
                  <Label className="text-sm font-medium">측정자 관리</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="측정자 이름 입력"
                        value={newOperatorName}
                        onChange={(e) => setNewOperatorName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOperator())}
                      />
                      <Button type="button" onClick={addOperator} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {operators.length > 0 && (
                      <div className="space-y-1">
                        {operators.map((op) => (
                          <div key={op.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <span className="text-sm">{op.name}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeOperator(op.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">최소 2명의 측정자가 필요합니다</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">대상자 지정</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="대상자 이름 입력"
                        value={newPartName}
                        onChange={(e) => setNewPartName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPart())}
                      />
                      <Button type="button" onClick={addPart} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {parts.length > 0 && (
                      <div className="space-y-1">
                        {parts.map((part) => (
                          <div key={part.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <span className="text-sm">{part.name}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removePart(part.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">최소 1명의 대상자가 필요합니다</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="trialsPerOperator" className="text-sm font-medium">
                    측정자별 시행 횟수
                  </Label>
                  <Select value={trialsPerOperator.toString()} onValueChange={(value) => setTrialsPerOperator(parseInt(value))}>
                    <SelectTrigger className="mt-1">
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
            ) : (
              <>
                {/* 기본 모드 */}
                <div>
                  <Label htmlFor="operatorName" className="text-sm font-medium">
                    측정자 이름
                  </Label>
                  <Input
                    id="operatorName"
                    type="text"
                    placeholder="측정자 이름을 입력하세요"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="targetName" className="text-sm font-medium">
                    대상자 이름
                  </Label>
                  <Input
                    id="targetName"
                    type="text"
                    placeholder="대상자 이름을 입력하세요"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              </>
            )}

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={
                useAdvancedMode 
                  ? (!taskType || operators.length < 2 || parts.length < 1 || isLoading)
                  : (!taskType || !operatorName || !targetName || isLoading)
              }
            >
              {isLoading ? "생성 중..." : 
               useAdvancedMode ? "Gage R&R 세션 시작" : "작업 세션 시작"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
