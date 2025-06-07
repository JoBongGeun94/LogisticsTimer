import { useState, useRef, useEffect, useCallback } from 'react';
import { UseTimerReturn } from '../types';
import { TIMER_CONFIG } from '../constants';

export const useTimer = (_sessionId?: string): UseTimerReturn => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const toggle = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      startTimeRef.current = Date.now() - currentTime;
      setIsRunning(true);
    }
  }, [isRunning, currentTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
  }, []);

  const recordLap = useCallback((_operator: string, _target: string) => {
    // 이 함수는 App.tsx에서 오버라이드될 예정
    setIsRunning(false);
    setCurrentTime(0);
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime(Date.now() - startTimeRef.current);
      }, TIMER_CONFIG.UPDATE_INTERVAL);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  return { currentTime, isRunning, toggle, stop, reset, recordLap };
};
