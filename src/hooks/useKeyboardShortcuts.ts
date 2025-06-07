import { useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  onToggleTimer?: () => void;
  onRecordLap?: () => void;
  onStopTimer?: () => void;
  onResetTimer?: () => void;
}

/**
 * 키보드 단축키 훅
 * SRP: 키보드 이벤트 처리만 담당
 * OCP: 새로운 단축키 추가 가능
 */
export const useKeyboardShortcuts = (
  handlers: KeyboardShortcutHandlers,
  dependencies: any[] = []
) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 입력 필드에서는 단축키 비활성화
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlers.onToggleTimer?.();
          break;
        case 'Enter':
          e.preventDefault();
          handlers.onRecordLap?.();
          break;
        case 'Escape':
          e.preventDefault();
          handlers.onStopTimer?.();
          break;
        case 'KeyR':
          e.preventDefault();
          handlers.onResetTimer?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, dependencies);
};
