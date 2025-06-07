import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSession } from '../../contexts/SessionContext';
import { useTimer } from '../../contexts/TimerContext';
import { useToast } from '../../contexts/ToastContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { SessionSelector } from '../Session/SessionSelector';
import { SessionModal } from '../Session/SessionModal';
import { EnhancedTimerDisplay } from '../Timer/EnhancedTimerDisplay';
import { RecordsSection } from '../Records/RecordsSection';
import { DetailedAnalysisPage } from '../Analysis/DetailedAnalysisPage';
import { AnalysisCards } from '../Analysis/AnalysisCards';
import { DownloadButtons } from '../UI/DownloadButtons';

export const MainContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { currentSession } = useSession();
  const { lapTimes, isRunning, currentTime, toggleTimer, recordLap, stopTimer, resetTimer } = useTimer();
  const { showToast } = useToast();
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // 키보드 단축키 적용
  useKeyboardShortcuts({
    onToggleTimer: () => {
      if (!currentSession) {
        showToast('먼저 작업 세션을 생성해주세요.', 'warning');
        return;
      }
      toggleTimer();
    },
    onRecordLap: () => {
      if (!currentSession) {
        showToast('먼저 작업 세션을 생성해주세요.', 'warning');
        return;
      }
      recordLap();
    },
    onStopTimer: stopTimer,
    onResetTimer: resetTimer
  }, [currentSession, toggleTimer, recordLap, stopTimer, resetTimer]);

  // 상세 분석 페이지 표시
  if (showDetailedAnalysis && currentSession && lapTimes.length >= 6) {
    return (
      <DetailedAnalysisPage
        session={currentSession}
        lapTimes={lapTimes}
        onBack={() => setShowDetailedAnalysis(false)}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {/* 작업 세션 섹션 */}
      <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
        <SessionSelector />
        <SessionModal />
      </div>

      {/* 정밀 타이머 섹션 */}
      <EnhancedTimerDisplay />

      {/* 실시간 분석 (6개 이상일 때) */}
      {lapTimes.length > 0 && (
        <AnalysisCards lapTimes={lapTimes} />
      )}

      {/* 다운로드 버튼들 */}
      <DownloadButtons 
        lapTimes={lapTimes}
        onDetailedAnalysis={() => {
          if (lapTimes.length < 6) {
            showToast('상세 분석을 위해서는 최소 6개의 측정 기록이 필요합니다.', 'warning');
          } else {
            setShowDetailedAnalysis(true);
          }
        }}
      />

      {/* 측정 기록 섹션 */}
      <RecordsSection />
    </div>
  );
};
