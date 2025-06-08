import React, { useState } from 'react';
import { Session } from '../../types';
import { Plus, Users, Target } from 'lucide-react';

interface SessionManagerProps {
  sessions: Session[];
  currentSession: Session | null;
  onCreateSession: (session: Omit<Session, 'id' | 'createdAt'>) => void;
  onSelectSession: (sessionId: string) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  sessions,
  currentSession,
  onCreateSession,
  onSelectSession
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [workType, setWorkType] = useState('');
  const [operators, setOperators] = useState<string[]>(['']);
  const [parts, setParts] = useState<string[]>(['']);

  const handleCreateSession = () => {
    if (!sessionName.trim() || !workType.trim()) return;
    
    const validOperators = operators.filter(op => op.trim());
    const validParts = parts.filter(part => part.trim());
    
    if (validOperators.length < 2 || validParts.length < 5) {
      alert('최소 2명의 측정자와 5개의 대상자가 필요합니다.');
      return;
    }

    onCreateSession({
      name: sessionName.trim(),
      workType: workType.trim(),
      operators: validOperators,
      parts: validParts,
      isActive: true
    });

    // 폼 초기화
    setSessionName('');
    setWorkType('');
    setOperators(['']);
    setParts(['']);
    setIsCreating(false);
  };

  const addOperator = () => setOperators([...operators, '']);
  const addPart = () => setParts([...parts, '']);
  
  const updateOperator = (index: number, value: string) => {
    const newOperators = [...operators];
    newOperators[index] = value;
    setOperators(newOperators);
  };
  
  const updatePart = (index: number, value: string) => {
    const newParts = [...parts];
    newParts[index] = value;
    setParts(newParts);
  };

  const removeOperator = (index: number) => {
    if (operators.length > 1) {
      setOperators(operators.filter((_, i) => i !== index));
    }
  };
  
  const removePart = (index: number) => {
    if (parts.length > 1) {
      setParts(parts.filter((_, i) => i !== index));
    }
  };

  if (isCreating) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold mb-4">새 측정 세션 생성</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              세션명
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="예: 포장 작업 효율성 측정"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작업 유형
            </label>
            <input
              type="text"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="예: 포장, 분류, 적재"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              측정자 (최소 2명)
            </label>
            {operators.map((operator, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => updateOperator(index, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                  placeholder={`측정자 ${index + 1}`}
                />
                {operators.length > 1 && (
                  <button
                    onClick={() => removeOperator(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addOperator}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              + 측정자 추가
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              측정 대상자 (최소 5개)
            </label>
            {parts.map((part, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={part}
                  onChange={(e) => updatePart(index, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                  placeholder={`대상자 ${index + 1}`}
                />
                {parts.length > 1 && (
                  <button
                    onClick={() => removePart(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addPart}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              + 대상자 추가
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={handleCreateSession}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            세션 생성
          </button>
          <button
            onClick={() => setIsCreating(false)}
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">측정 세션 관리</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          새 세션
        </button>
      </div>
      
      {currentSession && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800">{currentSession.name}</h4>
          <p className="text-blue-600 text-sm">{currentSession.workType}</p>
          <div className="flex gap-4 mt-2 text-sm text-blue-600">
            <span className="flex items-center gap-1">
              <Users size={14} />
              측정자: {currentSession.operators.length}명
            </span>
            <span className="flex items-center gap-1">
              <Target size={14} />
              대상자: {currentSession.parts.length}개
            </span>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              currentSession?.id === session.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h5 className="font-medium">{session.name}</h5>
            <p className="text-sm text-gray-600">{session.workType}</p>
            <div className="flex gap-4 mt-1 text-xs text-gray-500">
              <span>측정자: {session.operators.length}명</span>
              <span>대상자: {session.parts.length}개</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
