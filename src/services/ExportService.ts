import { LapTime } from '../types';

export class ExportService {
  static exportToCSV(measurements: LapTime[], filename: string = 'measurements'): void {
    if (measurements.length === 0) {
      throw new Error('내보낼 측정 데이터가 없습니다.');
    }

    // CSV 헤더
    const headers = [
      'ID',
      '측정시간(초)',
      '타임스탬프',
      '측정자ID',
      '대상자ID',
      '세션ID'
    ];

    // CSV 데이터 변환
    const csvData = measurements.map(measurement => [
      measurement.id,
      measurement.time.toFixed(3),
      measurement.timestamp.toISOString(),
      measurement.operatorId,
      measurement.partId,
      measurement.sessionId
    ]);

    // CSV 문자열 생성
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // BOM 추가 (UTF-8 인코딩을 위해)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // 다운로드 링크 생성
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // 사용되지 않는 매개변수에 언더스코어 추가
  static exportDetailedReport(_measurements: LapTime[], _analysisResult?: any): void {
    // 상세 분석 보고서 생성 (향후 구현)
    console.log('상세 보고서 기능은 향후 구현 예정입니다.');
  }
}
