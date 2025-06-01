import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Flag, RotateCcw } from "lucide-react";

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
    <div className="flex justify-center space-x-3">
      {!isRunning && !isPaused ? (
        <Button
          onClick={onStart}
          disabled={disabled}
          className="w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xl shadow-lg transition-all"
        >
          <Play className="h-6 w-6" />
        </Button>
      ) : isRunning ? (
        <Button
          onClick={onPause}
          className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xl shadow-lg transition-all"
        >
          <Pause className="h-6 w-6" />
        </Button>
      ) : (
        <Button
          onClick={onStart}
          disabled={disabled}
          className="w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xl shadow-lg transition-all"
        >
          <Play className="h-6 w-6" />
        </Button>
      )}

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

      <Button
        onClick={onLap}
        disabled={!isRunning || disabled}
        className={`w-16 h-16 text-white rounded-full flex items-center justify-center text-xl shadow-lg transition-all ${
          !isRunning || disabled 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-orange-600 hover:bg-orange-700'
        }`}
      >
        <Flag className="h-6 w-6" />
      </Button>

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
    </div>
  );
}
