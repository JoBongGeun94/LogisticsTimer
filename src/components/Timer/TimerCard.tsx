import { formatTime } from '@/utils/dateUtils';

interface TimerCardProps {
  currentTime: number;
  isRunning: boolean;
}

export const TimerCard: React.FC<TimerCardProps> = ({ currentTime, isRunning }) => {
  return (
    <div className={`timer-card ${isRunning ? 'running' : 'stopped'}`}>
      <div className="time-display">
        {formatTime(currentTime)}
      </div>
      <div className="status-indicator">
        {isRunning ? '실행 중' : '정지'}
      </div>
    </div>
  );
};
