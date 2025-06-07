import { useState, useCallback } from 'react';
import { SessionData, SessionFormData, LapTime } from '../types';
import { validateSessionData } from '../utils';

interface UseSessionReturn {
  sessions: SessionData[];
  currentSession: SessionData | null;
  createSession: (formData: SessionFormData) => boolean;
  setCurrentSession: (session: SessionData | null) => void;
  updateSessionLapTimes: (sessionId: string, lapTimes: LapTime[]) => void;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
}

export const useSession = (): UseSessionReturn => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);

  const createSession = useCallback((formData: SessionFormData): boolean => {
    if (!validateSessionData(formData)) {
      return false;
    }

    const newSession: SessionData = {
      id: Date.now().toString(),
      name: formData.sessionName,
      workType: formData.workType,
      operators: formData.operators.filter(op => op.trim()),
      targets: formData.targets.filter(tg => tg.trim()),
      lapTimes: [],
      startTime: new Date().toLocaleString('ko-KR'),
      isActive: true
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);
    return true;
  }, []);

  const updateSessionLapTimes = useCallback((sessionId: string, lapTimes: LapTime[]) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, lapTimes }
        : session
    ));
    
    setCurrentSession(prev => 
      prev?.id === sessionId 
        ? { ...prev, lapTimes }
        : prev
    );
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    setCurrentSession(prev => prev?.id === sessionId ? null : prev);
  }, []);

  const clearAllSessions = useCallback(() => {
    setSessions([]);
    setCurrentSession(null);
  }, []);

  return {
    sessions,
    currentSession,
    createSession,
    setCurrentSession,
    updateSessionLapTimes,
    deleteSession,
    clearAllSessions
  };
};
