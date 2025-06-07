import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Zap, Sun, Moon, HelpCircle, LogOut } from 'lucide-react';
import { HelpModal } from '../Modal/HelpModal';

export const AppHeader: React.FC = () => {
  const { isDark, toggleTheme, theme } = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  const handleExit = () => {
    window.location.reload();
  };

  return (
    <>
      <div className={`${theme.card} shadow-sm border-b ${theme.border} sticky top-0 z-40`}>
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Zap className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className={`text-base font-bold ${theme.text} truncate`}>
                  물류 인시수 측정 타이머
                </h1>
                <div className={`text-xs ${theme.textMuted} truncate`}>
                  측정부터 분석까지 한번에  
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}
                title="다크모드 토글"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}
                title="도움말"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={handleExit}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:text-red-500 ${theme.surfaceHover}`}
                title="시스템 종료"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
};
