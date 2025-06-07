import { SessionData, LapTime } from '../types';
import { createCSVContent, convertMeasurementDataToCSV, downloadCSVFile, generateFileName, formatTime } from '../utils';

export class ExportService {
  static exportMeasurementData(session: SessionData, lapTimes: LapTime[]): boolean {
    if (lapTimes.length === 0) {
      throw new Error('다운로드할 측정 기록이 없습니다.');
    }

    if (!session) {
      throw new Error('활성 세션이 없습니다.');
    }

    // 시간 포맷팅이 적용된 랩타임 생성
    const formattedLapTimes = lapTimes.map(lap => ({
      ...lap,
      formattedTime: formatTime(lap.time)
    }));

    const measurementData = convertMeasurementDataToCSV(session, formattedLapTimes);
    const csvContent = createCSVContent(measurementData);
    const filename = generateFileName('측정기록', session.name);

    return downloadCSVFile(csvContent, filename);
  }

  static exportAnalysisReport(session: SessionData, analysis: any): boolean {
    const statusMap: Record<string, string> = {
      'excellent': '우수',
      'acceptable': '양호',
      'marginal': '보통',
      'unacceptable': '불량'
    };

    const reportData = [
      ['=== Gage R&R 분석 보고서 ==='],
      [''],
      ['세션 정보'],
      ['세션명', session.name],
      ['작업유형', session.workType],
      ['분석일시', new Date().toLocaleString('ko-KR')],
      [''],
      ['분석 결과'],
      ['Gage R&R (%)', analysis.gageRRPercent.toFixed(1) + '%'],
      ['반복성', analysis.repeatability.toFixed(3)],
      ['재현성', analysis.reproducibility.toFixed(3)],
      ['Cpk', analysis.cpk.toFixed(2)],
      ['NDC', analysis.ndc],
      ['상태', statusMap[analysis.status] || analysis.status],
      [''],
      ['ANOVA 분석'],
      ['측정자 변동 (%)', analysis.anova.operatorPercent.toFixed(1) + '%'],
      ['대상자 변동 (%)', analysis.anova.partPercent.toFixed(1) + '%'],
      ['상호작용 (%)', analysis.anova.interactionPercent.toFixed(1) + '%'],
      ['오차 (%)', analysis.anova.errorPercent.toFixed(1) + '%'],
      [''],
      ['해석'],
      ['전체 평가', analysis.interpretation.overall],
      ['반복성 평가', analysis.interpretation.repeatability],
      ['재현성 평가', analysis.interpretation.reproducibility],
      [''],
      ['권장사항'],
      ...analysis.interpretation.recommendations.map((rec: string, index: number) => [
        `${index + 1}.`, rec
      ])
    ];

    const csvContent = createCSVContent(reportData);
    const filename = generateFileName('분석보고서', session.name);

    return downloadCSVFile(csvContent, filename);
  }
}
