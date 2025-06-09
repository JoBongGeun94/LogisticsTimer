import { useState, useCallback, useEffect } from 'react';
import { SessionData, LapTime } from '../types';

export interface DataIntegrityReport {
  isValid: boolean;
  orphanedLaps: LapTime[];
  duplicatedSessions: SessionData[];
  inconsistentData: string[];
  recommendations: string[];
}

export const useDataSynchronization = () => {
  const [dataVersion, setDataVersion] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // 데이터 버전 증가
  const incrementVersion = useCallback(() => {
    setDataVersion(prev => prev + 1);
    setLastSyncTime(new Date());
  }, []);
  
  // 데이터 무결성 검증
  const validateDataIntegrity = useCallback((
    sessions: SessionData[], 
    allLapTimes: LapTime[]
  ): DataIntegrityReport => {
    const sessionIds = new Set(sessions.map(s => s.id));
    const orphanedLaps = allLapTimes.filter(lap => !sessionIds.has(lap.sessionId));
    
    // 중복 세션 검사
    const sessionNames = sessions.map(s => s.name);
    const duplicatedSessions = sessions.filter((session, index) => 
      sessionNames.indexOf(session.name) !== index
    );
    
    // 데이터 일관성 검사
    const inconsistentData: string[] = [];
    
    sessions.forEach(session => {
      const sessionLaps = allLapTimes.filter(lap => lap.sessionId === session.id);
      
      // 세션의 lapTimes와 전체 lapTimes 일치성 검사
      if (session.lapTimes.length !== sessionLaps.length) {
        inconsistentData.push(`세션 "${session.name}"의 랩타임 개수 불일치`);
      }
      
      // 측정자/대상자 데이터 일관성 검사
      sessionLaps.forEach(lap => {
        if (!session.operators.includes(lap.operator)) {
          inconsistentData.push(`세션 "${session.name}"에 없는 측정자: ${lap.operator}`);
        }
        if (!session.targets.includes(lap.target)) {
          inconsistentData.push(`세션 "${session.name}"에 없는 대상자: ${lap.target}`);
        }
      });
    });
    
    // 권장사항 생성
    const recommendations: string[] = [];
    if (orphanedLaps.length > 0) {
      recommendations.push('고아 랩타임을 정리하거나 해당 세션을 복구하세요.');
    }
    if (duplicatedSessions.length > 0) {
      recommendations.push('중복된 세션명을 수정하세요.');
    }
    if (inconsistentData.length > 0) {
      recommendations.push('데이터 일관성을 확인하고 수정하세요.');
    }
    
    return {
      isValid: orphanedLaps.length === 0 && duplicatedSessions.length === 0 && inconsistentData.length === 0,
      orphanedLaps,
      duplicatedSessions,
      inconsistentData,
      recommendations
    };
  }, []);
  
  // 자동 정리 기능
  const cleanupOrphanedData = useCallback((
    sessions: SessionData[], 
    allLapTimes: LapTime[]
  ): { cleanedLapTimes: LapTime[]; removedCount: number } => {
    const sessionIds = new Set(sessions.map(s => s.id));
    const validLapTimes = allLapTimes.filter(lap => sessionIds.has(lap.sessionId));
    
    return {
      cleanedLapTimes: validLapTimes,
      removedCount: allLapTimes.length - validLapTimes.length
    };
  }, []);
  
  // 데이터 동기화 강제 실행
  const forceSynchronization = useCallback((
    sessions: SessionData[], 
    allLapTimes: LapTime[]
  ): { updatedSessions: SessionData[]; updatedLapTimes: LapTime[] } => {
    // 세션별 랩타임 재정렬
    const updatedSessions = sessions.map(session => ({
      ...session,
      lapTimes: allLapTimes.filter(lap => lap.sessionId === session.id)
    }));
    
    // 유효한 랩타임만 유지
    const { cleanedLapTimes } = cleanupOrphanedData(sessions, allLapTimes);
    
    incrementVersion();
    
    return {
      updatedSessions,
      updatedLapTimes: cleanedLapTimes
    };
  }, [cleanupOrphanedData, incrementVersion]);
  
  // 주기적 데이터 검증 (5분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      // 여기서는 실제 검증을 트리거하지 않고 마지막 동기화 시간만 업데이트
      setLastSyncTime(new Date());
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    dataVersion,
    lastSyncTime,
    incrementVersion,
    validateDataIntegrity,
    cleanupOrphanedData,
    forceSynchronization
  };
};
