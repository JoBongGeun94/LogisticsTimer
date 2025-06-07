import { LapTime } from '../types/Timer';
import { useEffect } from 'react';
// contexts/TimerContext.tsx - 타이머 관리 (SRP)
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useSession } from './SessionContext';
import { useDependencies } from './DependencyContext';

interface TimerContextValue {
  currentTime: number;
  isRunning: boolean;
  lapTimes: LapTime[];
  startTimer: () => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  recordLap: (operator: string, target: string) => LapTime | null;
}

const TimerContext = createContext<TimerContextValue | null>(null);

interface TimerProviderProps {
  children: ReactNode;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  const { logger } = useDependencies();
  const { currentSession } = useSession();

  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);

  const intervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    if (!currentSession) {
      return;
    }

    if (!isRunning) {
      startTimeRef.current = Date.now() - currentTime;
      setIsRunning(true);

      intervalRef.current = setInterval(() => {
        setCurrentTime(Date.now() - startTimeRef.current);
      }, 10);

    }
  }, [currentSession, isRunning, currentTime, logger]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, [logger]);

  const pauseTimer = useCallback(() => {
    stopTimer();
  }, [stopTimer, logger]);

  const resetTimer = useCallback(() => {
    stopTimer();
    setCurrentTime(0);
    setLapTimes([]);
  }, [stopTimer, logger]);

  const recordLap = useCallback(
    (operator: string, target: string): LapTime | null => {
      if (currentTime === 0) {
        return null;
      }

      const lapTime: LapTime = {
        id: Date.now(),
        time: currentTime,
        operator,
        target,
        timestamp: new Date().toLocaleString(),
      };

      setLapTimes((prev) => [...prev, lapTime]);
      return lapTime;
    },
    [currentTime, logger]
  );

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const value: TimerContextValue = {
    currentTime,
    isRunning,
    lapTimes,
    startTimer,
    stopTimer,
    pauseTimer,
    resetTimer,
    recordLap,
  };

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
};

export const useTimer = (): TimerContextValue => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within TimerProvider');
  }
  return context;
};
