import { SessionData, LapTime } from '../types';

export class ExportService {
  /**
   * 측정 데이터를 CSV 형식으로 내보내기
   */
  static exportMeasurementData(session: SessionData, lapTimes: LapTime[]): boolean {
    try {
      const timestamp = new Date().toLocaleString('ko-KR').replace(/[/:]/g, '-');
      
      let csvContent = '\uFEFF'; // UTF-8 BOM for Korean compatibility
      
      // 헤더 정보
      csvContent += `물류 인시수 측정 데이터\n`;
      csvContent += `세션명,${session.name}\n`;
      csvContent += `작업유형,${session.workType}\n`;
      csvContent += `측정자,"${session.operators.join(', ')}"\n`;
      csvContent += `대상자,"${session.targets.join(', ')}"\n`;
      csvContent += `총 측정 횟수,${lapTimes.length}\n`;
      csvContent += `생성일시,${timestamp}\n\n`;
      
      // 데이터 헤더
      csvContent += `측정번호,측정시간(초),측정자,대상자,타임스탬프\n`;
      
      // 측정 데이터
      lapTimes.forEach((lap, index) => {
        const timeInSeconds = (lap.time / 1000).toFixed(3);
        csvContent += `${index + 1},${timeInSeconds},${lap.operator},${lap.target},${lap.timestamp}\n`;
      });
      
      // 파일 다운로드
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const filename = `측정데이터_${session.name}_${timestamp}.csv`;
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      return true;
    } catch (error) {
      console.error('CSV export failed:', error);
      return false;
    }
  }

  /**
   * 상세 분석 결과를 CSV 형식으로 내보내기
   */
  static exportDetailedAnalysis(session: SessionData, lapTimes: LapTime[], analysis: any): boolean {
    try {
      const timestamp = new Date().toLocaleString('ko-KR').replace(/[/:]/g, '-');
      
      let csvContent = '\uFEFF'; // UTF-8 BOM
      
      // 헤더 정보
      csvContent += `물류 인시수 측정 상세 분석 보고서\n`;
      csvContent += `생성일시,${timestamp}\n`;
      csvContent += `세션명,${session.name}\n`;
      csvContent += `작업유형,${session.workType}\n`;
      csvContent += `측정자,"${session.operators.join(', ')}"\n`;
      csvContent += `대상자,"${session.targets.join(', ')}"\n`;
      csvContent += `총 측정 횟수,${lapTimes.length}\n\n`;
      
      // Gage R&R 분석 결과
      csvContent += `=== Gage R&R 분석 결과 ===\n`;
      csvContent += `Gage R&R,${analysis.gageRRPercent.toFixed(2)}%\n`;
      csvContent += `반복성,${analysis.repeatability.toFixed(4)}\n`;
      csvContent += `재현성,${analysis.reproducibility.toFixed(4)}\n`;
      csvContent += `NDC,${analysis.ndc}\n`;
      csvContent += `Cpk,${analysis.cpk.toFixed(4)}\n`;
      csvContent += `상태 평가,${this.getStatusText(analysis.status)}\n\n`;
      
      // 통계 요약
      csvContent += `=== 통계 요약 ===\n`;
      const times = lapTimes.map(lap => lap.time);
      const mean = times.reduce((sum, t) => sum + t, 0) / times.length;
      const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      
      csvContent += `평균 시간,${this.formatTime(mean)}\n`;
      csvContent += `표준편차,${(stdDev / 1000).toFixed(4)}초\n`;
      csvContent += `변동계수,${((stdDev / mean) * 100).toFixed(2)}%\n`;
      csvContent += `최소값,${this.formatTime(Math.min(...times))}\n`;
      csvContent += `최대값,${this.formatTime(Math.max(...times))}\n\n`;
      
      // 측정 데이터
      csvContent += `=== 측정 데이터 ===\n`;
      csvContent += `측정번호,측정시간,측정자,대상자,타임스탬프\n`;
      
      lapTimes.forEach((lap, index) => {
        csvContent += `${index + 1},${this.formatTime(lap.time)},${lap.operator},${lap.target},${lap.timestamp}\n`;
      });
      
      // 파일 다운로드
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const filename = `상세분석_${session.name}_${timestamp}.csv`;
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      return true;
    } catch (error) {
      console.error('Detailed analysis export failed:', error);
      return false;
    }
  }

