import { SessionData, LapTime, GageRRAnalysis } from '../types';

export class ExportService {
  static formatTime(ms: number): string {
    if (ms < 0) return '00:00.00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  static generateFileName(prefix: string, sessionName: string): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${year}${month}${day}${hour}${minute}`;
    
    const safeName = sessionName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    return `${prefix}-${safeName}-(${timestamp}).csv`;
  }

  static createCSVContent(data: (string | number)[][]): string {
    const csvRows = data.map(row => 
      row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    );
    
    return '\ufeff' + csvRows.join('\n');
  }

  static downloadCSVFile(content: string, filename: string): boolean {
    try {
      const blob = new Blob([content], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      return true;
    } catch (error) {
      console.error('CSV download failed:', error);
      return false;
    }
  }

  static exportMeasurementData(session: SessionData, lapTimes: LapTime[]): boolean {
    const measurementData: (string | number)[][] = [
      ['=== 측정 기록 ==='],
      [''],
      ['세션명', session.name],
      ['작업유형', session.workType],
      ['측정일시', session.startTime],
      ['총 측정횟수', lapTimes.length],
      [''],
      ['순번', '측정시간', '측정자', '대상자', '기록시간'],
      ...lapTimes.map((lap, index) => [
        index + 1,
        this.formatTime(lap.time),
        lap.operator,
        lap.target,
        lap.timestamp
      ])
    ];

    const csvContent = this.createCSVContent(measurementData);
    const filename = this.generateFileName('측정기록', session.name);
    
    return this.downloadCSVFile(csvContent, filename);
  }

  static exportDetailedAnalysis(session: SessionData, lapTimes: LapTime[], analysis: GageRRAnalysis): boolean {
    const analysisData: (string | number)[][] = [
      ['=== Gage R&R 상세 분석 보고서 ==='],
      [''],
      ['세션명', session.name],
      ['작업유형', session.workType],
      ['측정일시', session.startTime],
      ['총 측정횟수', lapTimes.length],
      [''],
      ['=== 분석 결과 ==='],
      ['Gage R&R 비율 (%)', analysis.gageRRPercent.toFixed(1)],
      ['측정시스템 상태', analysis.status === 'excellent' ? '우수' :
        analysis.status === 'acceptable' ? '양호' :
        analysis.status === 'marginal' ? '보통' : '불량'],
      ['공정 능력 지수 (Cpk)', analysis.cpk.toFixed(2)],
      ['구별 범주 수 (NDC)', analysis.ndc],
      ['위험도', analysis.interpretation.riskLevel === 'low' ? '낮음' :
        analysis.interpretation.riskLevel === 'medium' ? '보통' : '높음'],
      [''],
      ['=== ANOVA 분석 ==='],
      ['측정자 기여율 (%)', analysis.anova.operatorPercent.toFixed(1)],
      ['대상자 기여율 (%)', analysis.anova.partPercent.toFixed(1)],
      ['상호작용 기여율 (%)', analysis.anova.interactionPercent.toFixed(1)],
      ['오차 기여율 (%)', analysis.anova.errorPercent.toFixed(1)],
      [''],
      ['=== 개선 권장사항 ==='],
      ...analysis.interpretation.recommendations.map((rec, idx) => [`${idx + 1}. ${rec}`]),
      [''],
      ['=== 측정 기록 ==='],
      ['순번', '측정시간', '측정자', '대상자', '기록시간'],
      ...lapTimes.map((lap, index) => [
        index + 1,
        this.formatTime(lap.time),
        lap.operator,
        lap.target,
        lap.timestamp
      ])
    ];

    const csvContent = this.createCSVContent(analysisData);
    const filename = this.generateFileName('상세분석보고서', session.name);
    
    return this.downloadCSVFile(csvContent, filename);
  }
}
