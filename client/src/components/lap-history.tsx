import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/timer-utils";
import { History, Trash2, Clock, Filter, ArrowUpDown, Search } from "lucide-react";
import { useState, useMemo } from "react";

interface LapHistoryProps {
  measurements: any[];
  onDelete?: (id: number) => void;
}

export function LapHistory({ measurements, onDelete }: LapHistoryProps) {
  const [sortBy, setSortBy] = useState<'time' | 'timestamp' | 'operator'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get unique operators for filtering
  const uniqueOperators = useMemo(() => {
    const operators = measurements
      .map(m => m.operatorName)
      .filter(Boolean)
      .filter((operator, index, arr) => arr.indexOf(operator) === index);
    return operators;
  }, [measurements]);

  // Filter and sort measurements
  const filteredAndSortedMeasurements = useMemo(() => {
    let filtered = measurements;

    // Filter by operator
    if (filterOperator !== 'all') {
      filtered = filtered.filter(m => m.operatorName === filterOperator);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.operatorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.partNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort measurements
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'time':
          comparison = a.timeInMs - b.timeInMs;
          break;
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'operator':
          comparison = (a.operatorName || '').localeCompare(b.operatorName || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [measurements, sortBy, sortOrder, filterOperator, searchTerm]);

  if (measurements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="h-5 w-5 mr-2 text-blue-600" />
            최근 측정 기록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Clock className="h-12 w-12 mx-auto mb-2" />
            <p className="text-sm">측정 기록이 없습니다</p>
            <p className="text-xs mt-1">타이머를 사용하여 측정을 시작하세요</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <History className="h-5 w-5 mr-2 text-blue-600" />
            최근 측정 기록
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            총 {measurements.length}회
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {measurements.map((measurement, index) => (
            <div 
              key={measurement.id} 
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {measurement.attemptNumber}
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {formatTime(measurement.timeInMs)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(measurement.timestamp).toLocaleTimeString('ko-KR')}
                  </div>
                </div>
              </div>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(measurement.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
