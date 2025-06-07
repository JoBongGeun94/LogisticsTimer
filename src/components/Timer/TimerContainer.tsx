// components/Timer/TimerContainer.tsx - 타이머 전체 컨테이너 (SRP)
import React, { useCallback } from 'react';
import { TimerCard } from './TimerCard';
import { TimerControls } from './TimerControls';
import { useTimer } from '../../contexts/TimerContext';
import { useSession } from '../../contexts/SessionContext';
import { useToast } from '../../contexts/ToastContext';

interface TimerContainerProps {
  currentOperator: string;
  currentTarget: string;
}

/**
 * 타이머 전체 기능을 담당하는 컨테이너
 * SRP: 타이머 관련 로직 조합만 담당
 * DIP: Context를 통한 의존성 주입
 */
export const TimerContainer: React.FC<TimerContainerProps> = ({
  currentOperator,
  currentTarget,
}) => {
  const {
    currentTime,
    isRunning,
    startTimer,
    stopTimer,
    pauseTimer,
    resetTimer,
    recordLap,
  } = useTimer();

  const { currentSession, addLapTime } = useSession();
  const { showToast } = useToast();

  const handleRecordLap = useCallback(() => {
    if (!currentOperator || !currentTarget) {
      showToast('측정자와 대상자를 선택해주세요.', 'warning');
      return;
    }

    if (currentTime === 0) {
      showToast('측정 시간이 0입니다. 타이머를 시작해주세요.', 'warning');
      return;
    }

    const newLap = recordLap(currentOperator, currentTarget);
    if (newLap) {
      addLapTime(newLap);
      showToast('측정이 완료되었습니다.', 'success');
    }
  }, [
    currentOperator,
    currentTarget,
    currentTime,
    recordLap,
    addLapTime,
    showToast,
  ]);

  const handleStart = useCallback(() => {
    if (!currentSession) {
      showToast('먼저 작업 세션을 생성해주세요.', 'warning');
      return;
    }
    startTimer();
  }, [currentSession, startTimer, showToast]);

  const handleReset = useCallback(() => {
    resetTimer();
    showToast('타이머가 초기화되었습니다.', 'info');
  }, [resetTimer, showToast]);

  const isDisabled = !currentSession || !currentOperator || !currentTarget;

  return (
    <div className="space-y-6">
      <TimerCard currentTime={currentTime} isRunning={isRunning} />
      <TimerControls
        isRunning={isRunning}
        onStart={handleStart}
        onPause={pauseTimer}
        onStop={stopTimer}
        onReset={handleReset}
        onRecordLap={handleRecordLap}
        disabled={isDisabled}
      />
    </div>
  );
};
