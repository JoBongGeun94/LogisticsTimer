// components/UI/BackWarning.tsx - 뒤로가기 경고 (SRP)
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface BackWarningProps {
  isVisible: boolean;
}

/**
 * 뒤로가기 경고 컴포넌트
 * SRP: 경고 메시지 표시만 담당
 */
export const BackWarning: React.FC<BackWarningProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md mx-auto">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">
          한 번 더 뒤로가기 하면 종료됩니다
        </span>
      </div>
    </div>
  );
};
