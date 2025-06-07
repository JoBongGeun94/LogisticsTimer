import { LapTime } from '../types/LapTime';
import { createCSVContent, downloadCSVFile, generateFileName } from './csvUtils';

const formatTime = (ms: number): string => {
  if (ms < 0) return '00:00.00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

export const downloadMeasurementData = (lapTimes: LapTime[], session: any): boolean => {
  const measurementData: (string | number)[][] = [
    ['=== 측정 기록 ==='],
    [''],
    ['세션명', session.name || ''],
    ['작업유형', session.workType || ''],
    ['측정일시', session.startTime || ''],
    ['총 측정횟수', lapTimes.length],
    [''],
    ['순번', '측정시간', '측정자', '대상자', '기록시간'],
    ...lapTimes.map((lap, index) => [
      index + 1,
      formatTime(lap.time),
      lap.operator || '',
      lap.target || '',
      lap.timestamp || ''
    ])
  ];

  const csvContent = createCSVContent(measurementData);
  const filename = generateFileName('측정기록', session.name || '세션');
  
  return downloadCSVFile(csvContent, filename);
};
