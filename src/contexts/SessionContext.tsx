import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { useDependencies } from './DependencyContext';

export interface SessionData {
  id: string;
  name: string;
  workType: string;
  operators: string[];
  targets: string[];
  usl?: number;
  lsl?: number;
  startTime: string;
  lapTimes: LapTime[];
}

export interface LapTime {
  id: number;
  time: number;
  operator: string;
  target: string;
  timestamp: string;
}

interface SessionContextValue {
  sessions: SessionData[];
  currentSession: SessionData | null;
  allLapTimes: LapTime[];
  createSession: (formData: Omit<SessionData, 'id' | 'startTime' | 'lapTimes'>) => SessionData;
  switchToSession: (session: SessionData) => void;
  addLapTime: (lapTime: LapTime) => void;
  removeLapTime: (lapId: number) => void;
  deleteSession: (sessionId: string) => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const { storage } = useDependencies();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const savedSessions = (await storage.getItem<SessionData[]>('sessions')) || [];
        setSessions(savedSessions);
        const currentSessionId = await storage.getItem<string>('currentSessionId');
        if (currentSessionId) {
          const current = savedSessions.find((s) => s.id === currentSessionId);
          if (current) setCurrentSession(current);
        }
      } catch (error) {
        // 에러 무시
      }
    };
    loadSessions();
  }, [storage]);

  const saveSessions = useCallback(async (newSessions: SessionData[]) => {
    try {
      await storage.setItem('sessions', newSessions);
      setSessions(newSessions);
    } catch (error) {
      // 에러 무시
    }
  }, [storage]);

  const createSession = useCallback((formData: Omit<SessionData, 'id' | 'startTime' | 'lapTimes'>): SessionData => {
    const newSession: SessionData = {
      ...formData,
      id: `session_${Date.now()}`,
      startTime: new Date().toLocaleString(),
      lapTimes: [],
    };
    const updatedSessions = [...sessions, newSession];
    saveSessions(updatedSessions);
    setCurrentSession(newSession);
    storage.setItem('currentSessionId', newSession.id);
    return newSession;
  }, [sessions, saveSessions, storage]);

  const switchToSession = useCallback((session: SessionData) => {
    setCurrentSession(session);
    storage.setItem('currentSessionId', session.id);
  }, [storage]);

  const addLapTime = useCallback((lapTime: LapTime) => {
    if (!currentSession) return;
    const updatedSession = {
      ...currentSession,
      lapTimes: [...currentSession.lapTimes, lapTime],
    };
    const updatedSessions = sessions.map((s) => s.id === currentSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    setCurrentSession(updatedSession);
  }, [currentSession, sessions, saveSessions]);

  const removeLapTime = useCallback((lapId: number) => {
    if (!currentSession) return;
    const updatedSession = {
      ...currentSession,
      lapTimes: currentSession.lapTimes.filter((lap) => lap.id !== lapId),
    };
    const updatedSessions = sessions.map((s) => s.id === currentSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    setCurrentSession(updatedSession);
  }, [currentSession, sessions, saveSessions]);

  const deleteSession = useCallback((sessionId: string) => {
    const updatedSessions = sessions.filter((s) => s.id !== sessionId);
    saveSessions(updatedSessions);
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      storage.removeItem('currentSessionId');
    }
  }, [sessions, currentSession, saveSessions, storage]);

  const allLapTimes = sessions.flatMap((session) => session.lapTimes);

  const value: SessionContextValue = {
    sessions,
    currentSession,
    allLapTimes,
    createSession,
    switchToSession,
    addLapTime,
    removeLapTime,
    deleteSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextValue => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};
