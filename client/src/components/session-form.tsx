import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Users, Package, Settings } from "lucide-react";

interface Operator {
  id: string;
  name: string;
}

interface Part {
  id: string;
  name: string;
  specification?: string;
}

interface SessionFormProps {
  onSubmit: (sessionData: {
    taskType: string;
    partNumber?: string;
    operators?: Operator[];
    parts?: Part[];
    trialsPerOperator?: number;
  }) => void;
  isLoading?: boolean;
}

export function SessionForm({ onSubmit, isLoading }: SessionFormProps) {
  const [taskType, setTaskType] = useState("timing_measurement");
  const [partNumber, setPartNumber] = useState("");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [trialsPerOperator, setTrialsPerOperator] = useState(10);
  const [newOperatorName, setNewOperatorName] = useState("");
  const [newPartName, setNewPartName] = useState("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      taskType,
      partNumber: partNumber || undefined,
      operators: operators.length > 0 ? operators : undefined,
      parts: parts.length > 0 ? parts : undefined,
      trialsPerOperator
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="taskType">작업 유형</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timing_measurement">시간 측정</SelectItem>
                <SelectItem value="dimension_measurement">치수 측정</SelectItem>
                <SelectItem value="weight_measurement">중량 측정</SelectItem>
                <SelectItem value="quality_inspection">품질 검사</SelectItem>
                <SelectItem value="assembly_task">조립 작업</SelectItem>
                <SelectItem value="packaging_task">포장 작업</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="partNumber">부품 번호 (선택사항)</Label>
            <Input
              id="partNumber"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="예: PART-001"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="trialsPerOperator">작업자당 측정 횟수</Label>
          <Select value={trialsPerOperator.toString()} onValueChange={(value) => setTrialsPerOperator(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5회</SelectItem>
              <SelectItem value="10">10회</SelectItem>
              <SelectItem value="15">15회</SelectItem>
              <SelectItem value="20">20회</SelectItem>
              <SelectItem value="25">25회</SelectItem>
              <SelectItem value="30">30회</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Operators Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">작업자 설정</h3>
          <span className="text-sm text-slate-500">({operators.length}명)</span>
        </div>

        <div className="flex space-x-2">
          <Input
            value={newOperatorName}
            onChange={(e) => setNewOperatorName(e.target.value)}
            placeholder="작업자 이름을 입력하세요"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOperator())}
          />
          <Button type="button" onClick={addOperator} disabled={!newOperatorName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {operators.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {operators.map((operator) => (
              <div key={operator.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <span className="text-sm font-medium">{operator.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOperator(operator.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Parts Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold">부품 설정</h3>
          <span className="text-sm text-slate-500">({parts.length}개)</span>
        </div>

        <div className="flex space-x-2">
          <Input
            value={newPartName}
            onChange={(e) => setNewPartName(e.target.value)}
            placeholder="부품 이름을 입력하세요"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPart())}
          />
          <Button type="button" onClick={addPart} disabled={!newPartName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {parts.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {parts.map((part) => (
              <div key={part.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <span className="text-sm font-medium">{part.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePart(part.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "세션 생성 중..." : "작업 세션 시작"}
        </Button>
      </div>
    </form>
  );
}