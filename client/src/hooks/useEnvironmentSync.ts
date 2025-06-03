import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

// Single Responsibility: 환경 간 동기화 상태 관리
export const useEnvironmentSync = () => {
  const [syncStatus, setSyncStatus] = useState<{
    isLocal: boolean;
    isProduction: boolean;
    dbConnected: boolean;
    schemaVersion: string;
  }>({
    isLocal: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    dbConnected: false,
    schemaVersion: 'unknown'
  });

  // Open/Closed Principle: 확장 가능한 환경 검증
  const checkEnvironmentHealth = async () => {
    try {
      const healthResponse = await apiRequest('GET', '/api/health');
      const healthData = await healthResponse.json();
      
      const readyResponse = await apiRequest('GET', '/ready');
      const readyData = await readyResponse.json();
      
      setSyncStatus(prev => ({
        ...prev,
        dbConnected: readyData.database === 'connected',
        schemaVersion: healthData.version || 'unknown'
      }));
      
      return true;
    } catch (error) {
      console.error('Environment health check failed:', error);
      setSyncStatus(prev => ({
        ...prev,
        dbConnected: false
      }));
      return false;
    }
  };

  // Interface Segregation: 데이터베이스 연결만 확인
  const verifyDatabaseConnection = async () => {
    try {
      const response = await apiRequest('GET', '/ready');
      const data = await response.json();
      return data.database === 'connected';
    } catch {
      return false;
    }
  };

  // Dependency Inversion: 추상화된 동기화 상태 확인
  useEffect(() => {
    const interval = setInterval(() => {
      checkEnvironmentHealth();
    }, 30000); // 30초마다 확인

    // 초기 확인
    checkEnvironmentHealth();

    return () => clearInterval(interval);
  }, []);

  return {
    syncStatus,
    checkHealth: checkEnvironmentHealth,
    verifyDb: verifyDatabaseConnection
  };
};