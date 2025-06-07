// contexts/DependencyContext.tsx - 의존성 주입 컨텍스트 (DIP)
import React, { createContext, useContext, ReactNode } from 'react';
import { IDependencyContainer } from '../interfaces/IDependencies';
import { DependencyContainer } from '../implementations/DependencyContainer';

const DependencyContext = createContext<IDependencyContainer | null>(null);

interface DependencyProviderProps {
  children: ReactNode;
  container?: IDependencyContainer; // 테스트용 주입 가능
}

export const DependencyProvider: React.FC<DependencyProviderProps> = ({
  children,
  container = DependencyContainer.getInstance(),
}) => {
  return (
    <DependencyContext.Provider value={container}>
      {children}
    </DependencyContext.Provider>
  );
};

export const useDependencies = (): IDependencyContainer => {
  const context = useContext(DependencyContext);
  if (!context) {
    throw new Error('useDependencies must be used within DependencyProvider');
  }
  return context;
};
