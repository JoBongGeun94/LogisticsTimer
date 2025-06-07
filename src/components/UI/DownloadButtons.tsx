import React from 'react';
import { Download, PieChart } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useSession } from '../../contexts/SessionContext';
import { downloadMeasurementData } from '../../utils/downloadUtils';
import { LapTime } from '../../types/LapTime';

interface DownloadButtonsProps {
  lapTimes: LapTime[];
  onDetailedAnalysis: () => void;
}

export const DownloadButtons: React.FC<DownloadButtonsProps> = ({ lapTimes, onDetailedAnalysis }) => {
  const { showToast } = useToast();
  const { currentSession } = useSession();

  const handleDownloadData = () => {
    if (lapTimes.length === 0) {
      showToast('다운로드할 측정 기록이 없습니다.', 'warning');
      return;
    }

    if (!currentSession) {
      showToast('활성 세션이 없습니다.', 'error');
      return;
    }

    if (downloadMeasurementData(lapTimes, currentSession)) {
      showToast('측정 기록이 다운로드되었습니다.', 'success');
    } else {
      showToast('다운로드에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={handleDownloadData}
        disabled={lapTimes.length === 0}
        className="bg-green-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>측정기록</span>
      </button>
      
      <button
        onClick={onDetailedAnalysis}
        disabled={lapTimes.length < 6}
        className="bg-purple-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
      >
        <PieChart className="w-4 h-4" />
        <span>상세분석</span>
      </button>
    </div>
  );
};
