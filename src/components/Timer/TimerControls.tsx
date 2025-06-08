import React from 'react';
import { Play, Pause, Square, Clock } from 'lucide-react';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onLap: () => void;
  disabled?: boolean;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  onStart,
  onStop,
  onReset,
  onLap,
  disabled = false
}) => {
  return (
    <div className="flex justify-center gap-4 mt-8">
      <button
        onClick={isRunning ? onStop : onStart}
        disabled={disabled}
        className={`px-8 py-4 rounded-lg font-semibold text-white transition-colors duration-200 ${
          isRunning 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-blue-500 hover:bg-blue-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isRunning ? (
          <>
            <Pause className="inline mr-2" size={20} />
            정지
          </>
        ) : (
          <>
            <Play className="inline mr-2" size={20} />
            시작
          </>
        )}
      </button>
      
      <button
        onClick={onLap}
        disabled={!isRunning || disabled}
        className={`px-8 py-4 rounded-lg font-semibold text-white transition-colors duration-200 ${
          !isRunning || disabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        <Clock className="inline mr-2" size={20} />
        측정완료
      </button>
      
      <button
        onClick={onReset}
        disabled={disabled}
        className={`px-8 py-4 rounded-lg font-semibold text-white transition-colors duration-200 ${
          disabled 
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gray-500 hover:bg-gray-600'
        }`}
      >
        <Square className="inline mr-2" size={20} />
        리셋
      </button>
    </div>
  );
};
