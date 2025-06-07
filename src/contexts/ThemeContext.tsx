import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Theme, THEME_COLORS } from '../types/Theme';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true); // 기본 다크모드

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const theme = THEME_COLORS[isDark ? 'dark' : 'light'];

  // 다크모드 HTML 클래스 적용
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // 로컬 스토리지 연동
  useEffect(() => {
    const savedTheme = localStorage.getItem('logistics-timer-theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('logistics-timer-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
