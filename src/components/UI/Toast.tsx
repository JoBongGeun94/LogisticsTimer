import { memo, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

export const Toast = memo<ToastProps>(
  ({ message, type, isVisible, onClose }) => {
    useEffect(() => {
      if (isVisible) {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
      }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const typeConfig = {
      warning: { style: 'bg-yellow-500 text-white', icon: AlertCircle },
      info: { style: 'bg-blue-500 text-white', icon: Info },
    };

    const { style, icon: Icon } = typeConfig[type];

    return (
      <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-right duration-300">
        <div
          className={`${style} px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={onClose}
            className="ml-2 hover:bg-white/20 rounded p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
);
