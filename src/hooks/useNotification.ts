import { useState, useCallback } from 'react';
import { ToastProps } from '../types';

interface UseNotificationReturn {
  toast: ToastProps;
  showToast: (message: string, type: ToastProps['type']) => void;
  hideToast: () => void;
}

export const useNotification = (): UseNotificationReturn => {
  const [toast, setToast] = useState<ToastProps>({
    message: '',
    type: 'info',
    isVisible: false,
    onClose: () => {}
  });

  const showToast = useCallback((message: string, type: ToastProps['type']) => {
    setToast({
      message,
      type,
      isVisible: true,
      onClose: () => setToast(prev => ({ ...prev, isVisible: false }))
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  return { toast, showToast, hideToast };
};
