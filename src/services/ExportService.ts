import { SessionData, LapTime, GageRRResult } from '../types';

export class ExportService {
  
  // 시간 포맷팅 (유틸리티 - SRP 원칙)
  static formatTime(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }

  // 기본 측정 데이터 내보내기 (기존 기능 유지)
  static exportMeasurementData(session: SessionData, lapTimes: LapTime[]): boolean {
    try {
      const csvContent = this.generateBasicCSV(session, lapTimes);
      this.downloadCSV(csvContent, `${session.name}_측정데이터_${new Date().toISOString().split('T')[0]}.csv`);
      return true;
    } catch (error) {
      console.error('기본 데이터 내보내기 실패:', error);
      return false;
    }
  }

  // 상세 분석 리포트 개선 (MSA 표준 포함)
  static exportDetailedAnalysis(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): boolean {
    try {
      const csvContent = this.generateDetailedAnalysisCSV(session, lapTimes, analysis);
      this.downloadCSV(csvContent, `${session.name}_상세분석_${new Date().toISOString().split('T')[0]}.csv`);
      return true;
    } catch (error) {
      console.error('상세 분석 내보내기 실패:', error);
      return false;
    }
  }

  // 기본 CSV 생성 (SRP 원칙)
  private static generateBasicCSV(session: SessionData, lapTimes: LapTime[]): string {
    const headers = [
      '세션명', '작업유형', '측정자', '대상자', '측정시간(ms)', 
      '포맷시간', '측정일시', '순번'
    ];
    
    const rows = lapTimes.map((lap, index) => [
      session.name,
      session.workType,
      lap.operator,
      lap.target,
      lap.time.toString(),
      this.formatTime(lap.time),
      lap.timestamp,
      (index + 1).toString()
    ]);
    
    return this.arrayToCSV([headers, ...rows]);
  }

