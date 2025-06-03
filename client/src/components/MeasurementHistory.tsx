/**
 * Single Responsibility Principle (SRP)
 * 측정 기록 표시만을 담당하는 컴포넌트
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/timer-utils";
import { Trash2, Clock } from "lucide-react";

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

interface MeasurementHistoryProps {
  measurements: Measurement[];
  onDeleteMeasurement?: (measurementId: number) => void;
  title?: string;
}

export function MeasurementHistory({ 
  measurements, 
  onDeleteMeasurement,
  title = "최근 측정 기록"
}: MeasurementHistoryProps) {
  if (measurements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2 text-blue-600" />
          {title}
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            ({measurements.length}개)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {measurements.map((measurement, index) => (
            <div
              key={measurement.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                  {measurement.attemptNumber}
                </div>
                <div>
                  <div className="font-mono text-lg font-semibold">
                    {formatTime(measurement.timeInMs)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {measurement.operatorName && `측정자: ${measurement.operatorName}`}
                    {measurement.operatorName && measurement.partName && " • "}
                    {measurement.partName && `대상: ${measurement.partName}`}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(measurement.createdAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
                {onDeleteMeasurement && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteMeasurement(measurement.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {measurements.length > 5 && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-center text-gray-500 dark:text-gray-400">
              최근 {Math.min(measurements.length, 5)}개 측정 기록 표시
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}