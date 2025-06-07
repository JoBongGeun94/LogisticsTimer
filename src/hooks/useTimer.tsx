import { useState, useRef, useEffect, useCallback } from 'react';
import { LapTime } from '../types/Timer';

export const useTimer = (sessionId?: string) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // 타이머 로직
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime(Date.now() - startTimeRef.current);
      }, 10);
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

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
    } else {
      startTimeRef.current = Date.now() - currentTime;
      setIsRunning(true);
    }
  }, [isRunning, currentTime]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
    setLapTimes([]);
  }, []);

  const recordLap = useCallback(
    (operator: string, target: string) => {
      if (!sessionId || !operator || !target || currentTime === 0) {
        return null;
      }

      const newLap: LapTime = {
        id: Date.now(),
        time: currentTime,
        timestamp: new Date().toLocaleString('ko-KR'),
        operator,
        target,
      };

      setLapTimes((prev) => [...prev, newLap]);
      setIsRunning(false);
      setCurrentTime(0);

      return newLap;
    },
    [currentTime, sessionId]
  );

  const deleteLapTime = useCallback((lapId: number) => {
    setLapTimes((prev) => prev.filter((lap) => lap.id !== lapId));
  }, []);

  return {
    currentTime,
    isRunning,
    lapTimes,
    toggleTimer,
    stopTimer,
    resetTimer,
    recordLap,
    deleteLapTime,
    setLapTimes,
  };
};
