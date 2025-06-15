import { useState, useCallback } from 'react';
import { SessionData, LapTime } from '../types';
import { ValidationService } from '../services/ValidationService';
import { useLocalStorage } from './useLocalStorage';

interface UseSessionManagerProps {
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const useSessionManager = ({ showToast }: UseSessionManagerProps) => {
  const [sessions, setSessions] = useLocalStorage<SessionData[]>('logisticsTimer_sessions', []);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [currentOperator, setCurrentOperator] = useState('');
  const [currentTarget, setCurrentTarget] = useState('');

  const createSession = useCallback((
    sessionName: string,
    workType: string,
    operators: string[],
    targets: string[]
  ) => {
    const validation = ValidationService.validateSessionCreation(
      sessionName,
      workType,
      operators,
      targets
    );

    if (!validation.isValid) {
      showToast(validation.message!, 'warning');
      return false;
    }

    if (!validation.canAnalyze && validation.analysisMessage) {
      showToast(validation.analysisMessage, 'info');
    }

    const validOperators = operators.filter(op => op.trim());
    const validTargets = targets.filter(tg => tg.trim());

    const newSession: SessionData = {
      id: Date.now().toString(),
      name: sessionName,
      workType,
      operators: validOperators,
      targets: validTargets,
      lapTimes: [],
      startTime: new Date().toLocaleString('ko-KR'),
      isActive: true
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);
    setCurrentOperator(newSession.operators[0]);
    setCurrentTarget(newSession.targets[0]);

    showToast('새 세션이 생성되었습니다.', 'success');
    return true;
  }, [showToast, setSessions]);

  const updateSessionLapTimes = useCallback((lapTimes: LapTime[]) => {
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        lapTimes: lapTimes,
        operators: currentSession.operators,
        targets: currentSession.targets
      };

      setCurrentSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
    }
  }, [currentSession, setSessions]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));

    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      setCurrentOperator('');
      setCurrentTarget('');
    }

    showToast('세션이 삭제되었습니다.', 'success');
  }, [currentSession, showToast, setSessions]);

  const switchToSession = useCallback((session: SessionData) => {
    console.log(`🔄 세션 전환: ${currentSession?.name || 'None'} → ${session.name}`);

    // 세션 전환 시 순서대로 상태 업데이트 (동기화 보장)
    setCurrentSession(session);
    setCurrentOperator(session.operators[0] || '');
    setCurrentTarget(session.targets[0] || '');

    // 통계 분석 캐시 무효화를 위한 이벤트 발생
    window.dispatchEvent(new CustomEvent('sessionChanged', { 
      detail: { 
        newSessionId: session.id, 
        newOperator: session.operators[0] || '',
        newTarget: session.targets[0] || ''
      } 
    }));

    showToast(`세션 '${session.name}'으로 전환되었습니다.`, 'success');
  }, [currentSession, showToast]);

  const resetAllSessions = useCallback(() => {
    setSessions([]);
    setCurrentSession(null);
    setCurrentOperator('');
    setCurrentTarget('');
    showToast('모든 데이터가 초기화되었습니다.', 'success');
  }, [showToast, setSessions]);

  return {
    sessions,
    currentSession,
    currentOperator,
    currentTarget,
    setCurrentOperator,
    setCurrentTarget,
    createSession,
    updateSessionLapTimes,
    deleteSession,
    switchToSession,
    resetAllSessions
  };
};