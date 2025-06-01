import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList } from "lucide-react";

interface MeasurementFormProps {
  onSessionCreate: (sessionData: { taskType: string; partNumber?: string }) => void;
  activeSession?: any;
  isLoading?: boolean;
}

export function MeasurementForm({ onSessionCreate, activeSession, isLoading }: MeasurementFormProps) {
  const [taskType, setTaskType] = useState("");
  const [partNumber, setPartNumber] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskType) {
      onSessionCreate({
        taskType,
        partNumber: partNumber || undefined,
      });
      setTaskType("");
      setPartNumber("");
    }
  };

  const taskTypes = [
    { value: "pallet_loading", label: "파렛트 적재" },
    { value: "sorting", label: "분류 작업" },
    { value: "picking", label: "피킹 작업" },
    { value: "packaging", label: "포장 작업" },
    { value: "inventory", label: "재고 확인" },
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
                    부품번호: {activeSession.partNumber}
                  </div>
                )}
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              현재 활성 세션입니다. 타이머를 사용하여 측정을 진행하세요.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                부품/샘플 번호 (선택사항)
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

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!taskType || isLoading}
            >
              {isLoading ? "생성 중..." : "작업 세션 시작"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
