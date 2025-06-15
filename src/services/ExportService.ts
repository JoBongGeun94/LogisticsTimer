import { LapTime, SessionData, GageRRResult } from '../types';
import { AnalysisService } from './AnalysisService';

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

  private safeFormat(value: number | undefined | null, decimals: number): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '0.' + '0'.repeat(decimals);
    }
    return Number(value).toFixed(decimals);
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'excellent': return '우수';
      case 'acceptable': return '양호';
      case 'marginal': return '보통';
      case 'unacceptable': return '불량';
      default: return '미정의';
    }
  }

  private calculateBasicStats(lapTimes: LapTime[]): any {
    const times = lapTimes.map(lap => lap.time);
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / (times.length - 1);
    const stdDev = Math.sqrt(variance);

    // 웹앱과 동일한 변동계수 계산 (AnalysisService와 일치)
    const webAppAnalysis = AnalysisService.calculateGageRR(lapTimes);
    const webAppCV = webAppAnalysis.cv || 0;

    return {
      count: times.length,
      mean: mean,
      stdDev: stdDev,
      min: Math.min(...times),
      max: Math.max(...times),
      range: Math.max(...times) - Math.min(...times),
      cv: webAppCV  // 웹앱 기준 변동계수 사용
    };
  }

  formatMeasurementData(session: SessionData, lapTimes: LapTime[]): string[][] {
    // 기본 통계 계산
    const stats = this.calculateBasicStats(lapTimes);

    // 헤더 정보
    const header = [
      ['=== 측정기록 데이터 ==='],
      ['세션명', session.name || ''],
      ['작업유형', session.workType || ''],
      ['측정자', (session.operators || []).join(', ')],
      ['대상자', (session.targets || []).join(', ')],
      ['측정일시', session.startTime || ''],
      ['총 측정횟수', stats.count.toString()],
      [''],
    ];

    // 기본 통계 요약
    const summary = [
      ['=== 기본 통계 요약 ==='],
      ['항목', '값', '단위'],
      ['평균 시간', this.safeFormat(stats.mean / 1000, 3), '초'],
      ['표준편차', this.safeFormat(stats.stdDev / 1000, 3), '초'],
      ['최소 시간', this.safeFormat(stats.min / 1000, 3), '초'],
      ['최대 시간', this.safeFormat(stats.max / 1000, 3), '초'],
      ['시간 범위', this.safeFormat(stats.range / 1000, 3), '초'],
      ['변동계수 (CV)', this.safeFormat(stats.cv, 1), '%'],
      [''],
    ];

    // 측정 데이터 테이블
    const dataHeader = [
      ['=== 상세 측정 데이터 ==='],
      ['번호', '측정자', '대상자', '측정시간(초)', '측정시간(분:초)', '타임스탬프']
    ];

    const dataRows = lapTimes.map((lap, index) => [
      (index + 1).toString(),
      lap.operator || '',
      lap.target || '',
      ((lap.time || 0) / 1000).toFixed(3),
      this.timeFormatter.format(lap.time || 0),
      lap.timestamp || ''
    ]);

    return [
      ...header,
      ...summary,
      ...dataHeader,
      ...dataRows
    ];
  }

  formatAnalysisData(session: SessionData, lapTimes: LapTime[], analysis: GageRRResult): string[][] {
    // 데이터 유효성 검증
    if (!analysis || typeof analysis !== 'object') {
      return [['오류', '분석 결과를 불러올 수 없습니다']];
    }

    if (!session || !lapTimes || lapTimes.length === 0) {
      return [['오류', '세션 또는 측정 데이터를 불러올 수 없습니다']];
    }

    // 웹앱과 동일한 분석 데이터 생성 (AnalysisService 직접 호출로 일치성 보장)
    const webAppAnalysis = AnalysisService.calculateGageRR(lapTimes);
    
    const safeAnalysis = {
      status: webAppAnalysis.status || 'unacceptable',
      gageRRPercent: Number(webAppAnalysis.gageRRPercent) || 0,
      icc: Number(webAppAnalysis.icc) || 0,
      cv: Number(webAppAnalysis.cv) || 0,
      q95: Number(webAppAnalysis.q95) || 0,
      q99: Number(webAppAnalysis.q99) || 0,
      q999: Number(webAppAnalysis.q999) || 0,
      repeatability: Number(webAppAnalysis.repeatability) || 0,
      reproducibility: Number(webAppAnalysis.reproducibility) || 0,
      partVariation: Number(webAppAnalysis.partVariation) || 0,
      totalVariation: Number(webAppAnalysis.totalVariation) || 0,
      deltaPair: Number(webAppAnalysis.deltaPair) || 0,
      isReliableForStandard: Boolean(webAppAnalysis.isReliableForStandard)
    };

    // 보고서 헤더
    const reportHeader = [
      ['=== Gage R&R 분석 보고서 ==='],
      ['생성일시', new Date().toLocaleString('ko-KR')],
      ['세션명', session.name || ''],
      ['작업유형', session.workType || ''],
      ['측정자', (session.operators || []).join(', ')],
      ['대상자', (session.targets || []).join(', ')],
      ['총 측정횟수', lapTimes.length.toString()],
      [''],
    ];

    // 핵심 평가 결과
    const coreResults = [
      ['=== 핵심 평가 결과 ==='],
      ['항목', '값', '단위', '평가', '기준'],
      ['종합 등급', this.getStatusText(safeAnalysis.status), '', 
       safeAnalysis.status === 'excellent' ? '우수' : 
       safeAnalysis.status === 'acceptable' ? '양호' : 
       safeAnalysis.status === 'marginal' ? '개선 필요' : '불량', ''],
      ['Gage R&R', this.safeFormat(safeAnalysis.gageRRPercent, 1), '%', 
       safeAnalysis.gageRRPercent < 10 ? '우수' : 
       safeAnalysis.gageRRPercent < 30 ? '양호' : '개선 필요', '< 10%: 우수, < 30%: 양호'],
      ['급내상관계수 (ICC)', this.safeFormat(safeAnalysis.icc, 3), '', 
       safeAnalysis.icc >= 0.75 ? '신뢰함' : '개선 필요', '≥ 0.75: 신뢰할 수 있음'],
      ['변동계수 (CV)', this.safeFormat(safeAnalysis.cv, 1), '%', 
       safeAnalysis.cv <= 8 ? '일관성 우수' : '변동성 큼', '≤ 8%: 일관성 우수'],
      ['표준시간 설정 적합성', safeAnalysis.isReliableForStandard ? '적합' : '부적합', '', 
       safeAnalysis.isReliableForStandard ? '✅' : '❌', ''],
      [''],
    ];

    // 상세 분석 지표
    const detailedMetrics = [
      ['=== 상세 분석 지표 ==='],
      ['구분', '항목', '값', '단위', '의미'],
      ['측정시스템 분석', 'Gage R&R 비율', this.safeFormat(safeAnalysis.gageRRPercent, 1), '%', '전체 변동 중 측정시스템 오차'],
      ['', '반복성 (Repeatability)', this.safeFormat(safeAnalysis.repeatability, 2), 'ms', '같은 측정자 반복 측정 변동'],
      ['', '재현성 (Reproducibility)', this.safeFormat(safeAnalysis.reproducibility, 2), 'ms', '측정자간 측정 변동'],
      ['', '대상자 변동', this.safeFormat(safeAnalysis.partVariation, 2), 'ms', '대상자간 실제 능력 차이'],
      ['', '총 변동', this.safeFormat(safeAnalysis.totalVariation, 2), 'ms', '모든 변동 요소 합계'],
      ['신뢰성 지표', '급내상관계수 (ICC)', this.safeFormat(safeAnalysis.icc, 3), '', '측정자간 일치도'],
      ['', 'ΔPair (측정자간 차이)', this.safeFormat(safeAnalysis.deltaPair, 3), '', '측정자 A와 B 평균 차이'],
      ['작업 일관성', '변동계수 (CV)', this.safeFormat(safeAnalysis.cv, 1), '%', '평균 대비 변동성'],
      ['시간 예측', 'Q95 (95% 달성시간)', this.safeFormat(safeAnalysis.q95 / 1000, 2), '초', '95% 확률 달성 시간'],
      ['', 'Q99 (99% 달성시간)', this.safeFormat(safeAnalysis.q99 / 1000, 2), '초', '표준시간 설정 기준'],
      ['', 'Q99.9 (99.9% 달성시간)', this.safeFormat(safeAnalysis.q999 / 1000, 2), '초', '최대 허용시간'],
      [''],
    ];

    // 측정자별 성능 분석
    const operatorAnalysis = this.generateOperatorAnalysis(lapTimes, session.operators || []);

    // 대상자별 성능 분석
    const targetAnalysis = this.generateTargetAnalysis(lapTimes, session.targets || []);

    

    return [
      ...reportHeader,
      ...coreResults,
      ...detailedMetrics,
      ...operatorAnalysis,
      ...targetAnalysis
    ];
  }

  private generateOperatorAnalysis(lapTimes: LapTime[], operators: string[]): string[][] {
    const operatorData = [
      ['=== 측정자별 성능 분석 ==='],
      ['측정자', '측정 횟수', '평균 시간(초)', '표준편차(초)', '변동계수(%)', '평가']
    ];

    operators.forEach(operator => {
      const operatorTimes = lapTimes.filter(lap => lap.operator === operator).map(lap => lap.time);
      if (operatorTimes.length > 0) {
        const mean = operatorTimes.reduce((sum, time) => sum + time, 0) / operatorTimes.length;
        const variance = operatorTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / (operatorTimes.length - 1);
        const stdDev = Math.sqrt(variance);
        const cv = (stdDev / mean) * 100;

        operatorData.push([
          operator,
          operatorTimes.length.toString(),
          this.safeFormat(mean / 1000, 3),
          this.safeFormat(stdDev / 1000, 3),
          this.safeFormat(cv, 1),
          cv <= 10 ? '일관성 우수' : cv <= 20 ? '보통' : '개선 필요'
        ]);
      }
    });

    operatorData.push(['']);
    return operatorData;
  }

  private generateTargetAnalysis(lapTimes: LapTime[], targets: string[]): string[][] {
    const targetData = [
      ['=== 대상자별 성능 분석 ==='],
      ['대상자', '측정 횟수', '평균 시간(초)', '표준편차(초)', '성능 등급', '비고']
    ];

    // 전체 평균 계산
    const allTimes = lapTimes.map(lap => lap.time);
    const overallMean = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;

    targets.forEach(target => {
      const targetTimes = lapTimes.filter(lap => lap.target === target).map(lap => lap.time);
      if (targetTimes.length > 0) {
        const mean = targetTimes.reduce((sum, time) => sum + time, 0) / targetTimes.length;
        const variance = targetTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / (targetTimes.length - 1);
        const stdDev = Math.sqrt(variance);

        let grade = '보통';
        let remark = '';

        if (mean < overallMean * 0.85) {
          grade = '우수';
          remark = '평균보다 빠름';
        } else if (mean > overallMean * 1.15) {
          grade = '개선 필요';
          remark = '평균보다 느림';
        } else {
          remark = '평균 수준';
        }

        targetData.push([
          target,
          targetTimes.length.toString(),
          this.safeFormat(mean / 1000, 3),
          this.safeFormat(stdDev / 1000, 3),
          grade,
          remark
        ]);
      }
    });

    targetData.push(['']);
    return targetData;
  }
}

