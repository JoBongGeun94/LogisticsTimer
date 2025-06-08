import { useState, useRef, useCallback } from 'react';

export interface UseTimerReturn {
  currentTime: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  pause: () => void;
}

export const useTimer = (): UseTimerReturn => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateTime = useCallback(() => {
    if (startTimeRef.current) {
      setCurrentTime(Date.now() - startTimeRef.current);
    }
  }, []);

  const start = useCallback(() => {
    if (!isRunning) {
      startTimeRef.current = Date.now() - currentTime;
      setIsRunning(true);
      intervalRef.current = setInterval(updateTime, 10);
    }
  }, [isRunning, currentTime, updateTime]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setCurrentTime(0);
    startTimeRef.current = null;
  }, [stop]);

  const pause = useCallback(() => {
    stop();
  }, [stop]);

  return {
    currentTime: currentTime / 1000, // 초 단위로 반환
    isRunning,
    start,
    stop,
    reset,
    pause
  };
};
