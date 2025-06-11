export class ExportService {
  static formatTime(milliseconds: number): string {
    if (typeof milliseconds !== 'number' || isNaN(milliseconds) || milliseconds < 0) {
      return '00:00.00';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((milliseconds % 1000) / 10);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  static exportMeasurementData(session: any, lapTimes: any[]): boolean {
    try {
      if (!session || !lapTimes || lapTimes.length === 0) {
        return false;
      }

      const csvContent = [
        ['세션명', '작업유형', '측정자', '대상자', '측정시간', '타임스탬프'],
        ...lapTimes.map(lap => [
          session.name || '',
          session.workType || '',
          lap.operator || '',
          lap.target || '',
          this.formatTime(lap.time || 0),
          lap.timestamp || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `측정기록_${session.name}_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('CSV 내보내기 오류:', error);
      return false;
    }
  }

  // 🔧 수정된 상세분석 내보내기 (안전성 개선)
  static exportDetailedAnalysis(session: any, lapTimes: any[], analysis: any): boolean {
    try {
      if (!session || !lapTimes || !analysis) {
        return false;
      }

      const analysisContent = [
        ['분석 항목', '값', '단위', '평가'],
        ['Gage R&R', (analysis.gageRRPercent || 0).toFixed(1), '%', analysis.status || ''],
        ['반복성', (analysis.repeatability || 0).toFixed(4), 'ms', ''],
        ['재현성', (analysis.reproducibility || 0).toFixed(4), 'ms', ''],
        ['대상자 변동', (analysis.partVariation || 0).toFixed(4), 'ms', ''],
        ['총 변동', (analysis.totalVariation || 0).toFixed(4), 'ms', ''],
        ['NDC', (analysis.ndc || 0).toString(), '개', ''],
        ['P/T 비율', (analysis.ptRatio || 0).toFixed(3), '', ''],
        ['Cpk', (analysis.cpk || 0).toFixed(2), '', ''],
        ['', '', '', ''],
        ['측정 데이터', '', '', ''],
        ['세션명', session.name || '', '', ''],
        ['작업유형', session.workType || '', '', ''],
        ['총 측정 횟수', lapTimes.length.toString(), '회', ''],
        ['', '', '', ''],
        ['측정 기록', '', '', ''],
        ['번호', '측정자', '대상자', '시간(초)'],
        ...lapTimes.map((lap, index) => [
          (index + 1).toString(),
          lap.operator || '',
          lap.target || '',
          ((lap.time || 0) / 1000).toFixed(3)
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([analysisContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `분석보고서_${session.name}_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('분석 보고서 내보내기 오류:', error);
      return false;
    }
  }
}
