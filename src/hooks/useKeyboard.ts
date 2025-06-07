import { useEffect } from 'react';
import { KeyboardEventConfig } from '../types';

export const useKeyboard = (
  events: KeyboardEventConfig[],
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // 입력 필드에서는 키보드 이벤트 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const event = events.find(event => event.code === e.code);
      if (event) {
        if (event.preventDefault !== false) {
          e.preventDefault();
        }
        event.action();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [events, enabled]);
};
