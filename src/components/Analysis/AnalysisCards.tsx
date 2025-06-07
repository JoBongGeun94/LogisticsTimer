import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Timer, Clock, Activity, BarChart3, Target, Calculator } from 'lucide-react';
import { LapTime } from '../../types/LapTime';

interface AnalysisCardsProps {
  lapTimes: LapTime[];
}

const MeasurementCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  icon: React.FC<any>;
  status?: 'success' | 'warning' | 'error' | 'info';
}> = ({ title, value, unit, icon: Icon, status = 'info' }) => {
  const { theme, isDark } = useTheme();

  const statusColors = {
    success: isDark 
      ? { bg: 'bg-green-900/30', border: 'border-green-700', icon: 'text-green-400', text: 'text-green-300' }
      : { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', text: 'text-green-800' },
    warning: isDark
      ? { bg: 'bg-yellow-900/30', border: 'border-yellow-700', icon: 'text-yellow-400', text: 'text-yellow-300' }
      : { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', text: 'text-yellow-800' },
    error: isDark
      ? { bg: 'bg-red-900/30', border: 'border-red-700', icon: 'text-red-400', text: 'text-red-300' }
      : { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', text: 'text-red-800' },
    info: isDark
      ? { bg: 'bg-blue-900/30', border: 'border-blue-700', icon: 'text-blue-400', text: 'text-blue-300' }
      : { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', text: 'text-blue-800' }
  };

  const colors = statusColors[status];

  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 ${colors.bg} ${colors.border} hover:shadow-lg hover:scale-105`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${colors.icon}`} />
      </div>
      <div className={`text-sm font-medium ${theme.textMuted} mb-1 line-clamp-1`}>
        {title}
      </div>
      <div className={`text-base font-bold ${colors.text} font-mono break-all`}>
        {value}{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
};

const formatTime = (ms: number): string => {
  if (ms < 0) return '00:00.00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

export const AnalysisCards: React.FC<AnalysisCardsProps> = ({ lapTimes }) => {
  const { theme } = useTheme();

  const stats = useMemo(() => {
    if (lapTimes.length === 0) return null;

    const times = lapTimes.map(lap => lap.time);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / Math.max(1, times.length - 1);
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

    return { mean, stdDev, cv, count: times.length };
  }, [lapTimes]);

  if (!stats) return null;

  return (
    <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
      <div className="flex items-center space-x-2 mb-3">
        <BarChart3 className="w-5 h-5 text-green-500" />
        <h2 className={`font-semibold ${theme.text}`}>실시간 분석</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
        <MeasurementCard
          title="측정 횟수"
          value={stats.count}
          icon={Timer}
          status="info"
        />
        
        <MeasurementCard
          title="평균 시간"
          value={formatTime(stats.mean)}
          icon={Clock}
          status="success"
        />

        <MeasurementCard
          title="변동계수"
          value={`${stats.cv.toFixed(1)}%`}
          icon={Activity}
          status={stats.cv < 5 ? 'success' : stats.cv < 10 ? 'warning' : 'error'}
        />
      </div>

      {lapTimes.length >= 6 && (
        <div className={`${theme.surface} p-3 rounded-lg border ${theme.border} text-center`}>
          <p className={`text-sm ${theme.textMuted} mb-2`}>
            📊 Gage R&R 분석 가능 (측정 {lapTimes.length}회)
          </p>
          <p className={`text-xs ${theme.textMuted}`}>
            상세한 분석과 해석은 '상세분석' 버튼을 클릭하세요
          </p>
        </div>
      )}
    </div>
  );
};
