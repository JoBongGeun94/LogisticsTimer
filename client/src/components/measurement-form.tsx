import { useState } from "react";
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
}

export function MeasurementForm({ onSessionCreate, activeSession, isLoading }: MeasurementFormProps) {
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
                  <Label className="text-sm font-medium">부품 관리</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="부품 이름 입력"
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
                    <p className="text-xs text-gray-500">최소 1개의 부품이 필요합니다</p>
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
