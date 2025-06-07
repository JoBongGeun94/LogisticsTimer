// components/Session/SessionList.tsx - 세션 목록 (SRP)
import React, { useCallback } from 'react';
import { useSession } from '../../contexts/SessionContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../UI/Button';
import { Play, Trash2, Calendar, Users, Target } from 'lucide-react';

/**
 * 세션 목록 컴포넌트
 * SRP: 세션 목록 표시와 관리만 담당
 */
export const SessionList: React.FC = () => {
  const { theme } = useTheme();
  const { sessions, currentSession, switchToSession, deleteSession } =
    useSession();
  const { showToast } = useToast();

  const handleSwitchSession = useCallback(
    (session: any) => {
      switchToSession(session);
      showToast(`'${session.name}' 세션으로 전환되었습니다.`, 'success');
    },
    [switchToSession, showToast]
  );

  const handleDeleteSession = useCallback(
    (sessionId: string, sessionName: string) => {
      if (window.confirm(`'${sessionName}' 세션을 삭제하시겠습니까?`)) {
        deleteSession(sessionId);
        showToast('세션이 삭제되었습니다.', 'info');
      }
    },
    [deleteSession, showToast]
  );

  return (
    <div
      className={`rounded-xl p-6 border shadow-lg ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}
    >
      <h2
        className={`text-xl font-bold mb-6 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}
      >
        세션 목록 ({sessions.length}개)
      </h2>

      {sessions.length === 0 ? (
        <div
          className={`text-center py-8 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          <p>등록된 세션이 없습니다.</p>
          <p className="text-sm mt-2">새 세션을 생성해주세요.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 rounded-lg border transition-all ${
                currentSession?.id === session.id
                  ? theme === 'dark'
                    ? 'bg-blue-900/30 border-blue-500'
                    : 'bg-blue-50 border-blue-500'
                  : theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-semibold truncate ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {session.name}
                    {currentSession?.id === session.id && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded-full">
                        활성
                      </span>
                    )}
                  </h3>
                  <div
                    className={`text-sm mt-1 space-y-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {session.workType} • {session.startTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{session.operators.length}명</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        <span>{session.targets.length}개</span>
                      </div>
                      <span>{session.lapTimes?.length || 0}회 측정</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {currentSession?.id !== session.id && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleSwitchSession(session)}
                      icon={<Play className="w-3 h-3" />}
                    >
                      전환
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      handleDeleteSession(session.id, session.name)
                    }
                    icon={<Trash2 className="w-3 h-3" />}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
