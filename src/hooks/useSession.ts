import { useState, useCallback } from 'react';
import { Session, LapTime } from '../types';

export interface UseSessionReturn {
  sessions: Session[];
  currentSession: Session | null;
  measurements: LapTime[];
  createSession: (sessionData: Omit<Session, 'id' | 'createdAt'>) => void;
  selectSession: (sessionId: string) => void;
  addMeasurement: (measurement: LapTime) => void;
  clearMeasurements: () => void;
}

export const useSession = (): UseSessionReturn => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [measurements, setMeasurements] = useState<LapTime[]>([]);

  const createSession = useCallback((sessionData: Omit<Session, 'id' | 'createdAt'>) => {
    const newSession: Session = {
      ...sessionData,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    
    setSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);
    setMeasurements([]); // 새 세션 시작 시 측정 데이터 초기화
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      // 해당 세션의 측정 데이터만 필터링 (실제로는 localStorage나 API에서 가져와야 함)
      setMeasurements(prev => prev.filter(m => m.sessionId === sessionId));
    }
  }, [sessions]);

  const addMeasurement = useCallback((measurement: LapTime) => {
    setMeasurements(prev => [...prev, measurement]);
  }, []);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);

  return {
    sessions,
    currentSession,
    measurements,
    createSession,
    selectSession,
    addMeasurement,
    clearMeasurements
  };
};
