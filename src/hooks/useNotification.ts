import { useState, useCallback } from 'react';
import { ToastProps } from '../types';

export const useNotification = () => {
  const [toast, setToast] = useState<ToastProps | null>(null);

  const showToast = useCallback((
    message: string,
    type: ToastProps['type'] = 'info',
    duration: number = 3000
  ) => {
    setToast({
      message,
      type,
      isVisible: true,
      duration,
      onClose: () => setToast((prev: ToastProps | null) => 
        prev ? { ...prev, isVisible: false } : null
      )
    });

    if (duration > 0) {
      setTimeout(() => {
        setToast((prev: ToastProps | null) => 
          prev ? { ...prev, isVisible: false } : null
        );
      }, duration);
    }
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev: ToastProps | null) => 
      prev ? { ...prev, isVisible: false } : null
    );
  }, []);

  return {
    toast,
    showToast,
    hideToast
  };
};
