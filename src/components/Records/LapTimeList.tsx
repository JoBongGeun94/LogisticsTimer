import { useTheme } from '../../contexts/ThemeContext';
// components/Records/LapTimeList.tsx - 측정 기록 목록 (SRP)
import React, { useMemo } from 'react';
import { LapTime } from '../../contexts/SessionContext';
import { formatTime } from '../../utils/dateUtils';
import { Trash2 } from 'lucide-react';

interface LapTimeListProps {
  lapTimes: LapTime[];
  filterOperator: string;
  filterTarget: string;
  onDeleteLap: (lapId: number) => void;
}

/**
 * 측정 기록 목록 컴포넌트
 * SRP: 기록 목록 표시만 담당
 * OCP: 필터링 로직 확장 가능
 */
export const LapTimeList: React.FC<LapTimeListProps> = ({
  lapTimes,
  filterOperator,
  filterTarget,
  onDeleteLap,
}) => {
  const { theme } = useTheme();

  const filteredLapTimes = useMemo(() => {
    return lapTimes.filter((lap) => {
      return (
        (!filterOperator || lap.operator === filterOperator) &&
        (!filterTarget || lap.target === filterTarget)
      );
    });
  }, [lapTimes, filterOperator, filterTarget]);

  if (filteredLapTimes.length === 0) {
    return (
      <div
        className={`text-center py-8 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}
      >
        <p>측정 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      <div className="space-y-2">
        {filteredLapTimes.map((lap) => (
          <div
            key={lap.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex-1">
              <div
                className={`font-mono text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {formatTime(lap.time)}
              </div>
              <div
                className={`text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {lap.operator} • {lap.target} • {lap.timestamp}
              </div>
            </div>
            <button
              onClick={() => onDeleteLap(lap.id)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="기록 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
