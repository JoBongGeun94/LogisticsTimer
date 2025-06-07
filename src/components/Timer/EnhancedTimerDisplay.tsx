import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSession } from '../../contexts/SessionContext';
import { useTimer } from '../../contexts/TimerContext';
import { useToast } from '../../contexts/ToastContext';
import { Clock, Play, Pause, Square, Target } from 'lucide-react';

const formatTime = (ms: number): string => {
  if (ms < 0) return '00:00.00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

export const EnhancedTimerDisplay: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { currentSession } = useSession();
  const { currentTime, isRunning, toggleTimer, recordLap, stopTimer } = useTimer();
  const { showToast } = useToast();

  const handleToggleTimer = () => {
    if (!currentSession) {
      showToast('먼저 작업 세션을 생성해주세요.', 'warning');
      return;
    }
    toggleTimer();
  };

  const handleRecordLap = () => {
    if (!currentSession) {
      showToast('먼저 작업 세션을 생성해주세요.', 'warning');
      return;
    }
    if (currentTime === 0) {
      showToast('측정 시간이 0입니다. 타이머를 시작해주세요.', 'warning');
      return;
    }
    recordLap();
    showToast('측정이 완료되었습니다.', 'success');
  };

  return (
    <div className={`${theme.card} rounded-lg p-6 shadow-sm border ${theme.border}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="w-6 h-6 text-blue-500" />
        <h2 className={`font-semibold ${theme.text}`}>정밀 타이머</h2>
      </div>

      <div className="text-center">
        <div className={`text-4xl sm:text-5xl font-mono font-bold mb-6 ${theme.text} tracking-wider`}>
          {formatTime(currentTime)}
        </div>
        <div className={`text-sm ${theme.textMuted} mb-6`}>
          {isRunning ? '측정 중...' : '대기 중'}
        </div>

        {/* 키보드 단축키 안내 */}
        <div className={`text-xs ${theme.textMuted} mb-4 p-2 rounded ${theme.surface}`}>
          단축키: <kbd className="px-1 bg-gray-200 dark:bg-gray-700 rounded">Space</kbd> 시작/정지 | 
          <kbd className="px-1 bg-gray-200 dark:bg-gray-700 rounded ml-1">Enter</kbd> 측정완료 | 
          <kbd className="px-1 bg-gray-200 dark:bg-gray-700 rounded ml-1">Esc</kbd> 중지
        </div>

        {/* 버튼 레이아웃 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={handleToggleTimer}
            disabled={!currentSession}
            className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-colors ${
              isRunning
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            } disabled:bg-gray-300 disabled:cursor-not-allowed`}
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span className="text-sm">{isRunning ? '정지' : '시작'}</span>
          </button>

          <button
            onClick={handleRecordLap}
            disabled={!currentSession}
            className="flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Target className="w-5 h-5" />
            <span className="text-sm">측정완료</span>
          </button>

          <button
            onClick={stopTimer}
            className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-colors ${
              isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
          >
            <Square className="w-5 h-5" />
            <span className="text-sm">중지</span>
          </button>
        </div>
      </div>
    </div>
  );
};
