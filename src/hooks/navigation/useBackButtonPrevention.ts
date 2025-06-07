import { useState, useEffect } from 'react';

export interface BackButtonPreventionResult {
  showBackWarning: boolean;
}

/**
 * 뒤로가기 방지 훅
 * SRP: 뒤로가기 방지 로직만 담당
 * OCP: 경고 메시지 커스터마이제이션 가능
 */
export const useBackButtonPrevention = (): BackButtonPreventionResult => {
  const [backPressCount, setBackPressCount] = useState(0);
  const [showBackWarning, setShowBackWarning] = useState(false);
  
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      
      if (backPressCount === 0) {
        setBackPressCount(1);
        setShowBackWarning(true);
        window.history.pushState(null, '', window.location.href);
        
        setTimeout(() => {
          setBackPressCount(0);
          setShowBackWarning(false);
        }, 2000);
      } else {
        window.history.back();
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [backPressCount]);

  return { showBackWarning };
};
