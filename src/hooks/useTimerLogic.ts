
import { useState, useRef, useEffect, useCallback } from 'react';
import { LapTime, SessionData } from '../types';
import { ValidationService } from '../services/ValidationService';

interface UseTimerLogicProps {
  currentSession: SessionData | null;
  currentOperator: string;
  currentTarget: string;
  onLapRecorded: (lap: LapTime) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useTimerLogic = ({
  currentSession,
  currentOperator,
  currentTarget,
  onLapRecorded,
  showToast
}: UseTimerLogicProps) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
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
    if (!currentSession) {
      showToast('먼저 작업 세션을 생성해주세요.', 'warning');
      return;
    }

    if (isRunning) {
      setIsRunning(false);
    } else {
      startTimeRef.current = Date.now() - currentTime;
      setIsRunning(true);
    }
  }, [isRunning, currentTime, currentSession, showToast]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
  }, []);

  const recordLap = useCallback(() => {
    const validation = ValidationService.validateMeasurement(
      currentSession,
      currentOperator,
      currentTarget,
      currentTime
    );

    if (!validation.isValid) {
      showToast(validation.message!, 'warning');
      return;
    }

    const newLap: LapTime = {
      id: Date.now(),
      time: currentTime,
      timestamp: new Date().toLocaleString('ko-KR'),
      operator: currentOperator,
      target: currentTarget,
      sessionId: currentSession!.id
    };

    onLapRecorded(newLap);

    // 랩타임 기록 시 자동 중지 및 시간 초기화
    setIsRunning(false);
    setCurrentTime(0);

    showToast('측정이 완료되었습니다.', 'success');
  }, [currentTime, currentSession, currentOperator, currentTarget, onLapRecorded, showToast]);

  return {
    currentTime,
    isRunning,
    toggleTimer,
    stopTimer,
    resetTimer,
    recordLap
  };
};
