import { useState, useEffect, useMemo } from 'react';
import { Theme, ThemeMode } from '../types';
import { THEME_COLORS } from '../constants';

interface UseThemeReturn {
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const useTheme = (): UseThemeReturn => {
  const [isDark, setIsDark] = useState(true);

  const theme = useMemo(() => THEME_COLORS[isDark ? 'dark' : 'light'], [isDark]);

  const toggleTheme = () => setIsDark(!isDark);
  const setTheme = (mode: ThemeMode) => setIsDark(mode === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return { isDark, theme, toggleTheme, setTheme };
};
