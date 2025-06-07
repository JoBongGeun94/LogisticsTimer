// components/Records/RecordsSection.tsx - 기록 섹션 (SRP)
import React, { useState, useMemo, useCallback } from 'react';
import { LapTimeList } from './LapTimeList';
import { Button } from '../UI/Button';
import { useSession } from '../../contexts/SessionContext';
import { useTimer } from '../../contexts/TimerContext';
import { useToast } from '../../contexts/ToastContext';
import { useDependencies } from '../../contexts/DependencyContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Download, Filter } from 'lucide-react';
import { formatTime } from '../../utils/dateUtils';

/**
 * 측정 기록 섹션 컴포넌트
 * SRP: 기록 표시와 필터링만 담당
 * OCP: 새로운 필터 조건 추가 가능
 */
export const RecordsSection: React.FC = () => {
  const { theme } = useTheme();
  const { currentSession } = useSession();
  const { lapTimes } = useTimer();
  const { showToast } = useToast();
  const { exporter, logger } = useDependencies();

  const [filterOperator, setFilterOperator] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredLapTimes = useMemo(() => {
    return lapTimes.filter((lap) => {
      return (
        (!filterOperator || lap.operator === filterOperator) &&
        (!filterTarget || lap.target === filterTarget)
      );
    });
  }, [lapTimes, filterOperator, filterTarget]);

  const handleExportData = useCallback(async () => {
    if (filteredLapTimes.length === 0) {
      showToast('내보낼 데이터가 없습니다.', 'warning');
      return;
    }

    if (!currentSession) {
      showToast('활성 세션이 없습니다.', 'error');
      return;
    }

    setLoading(true);
    try {
      const exportData = [
        ['세션 정보'],
        ['세션명', currentSession.name],
        ['작업유형', currentSession.workType],
        ['시작시간', currentSession.startTime],
        ['총 측정횟수', filteredLapTimes.length.toString()],
        [''],
        ['측정 데이터'],
        [
          '순번',
          '측정시간(초)',
          '측정시간(포맷)',
          '측정자',
          '대상자',
          '기록시간',
        ],
        ...filteredLapTimes.map((lap, index) => [
          (index + 1).toString(),
          (lap.time / 1000).toFixed(3),
          formatTime(lap.time),
          lap.operator,
          lap.target,
          lap.timestamp,
        ]),
      ];

      const filename = `측정기록-${currentSession.name}-${new Date().getTime()}.csv`;
      const success = await exporter.exportToCSV(exportData, filename);

      if (success) {
        showToast('데이터가 성공적으로 내보내졌습니다.', 'success');
        logger.info(`Data exported: ${filename}`);
      } else {
        showToast('데이터 내보내기에 실패했습니다.', 'error');
      }
    } catch (error) {
      showToast('데이터 내보내기 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filteredLapTimes, currentSession, exporter, showToast, logger]);

  const handleDeleteLap = useCallback(
    (lapId: number) => {
      // 타이머 컨텍스트에서 삭제 로직 구현 필요
      logger.info(`Lap deleted: ${lapId}`);
      showToast('측정 기록이 삭제되었습니다.', 'info');
    },
    [logger, showToast]
  );

  return (
    <div
      className={`rounded-xl p-6 border shadow-lg ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2
          className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}
        >
          측정 기록 ({filteredLapTimes.length}건)
        </h2>
        <Button
          variant="success"
          onClick={handleExportData}
          loading={loading}
          disabled={filteredLapTimes.length === 0}
          icon={<Download className="w-4 h-4" />}
        >
          내보내기
        </Button>
      </div>

      {/* 필터 */}
      {currentSession && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label
              className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              <Filter className="w-4 h-4 inline mr-1" />
              측정자 필터
            </label>
            <select
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">전체 측정자</option>
              {currentSession.operators.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className={`block text-sm font-medium mb-1 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              <Filter className="w-4 h-4 inline mr-1" />
              대상자 필터
            </label>
            <select
              value={filterTarget}
              onChange={(e) => setFilterTarget(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">전체 대상자</option>
              {currentSession.targets.map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 기록 목록 */}
      <LapTimeList
        lapTimes={filteredLapTimes}
        filterOperator={filterOperator}
        filterTarget={filterTarget}
        onDeleteLap={handleDeleteLap}
      />
    </div>
  );
};