  /**
   * 시간을 포맷팅 (MM:SS.mmm)
   */
  static formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  /**
   * 상태 텍스트 변환
   */
  private static getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'excellent': '우수',
      'acceptable': '양호',
      'marginal': '보통',
      'unacceptable': '불량'
    };
    return statusMap[status] || status;
  }

  /**
   * 강화된 분석 결과 내보내기 (신규)
   */
  static exportEnhancedAnalysis(
    session: SessionData,
    lapTimes: LapTime[],
    analysis: any
  ): boolean {
    try {
      const timestamp = new Date().toLocaleString('ko-KR').replace(/[/:]/g, '-');
      
      let csvContent = '\uFEFF'; // UTF-8 BOM
      
      // 헤더 정보
      csvContent += `물류 인시수 측정 상세 분석 보고서\n`;
      csvContent += `생성일시,${timestamp}\n`;
      csvContent += `세션명,${session.name}\n`;
      csvContent += `작업유형,${session.workType}\n`;
      csvContent += `측정자,"${session.operators.join(', ')}"\n`;
      csvContent += `대상자,"${session.targets.join(', ')}"\n`;
      csvContent += `총 측정 횟수,${lapTimes.length}\n\n`;
      
      // MSA 분석 결과
      csvContent += `=== MSA 분석 결과 ===\n`;
      csvContent += `Gage R&R,${analysis.gageRRPercent.toFixed(2)}%\n`;
      csvContent += `반복성,${analysis.repeatability.toFixed(4)}\n`;
      csvContent += `재현성,${analysis.reproducibility.toFixed(4)}\n`;
      csvContent += `P/T 비율,${analysis.ptRatio.toFixed(4)}\n`;
      csvContent += `NDC,${analysis.ndc}\n`;
      csvContent += `Cpk,${analysis.cpk.toFixed(4)}\n`;
      csvContent += `상태 평가,${analysis.status}\n\n`;
      
      // 신뢰구간
      csvContent += `=== 95% 신뢰구간 ===\n`;
      csvContent += `Gage R&R 하한,${analysis.confidenceIntervals.gageRR.lower.toFixed(4)}\n`;
      csvContent += `Gage R&R 상한,${analysis.confidenceIntervals.gageRR.upper.toFixed(4)}\n\n`;
      
      // 기본 통계
      csvContent += `=== 기본 통계량 ===\n`;
      csvContent += `평균,${analysis.basicStatistics.mean.toFixed(4)}\n`;
      csvContent += `표준편차,${analysis.basicStatistics.stdDev.toFixed(4)}\n`;
      csvContent += `변동계수,${analysis.basicStatistics.cv.toFixed(2)}%\n`;
      csvContent += `범위,${analysis.basicStatistics.range.toFixed(4)}\n\n`;
      
      // 권장사항
      csvContent += `=== 개선 권장사항 ===\n`;
      analysis.recommendations.forEach((rec: string, index: number) => {
        csvContent += `${index + 1},${rec}\n`;
      });
      csvContent += `\n`;
      
      // 원시 데이터
      csvContent += `=== 원시 측정 데이터 ===\n`;
      csvContent += `측정번호,측정시간(초),측정자,대상자,타임스탬프\n`;
      
      lapTimes.forEach((lap, index) => {
        csvContent += `${index + 1},${(lap.time / 1000).toFixed(3)},${lap.operator},${lap.target},${lap.timestamp}\n`;
      });
      
      // 파일 다운로드
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const filename = `상세분석_${session.name}_${timestamp}.csv`;
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      return true;
    } catch (error) {
      console.error('Enhanced analysis export failed:', error);
      return false;
    }
  }
}
