import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  enabled: boolean;
  onToggleTheme?: () => void;
  onOpenHelp?: () => void;
  onOpenSession?: () => void;
}

export const useKeyboardShortcuts = ({
  enabled,
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = () => {};
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
};
