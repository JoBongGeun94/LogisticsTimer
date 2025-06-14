
import { LapTime, SessionData, GageRRResult } from '../types';

/**
 * 포맷터 인터페이스 (Interface Segregation Principle)
 */
interface ITimeFormatter {
  format(milliseconds: number): string;
}

interface IDataFormatter {
  formatMeasurementData(session: SessionData, lapTimes: LapTime[]): string[][];
  formatAnalysisData(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): string[][];
}

interface IFileExporter {
  export(data: string[][], filename: string): boolean;
}

/**
 * 시간 포맷터 (Single Responsibility Principle)
 */
class TimeFormatter implements ITimeFormatter {
  format(milliseconds: number): string {
    if (typeof milliseconds !== 'number' || isNaN(milliseconds) || milliseconds < 0) {
      return '00:00.00';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((milliseconds % 1000) / 10);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
}

/**
 * 데이터 포맷터 (Single Responsibility Principle)
 */
class DataFormatter implements IDataFormatter {
  constructor(private timeFormatter: ITimeFormatter) {}

  formatMeasurementData(session: SessionData, lapTimes: LapTime[]): string[][] {
    const headers = ['세션명', '작업유형', '측정자', '대상자', '측정시간', '타임스탬프'];
    const rows = lapTimes.map(lap => [
      session.name || '',
      session.workType || '',
      lap.operator || '',
      lap.target || '',
      this.timeFormatter.format(lap.time || 0),
      lap.timestamp || ''
    ]);

    return [headers, ...rows];
  }

  formatAnalysisData(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): string[][] {
    // 상세분석 모달과 완전 동기화된 Excel 보고서 생성 (특수문자 제거)
    const statusText = analysis.status === 'excellent' ? '우수' :
                      analysis.status === 'acceptable' ? '양호' :
                      analysis.status === 'marginal' ? '보통' : '불량';

    const analysisSection = [
      ['=== 상세분석 결과 ===', '', '', ''],
      ['', '', '', ''],
      ['종합 평가', statusText, '', ''],
      ['', '', '', ''],
      ['핵심 지표', '', '', ''],
      ['분석 항목', '값', '단위', '비고'],
      ['Gage R&R', (analysis.gageRRPercent || 0).toFixed(1), '%', '측정 시스템 변동'],
      ['ICC (2,1)', (analysis.icc || 0).toFixed(3), '', '급내상관계수'],
      ['Delta Pair', (analysis.deltaPair || 0).toFixed(3), 's', '쌍별 차이'],
      ['변동계수 (CV)', (analysis.cv || 0).toFixed(1), '%', '일관성 지표'],
      ['', '', '', ''],
      ['분산 구성요소', '', '', ''],
      ['구성요소', '값', '단위', '설명'],
      ['반복성 (Repeatability)', (analysis.repeatability || 0).toFixed(4), 'ms', '같은 조건 측정 변동'],
      ['재현성 (Reproducibility)', (analysis.reproducibility || 0).toFixed(4), 'ms', '측정자간 변동'],
      ['대상자 변동 (Part Variation)', (analysis.partVariation || 0).toFixed(4), 'ms', '대상자간 차이'],
      ['총 변동 (Total Variation)', (analysis.totalVariation || 0).toFixed(4), 'ms', '전체 측정 변동'],
      ['', '', '', ''],
      ['작업시간 분석', '', '', ''],
      ['지표명', '값', '단위', '평가'],
      ['급내상관계수 (ICC)', (analysis.icc || 0).toFixed(3), '', '측정자간 신뢰성'],
      ['변동계수 (CV)', (analysis.cv || 0).toFixed(1), '%', '작업 일관성'],
      ['99% 달성시간 (Q99)', ((analysis.q99 || 0) / 1000).toFixed(2), '초', '99% 완료 시간'],
      ['표준시간 설정 가능', analysis.isReliableForStandard ? '가능' : '불가', '', '신뢰성 기준'],
      ['', '', '', ''],
      ['해석 및 권장사항', '', '', ''],
      ['평가', '권장사항', '', '']
    ];

    // 상태별 권장사항 추가 (상세분석 모달과 동일)
    let recommendations: string[][] = [];
    if (analysis.status === 'excellent') {
      recommendations = [
        ['우수한 측정 시스템', '모든 측정에 신뢰할 수 있습니다', '', ''],
        ['', '현재 측정 절차를 유지하세요', '', '']
      ];
    } else if (analysis.status === 'acceptable') {
      recommendations = [
        ['양호한 측정 시스템', '대부분의 용도로 사용 가능합니다', '', ''],
        ['', '정기적인 교정을 권장합니다', '', '']
      ];
    } else if (analysis.status === 'marginal') {
      recommendations = [
        ['제한적 사용 권장', '측정 절차 개선이 필요합니다', '', ''],
        ['', '교육 및 장비 점검을 고려하세요', '', '']
      ];
    } else {
      recommendations = [
        ['측정 시스템 개선 필요', '즉시 개선 조치가 필요합니다', '', ''],
        ['', '장비 교체나 절차 전면 개선을 고려하세요', '', '']
      ];
    }

    const sessionInfo = [
      ['', '', '', ''],
      ['세션 정보', '', '', ''],
      ['항목', '내용', '', ''],
      ['세션명', session.name || '', '', ''],
      ['작업유형', session.workType || '', '', ''],
      ['측정자', (session.operators || []).join(', '), '', ''],
      ['대상자', (session.targets || []).join(', '), '', ''],
      ['총 측정 횟수', lapTimes.length.toString(), '회', ''],
      ['분석 일시', new Date().toLocaleString('ko-KR'), '', ''],
      ['', '', '', ''],
      ['측정 기록 상세', '', '', ''],
      ['번호', '측정자', '대상자', '시간(초)', '타임스탬프']
    ];

    const measurementRows = lapTimes.map((lap, index) => [
      (index + 1).toString(),
      lap.operator || '',
      lap.target || '',
      ((lap.time || 0) / 1000).toFixed(3),
      lap.timestamp || ''
    ]);

    return [...analysisSection, ...recommendations, ...sessionInfo, ...measurementRows];
  }
}

/**
 * CSV 파일 익스포터 (Single Responsibility Principle)
 */
class CSVFileExporter implements IFileExporter {
  export(data: string[][], filename: string): boolean {
    try {
      // 데이터 유효성 검증 및 정리
      const validData = data.filter(row => Array.isArray(row) && row.length > 0);
      
      // CSV 형식으로 변환 (특수문자 이스케이프 처리)
      const csvContent = validData.map(row => 
        row.map(cell => {
          const cellStr = String(cell || '');
          // 쉼표, 줄바꿈, 따옴표가 포함된 경우 따옴표로 감싸기
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ).join('\n');
      
      // UTF-8 BOM 추가로 Excel에서 한글 깨짐 방지
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('CSV 내보내기 오류:', error);
      return false;
    }
  }
}

/**
 * 파일명 생성기 (Single Responsibility Principle)
 */
class FilenameGenerator {
  static generateMeasurementFilename(sessionName: string): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `측정기록_${sessionName}_${date}_${time}.csv`;
  }

  static generateAnalysisFilename(sessionName: string): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `상세분석보고서_${sessionName}_${date}_${time}.csv`;
  }
}

/**
 * 익스포트 팩토리 (Dependency Inversion Principle)
 */
class ExportFactory {
  static createTimeFormatter(): ITimeFormatter {
    return new TimeFormatter();
  }

  static createDataFormatter(): IDataFormatter {
    return new DataFormatter(this.createTimeFormatter());
  }

  static createFileExporter(): IFileExporter {
    return new CSVFileExporter();
  }
}

/**
 * 통합 익스포트 서비스 (Facade Pattern + Open/Closed Principle)
 */
export class ExportService {
  private static timeFormatter = ExportFactory.createTimeFormatter();
  private static dataFormatter = ExportFactory.createDataFormatter();
  private static fileExporter = ExportFactory.createFileExporter();

  static formatTime(milliseconds: number): string {
    return this.timeFormatter.format(milliseconds);
  }

  static exportMeasurementData(session: SessionData, lapTimes: LapTime[]): boolean {
    try {
      if (!session || !lapTimes || lapTimes.length === 0) {
        return false;
      }

      const data = this.dataFormatter.formatMeasurementData(session, lapTimes);
      const filename = FilenameGenerator.generateMeasurementFilename(session.name);
      
      return this.fileExporter.export(data, filename);
    } catch (error) {
      console.error('측정 데이터 내보내기 오류:', error);
      return false;
    }
  }

  static exportDetailedAnalysis(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): boolean {
    try {
      if (!session || !lapTimes || !analysis) {
        return false;
      }

      // 상세분석 모달과 동일한 분석 지표들을 포함한 데이터 생성
      const enhancedAnalysis = {
        ...analysis,
        // 상세분석 모달에서 사용하는 모든 지표들 포함
        icc: analysis.icc || 0,
        cv: analysis.cv || 0,
        q99: analysis.q99 || 0,
        isReliableForStandard: analysis.isReliableForStandard || false,
        deltaPair: analysis.deltaPair || 0
      };

      const data = this.dataFormatter.formatAnalysisData(session, lapTimes, enhancedAnalysis);
      const filename = FilenameGenerator.generateAnalysisFilename(session.name);
      
      return this.fileExporter.export(data, filename);
    } catch (error) {
      console.error('상세분석 보고서 내보내기 오류:', error);
      return false;
    }
  }
}
