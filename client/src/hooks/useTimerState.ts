import { useState, useRef, useCallback } from 'react';

// Single Responsibility: 타이머 상태 관리만 담당
export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;
  accumulatedTime: number;
  lastStartTime: number | null;
}

export const useTimerState = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [accumulatedTime, setAccumulatedTime] = useState(0);
  const [lastStartTime, setLastStartTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setCurrentTime(0);
    setAccumulatedTime(0);
    setLastStartTime(null);
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    const now = Date.now();
    
    if (!isRunning && !isPaused) {
      setAccumulatedTime(0);
      setCurrentTime(0);
    }
    
    setLastStartTime(now);
    setIsRunning(true);
    setIsPaused(false);
    
    const id = setInterval(() => {
      const elapsed = Date.now() - now;
      setCurrentTime(accumulatedTime + elapsed);
    }, 10);
    
    intervalRef.current = id;
  }, [isRunning, isPaused, accumulatedTime]);

  const pauseTimer = useCallback(() => {
    if (isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
      setIsPaused(true);
      setAccumulatedTime(currentTime);
    }
  }, [isRunning, currentTime]);

  const stopTimer = useCallback(() => {
    resetState();
  }, [resetState]);

  return {
    // State
    isRunning,
    isPaused,
    currentTime,
    accumulatedTime,
    lastStartTime,
    
    // Actions
    startTimer,
    pauseTimer,
    stopTimer,
    resetState,
    clearTimer
  };
};