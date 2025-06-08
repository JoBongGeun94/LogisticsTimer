import React from 'react';
import { formatTime } from '../../utils/timeUtils';

interface TimerDisplayProps {
  currentTime: number;
  isRunning: boolean;
  className?: string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  currentTime,
  isRunning,
  className = ''
}) => {
  return (
    <div className={`text-center ${className}`}>
      <div className={`text-6xl md:text-8xl font-mono font-bold transition-colors duration-200 ${
        isRunning ? 'text-blue-600' : 'text-gray-800'
      }`}>
        {formatTime(currentTime)}
      </div>
      <div className="text-sm text-gray-500 mt-2">
        {isRunning ? '측정 중...' : '대기 중'}
      </div>
    </div>
  );
};
