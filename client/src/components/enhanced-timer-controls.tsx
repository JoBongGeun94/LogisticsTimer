import { Button } from "@/components/ui/button";
import { Play, Pause, Square, RotateCcw, Clock } from "lucide-react";
import { formatTime } from "@/lib/timer-utils";

interface EnhancedTimerControlsProps {
  currentTime: number;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  canStart?: boolean;
}

export function EnhancedTimerControls({ 
  currentTime,
  isRunning, 
  isPaused,
  onStart, 
  onPause,
  onStop, 
  onReset, 
  canStart = true
}: EnhancedTimerControlsProps) {
  return (
    <div className="space-y-6">
      {/* Timer Display */}
      <div className="text-center">
        <div className="text-6xl md:text-7xl font-mono font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
          {formatTime(currentTime)}
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
          <Clock className="h-4 w-4" />
          <span>정확도: ±0.01초</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center space-x-4">
        {!isRunning && !isPaused ? (
          <Button
            onClick={onStart}
            disabled={!canStart}
            size="lg"
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg rounded-xl shadow-lg transition-all transform hover:scale-105"
          >
            <Play className="h-6 w-6 mr-2" />
            시작
          </Button>
        ) : isRunning ? (
          <Button
            onClick={onPause}
            size="lg"
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 text-lg rounded-xl shadow-lg transition-all transform hover:scale-105"
          >
            <Pause className="h-6 w-6 mr-2" />
            일시정지
          </Button>
        ) : (
          <Button
            onClick={onStart}
            disabled={!canStart}
            size="lg"
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg rounded-xl shadow-lg transition-all transform hover:scale-105"
          >
            <Play className="h-6 w-6 mr-2" />
            재개
          </Button>
        )}

        {(isRunning || isPaused) && (
          <>
            <Button
              onClick={onStop}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 text-lg rounded-xl shadow-lg transition-all transform hover:scale-105"
            >
              <Square className="h-6 w-6 mr-2" />
              정지
            </Button>
            
            <Button
              onClick={onReset}
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg rounded-xl shadow-lg transition-all transform hover:scale-105"
            >
              <RotateCcw className="h-6 w-6 mr-2" />
              리셋
            </Button>
          </>
        )}
      </div>

      {/* Status Indicator */}
      <div className="text-center">
        <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
          isRunning 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
            : isPaused 
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isRunning ? 'bg-green-500 animate-pulse' : isPaused ? 'bg-yellow-500' : 'bg-slate-400'
          }`} />
          <span>
            {isRunning ? '측정 중' : isPaused ? '일시정지됨' : '대기 중'}
          </span>
        </div>
      </div>
    </div>
  );
}