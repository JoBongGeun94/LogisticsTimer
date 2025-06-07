import { useTheme } from '../../contexts/ThemeContext';
// components/Session/SessionSelector.tsx - 세션 선택 컴포넌트 (SRP)
import React from 'react';
import { SessionData } from '../../contexts/SessionContext';

interface SessionSelectorProps {
  currentSession: SessionData | null;
  operators: string[];
  targets: string[];
  currentOperator: string;
  currentTarget: string;
  onOperatorChange: (operator: string) => void;
  onTargetChange: (target: string) => void;
  onCreateSession: () => void;
}

/**
 * 세션 및 측정자/대상자 선택 컴포넌트
 * SRP: 선택 UI만 담당
 * ISP: 필요한 props만 받음
 */
export const SessionSelector: React.FC<SessionSelectorProps> = ({
  currentSession,
  operators,
  targets,
  currentOperator,
  currentTarget,
  onOperatorChange,
  onTargetChange,
  onCreateSession,
}) => {
  const { theme } = useTheme();

  const inputClass = `w-full px-3 py-2 rounded-lg border transition-colors ${
    theme === 'dark'
      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500'
      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
  }`;

  return (
    <div className="space-y-4">
      {/* 세션 정보 */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className={`font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            {currentSession ? currentSession.name : '세션이 선택되지 않음'}
          </h3>
          {currentSession && (
            <p
              className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {currentSession.workType} • {currentSession.startTime}
            </p>
          )}
        </div>
        <button
          onClick={onCreateSession}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          새 세션
        </button>
      </div>

      {/* 측정자 선택 */}
      <div>
        <label
          className={`block text-sm font-medium mb-1 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          측정자
        </label>
        <select
          className={inputClass}
          value={currentOperator}
          onChange={(e) => onOperatorChange(e.target.value)}
          disabled={!currentSession}
        >
          <option value="">측정자 선택</option>
          {operators.map((operator) => (
            <option key={operator} value={operator}>
              {operator}
            </option>
          ))}
        </select>
      </div>

      {/* 대상자 선택 */}
      <div>
        <label
          className={`block text-sm font-medium mb-1 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}
        >
          대상자
        </label>
        <select
          className={inputClass}
          value={currentTarget}
          onChange={(e) => onTargetChange(e.target.value)}
          disabled={!currentSession}
        >
          <option value="">대상자 선택</option>
          {targets.map((target) => (
            <option key={target} value={target}>
              {target}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
