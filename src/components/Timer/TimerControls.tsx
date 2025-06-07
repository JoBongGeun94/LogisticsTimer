// components/Timer/TimerControls.tsx - 타이머 제어 전용 (SRP, ISP)
import React from 'react';
import { Play, Pause, Square, RotateCcw, Clock } from 'lucide-react';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onRecordLap: () => void;
  disabled?: boolean;
}

/**
 * 타이머 제어 버튼 컴포넌트
 * SRP: 타이머 제어만 담당
 * ISP: 필요한 이벤트만 props로 받음
 */
export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  onStart,
  onPause,
  onStop,
  onReset,
  onRecordLap,
  disabled = false,
}) => {
  return (
    <div className="flex justify-center space-x-4 mt-6">
      {/* 시작/일시정지 버튼 */}
      <button
        onClick={isRunning ? onPause : onStart}
        disabled={disabled}
        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
          disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : isRunning
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg hover:shadow-xl'
              : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
        }`}
      >
        {isRunning ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5" />
        )}
        <span>{isRunning ? '일시정지' : '시작'}</span>
      </button>

      {/* 정지 버튼 */}
      <button
        onClick={onStop}
        disabled={disabled || !isRunning}
        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
          disabled || !isRunning
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl'
        }`}
      >
        <Square className="w-5 h-5" />
        <span>정지</span>
      </button>

      {/* 초기화 버튼 */}
      <button
        onClick={onReset}
        disabled={disabled}
        className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
          disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl'
        }`}
      >
        <RotateCcw className="w-5 h-5" />
        <span>초기화</span>
      </button>

      {/* 랩 기록 버튼 */}
      <button
        onClick={onRecordLap}
        disabled={disabled}
        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
          disabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
        }`}
      >
        <Clock className="w-5 h-5" />
        <span>기록</span>
      </button>
    </div>
  );
};

// components/Timer/TimerCard.tsx - 타이머 카드 조합 (SRP)