  // 상세 분석 CSV 생성 (MSA 표준 포함)
  private static generateDetailedAnalysisCSV(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): string {
    const sections: string[] = [];
    
    // 1. 기본 정보
    sections.push('=== 측정 세션 정보 ===');
    sections.push(`세션명,${session.name}`);
    sections.push(`작업유형,${session.workType}`);
    sections.push(`측정자,${session.operators.join('; ')}`);
    sections.push(`대상자,${session.targets.join('; ')}`);
    sections.push(`총 측정횟수,${lapTimes.length}`);
    sections.push(`분석일시,${new Date().toLocaleString('ko-KR')}`);
    sections.push('');
    
    // 2. Gage R&R 분석 결과 (MSA 표준)
    sections.push('=== Gage R&R 분석 결과 (MSA 표준) ===');
    sections.push(`총 Gage R&R,${analysis.gageRRPercent}%`);
    sections.push(`반복성 (Repeatability),${analysis.repeatability}%`);
    sections.push(`재현성 (Reproducibility),${analysis.reproducibility}%`);
    sections.push(`부품간 변동,${analysis.partToPartVariation}%`);
    sections.push(`구별범주수 (NDC),${analysis.ndc}`);
    sections.push(`P/T 비율,${analysis.ptRatio}`);
    sections.push(`공정능력지수 (Cpk),${analysis.cpk}`);
    sections.push(`측정시스템 상태,${this.getStatusText(analysis.status)}`);
    sections.push('');
    
    // 3. ANOVA 분석 결과 (새로 추가)
    if (analysis.anovaResults) {
      sections.push('=== ANOVA 분산 분석 결과 ===');
      sections.push(`F-통계량 (측정자),${analysis.anovaResults.fOperators}`);
      sections.push(`F-통계량 (대상자),${analysis.anovaResults.fParts}`);
      sections.push(`F-통계량 (교호작용),${analysis.anovaResults.fInteraction}`);
      sections.push(`p-값 (측정자),${analysis.anovaResults.pValueOperators}`);
      sections.push(`p-값 (대상자),${analysis.anovaResults.pValueParts}`);
      sections.push('');
    }
    
    // 4. 분산 성분 분해 (새로 추가)
    if (analysis.varianceComponents) {
      sections.push('=== 분산 성분 분해 ===');
      sections.push(`반복성 분산,${analysis.varianceComponents.repeatability.toFixed(6)}`);
      sections.push(`재현성 분산,${analysis.varianceComponents.reproducibility.toFixed(6)}`);
      sections.push(`부품간 분산,${analysis.varianceComponents.partToPart.toFixed(6)}`);
      sections.push(`교호작용 분산,${analysis.varianceComponents.interaction.toFixed(6)}`);
      sections.push(`총 분산,${analysis.varianceComponents.total.toFixed(6)}`);
      sections.push('');
    }
    
    // 5. MSA 평가 기준
    sections.push('=== MSA 평가 기준 ===');
    sections.push('Gage R&R < 10%,우수 (Excellent)');
    sections.push('Gage R&R 10-30%,허용가능 (Acceptable)');
    sections.push('Gage R&R 30-50%,제한적 (Marginal)');
    sections.push('Gage R&R > 50%,불가 (Unacceptable)');
    sections.push('NDC ≥ 5,측정시스템 적합');
    sections.push('NDC < 5,측정시스템 부적합');
    sections.push('');
    
    // 6. 개선 권장사항
    sections.push('=== 개선 권장사항 ===');
    const recommendations = this.generateRecommendations(analysis);
    recommendations.forEach(rec => sections.push(rec));
    sections.push('');
    
    // 7. 측정 데이터 상세
    sections.push('=== 측정 데이터 상세 ===');
    const dataHeaders = ['순번', '측정자', '대상자', '측정시간(ms)', '포맷시간', '측정일시'];
    sections.push(dataHeaders.join(','));
    
    lapTimes.forEach((lap, index) => {
      const row = [
        (index + 1).toString(),
        lap.operator,
        lap.target,
        lap.time.toString(),
        this.formatTime(lap.time),
        lap.timestamp
      ];
      sections.push(row.join(','));
    });
    
    return sections.join('\n');
  }

  // 개선 권장사항 생성 (ISP 원칙 - 필요한 인터페이스만)
  private static generateRecommendations(analysis: GageRRResult): string[] {
    const recommendations: string[] = [];
    
    if (analysis.gageRRPercent > 50) {
      recommendations.push('• 측정시스템 즉시 개선 필요');
      recommendations.push('• 측정기 교정 및 측정자 재교육 권장');
    } else if (analysis.gageRRPercent > 30) {
      recommendations.push('• 측정시스템 개선 검토 필요');
      recommendations.push('• 측정 절차 표준화 권장');
    } else if (analysis.gageRRPercent > 10) {
      recommendations.push('• 측정시스템 양호, 지속적 모니터링 권장');
    } else {
      recommendations.push('• 측정시스템 우수');
    }
    
    if (analysis.ndc < 5) {
      recommendations.push('• 측정 해상도 개선 필요');
      recommendations.push('• 더 정밀한 측정기 사용 고려');
    }
    
    if (analysis.repeatability > analysis.reproducibility) {
      recommendations.push('• 반복성 개선 필요 - 측정기 점검');
    } else if (analysis.reproducibility > analysis.repeatability) {
      recommendations.push('• 재현성 개선 필요 - 측정자 교육');
    }
    
    return recommendations;
  }

  // 유틸리티 메서드들
  private static arrayToCSV(data: string[][]): string {
    return data.map(row => 
      row.map(cell => 
        cell.includes(',') || cell.includes('"') || cell.includes('\n') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(',')
    ).join('\n');
  }

  private static downloadCSV(content: string, filename: string): void {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private static getStatusText(status: string): string {
    const statusMap = {
      'excellent': '우수',
      'acceptable': '허용가능', 
      'marginal': '제한적',
      'unacceptable': '불가'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  }
}
