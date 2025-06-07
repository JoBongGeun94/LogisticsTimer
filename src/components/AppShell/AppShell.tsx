import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { LandingPage } from './LandingPage';
import { AppHeader } from './AppHeader';
import { MainContent } from './MainContent';
import { useBackButtonPrevention } from '../../hooks/navigation/useBackButtonPrevention';
import { AlertTriangle } from 'lucide-react';

export const AppShell: React.FC = () => {
  const { isDark } = useTheme();
  const [showLanding, setShowLanding] = useState(true);
  const { showBackWarning } = useBackButtonPrevention();

  // 뒤로가기 경고 컴포넌트
  const BackWarning = () => {
    if (!showBackWarning) return null;

    return (
      <div className="fixed bottom-4 left-4 right-4 z-[70] animate-in slide-in-from-bottom duration-300">
        <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">한 번 더 뒤로가기 하면 종료됩니다</span>
        </div>
      </div>
    );
  };

  if (showLanding) {
    return (
      <>
        <LandingPage isDark={isDark} onStart={() => setShowLanding(false)} />
        <BackWarning />
      </>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <AppHeader />
      <MainContent />
      <BackWarning />
    </div>
  );
};