/**
 * CSV 파일 익스포터 (Single Responsibility Principle)
 */
class CSVFileExporter implements IFileExporter {
  export(data: string[][], filename: string): boolean {
    try {
      // 데이터 유효성 검증
      const validData = data.filter(row => Array.isArray(row) && row.length > 0);

      if (validData.length === 0) {
        console.warn('내보낼 데이터가 없습니다.');
        return false;
      }

      // CSV 형식으로 변환 (Excel 호환성 개선)
      const csvContent = validData.map(row => 
        row.map(cell => {
          let cellStr = '';
          if (cell !== null && cell !== undefined && !Number.isNaN(cell)) {
            cellStr = String(cell).trim();
          }

          if (cellStr === '' || cellStr === 'undefined' || cellStr === 'null') {
            return '';
          }

          // 콤마, 줄바꿈, 따옴표가 포함된 경우 따옴표로 감싸기
          if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('\r') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }

          return cellStr;
        }).join(',')
      ).join('\r\n');

      // UTF-8 BOM 추가 (Excel 한글 호환성)
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });

      // 안전한 파일명 생성
      const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', safeFilename);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

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
    const timestamp = Date.now();
    return `측정기록_${sessionName}_${date}_${time}_${timestamp}.csv`;
  }

  static generateAnalysisFilename(sessionName: string): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const timestamp = Date.now();
    return `분석보고서_${sessionName}_${date}_${time}_${timestamp}.csv`;
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
 * 통합 익스포트 서비스 (Facade Pattern)
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
      console.error('상세분석 보고서 내보내기 오류:', error);
      return false;
    }
  }
}