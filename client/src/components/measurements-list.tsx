import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Trash2, Clock, User, Package } from "lucide-react";
import { formatTime } from "@/lib/timer-utils";

interface Measurement {
  id: number;
  timeInMs: number;
  timestamp: string;
  operatorName?: string;
  partName?: string;
}

interface MeasurementsListProps {
  measurements: Measurement[];
  onDelete: (id: number) => void;
  isDeleting?: boolean;
}

export function MeasurementsList({ measurements, onDelete, isDeleting }: MeasurementsListProps) {
  if (measurements.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>아직 측정 데이터가 없습니다.</p>
        <p className="text-sm">타이머를 사용하여 첫 측정을 시작하세요.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-64">
      <div className="space-y-2">
        {measurements.map((measurement, index) => (
          <div
            key={measurement.id}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {measurements.length - index}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                  {formatTime(measurement.timeInMs)}
                </div>
                
                <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{new Date(measurement.timestamp).toLocaleTimeString('ko-KR')}</span>
                  
                  {measurement.operatorName && (
                    <Badge variant="outline" className="text-xs">
                      <User className="h-3 w-3 mr-1" />
                      {measurement.operatorName}
                    </Badge>
                  )}
                  
                  {measurement.partName && (
                    <Badge variant="outline" className="text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      {measurement.partName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(measurement.id)}
              disabled={isDeleting}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}