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
            측정 기록 관리
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            총 {measurements.length}개 (표시: {filteredAndSortedMeasurements.length}개)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filter and Sort Controls */}
        <div className="mb-4 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="측정자, 부품명, 부품번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter and Sort Row */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Operator Filter */}
            {uniqueOperators.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={filterOperator} onValueChange={setFilterOperator}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 측정자</SelectItem>
                    {uniqueOperators.map((operator) => (
                      <SelectItem key={operator} value={operator}>
                        {operator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              <Select value={sortBy} onValueChange={(value: 'time' | 'timestamp' | 'operator') => setSortBy(value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">시간순</SelectItem>
                  <SelectItem value="time">측정값순</SelectItem>
                  <SelectItem value="operator">측정자순</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>

            {/* Clear Filters */}
            {(searchTerm || filterOperator !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterOperator('all');
                }}
                className="text-xs"
              >
                필터 초기화
              </Button>
            )}
          </div>
        </div>

        {/* Measurements List */}
        {filteredAndSortedMeasurements.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Search className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">검색 조건에 맞는 측정 기록이 없습니다</p>
            <p className="text-xs mt-1">다른 검색어나 필터를 시도해보세요</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredAndSortedMeasurements.map((measurement, index) => (
              <div 
                key={measurement.id} 
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {measurements.indexOf(measurement) + 1}
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">
                      {formatTime(measurement.timeInMs)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>
                        {new Date(measurement.timestamp).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {measurement.operatorName && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {measurement.operatorName}
                        </span>
                      )}
                      {measurement.partName && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs">
                          {measurement.partName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(measurement.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}