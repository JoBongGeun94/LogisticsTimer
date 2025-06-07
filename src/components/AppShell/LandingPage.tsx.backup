import React from 'react';
import { ModernLandingPage } from '../Landing/ModernLandingPage';

interface LandingPageProps {
  isDark: boolean;
  onStart: () => void;
}

/**
 * 랜딩 페이지 래퍼 (Dependency Inversion)
 * DIP: 구체적 구현체가 아닌 추상화에 의존
 */
export const LandingPage: React.FC<LandingPageProps> = (props) => {
  return <ModernLandingPage {...props} />;
};
