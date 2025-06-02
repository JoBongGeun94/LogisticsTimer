import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Save, RotateCcw } from "lucide-react";

interface TimerControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onLap: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export function TimerControls({ 
  isRunning, 
  isPaused,
  onStart, 
  onPause,
  onStop, 
  onLap, 
  onReset, 
  disabled = false 
}: TimerControlsProps) {
  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="flex justify-center space-x-3">
        {!isRunning && !isPaused ? (
          <div className="flex flex-col items-center">
            <Button
              onClick={onStart}
              disabled={disabled}
              className="w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xl shadow-lg transition-all"
            >
              <Play className="h-6 w-6" />
            </Button>
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">시작</span>
          </div>
        ) : isRunning ? (
          <div className="flex flex-col items-center">
            <Button
              onClick={onPause}
              className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xl shadow-lg transition-all"
            >
              <Pause className="h-6 w-6" />
            </Button>
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">일시정지</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Button
              onClick={onStart}
              disabled={disabled}
              className="w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xl shadow-lg transition-all"
            >
              <Play className="h-6 w-6" />
            </Button>
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">재시작</span>
          </div>
        )}

        <div className="flex flex-col items-center">
          <Button
            onClick={onStop}
            disabled={!isRunning && !isPaused || disabled}
            className={`w-16 h-16 text-white rounded-full flex items-center justify-center text-xl shadow-lg transition-all ${
              !isRunning && !isPaused || disabled 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <Square className="h-6 w-6" />
          </Button>
          <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">정지</span>
        </div>

        <div className="flex flex-col items-center">
          <Button
            onClick={onLap}
            disabled={(!isRunning && !isPaused) || disabled}
            className={`w-16 h-16 text-white rounded-full flex items-center justify-center text-xl shadow-lg transition-all ${
              (!isRunning && !isPaused) || disabled 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            <Save className="h-6 w-6" />
          </Button>
          <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">기록</span>
        </div>

        <div className="flex flex-col items-center">
          <Button
            onClick={onReset}
            disabled={disabled}
            className={`w-16 h-16 text-white rounded-full flex items-center justify-center text-xl shadow-lg transition-all ${
              disabled 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            <RotateCcw className="h-6 w-6" />
          </Button>
          <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">새로고침</span>
        </div>
      </div>
    </div>
  );
}
