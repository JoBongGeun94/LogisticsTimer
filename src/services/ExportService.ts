
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
    const analysisSection = [
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
      ['번호', '측정자', '대상자', '시간(초)']
    ];

    const measurementRows = lapTimes.map((lap, index) => [
      (index + 1).toString(),
      lap.operator || '',
      lap.target || '',
      ((lap.time || 0) / 1000).toFixed(3)
    ]);

    return [...analysisSection, ...measurementRows];
  }
}

/**
 * CSV 파일 익스포터 (Single Responsibility Principle)
 */
class CSVFileExporter implements IFileExporter {
  export(data: string[][], filename: string): boolean {
    try {
      const csvContent = data.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
    return `분석보고서_${sessionName}_${date}_${time}.csv`;
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

      const data = this.dataFormatter.formatAnalysisData(session, lapTimes, analysis);
      const filename = FilenameGenerator.generateAnalysisFilename(session.name);
      
      return this.fileExporter.export(data, filename);
    } catch (error) {
      console.error('분석 보고서 내보내기 오류:', error);
      return false;
    }
  }
}
