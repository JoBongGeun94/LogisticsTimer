import { LapTime, SessionData, GageRRResult, ValidationResult } from '../types';

export interface IValidationService {
  validateMeasurement(
    session: SessionData | null,
    operator: string,
    target: string,
    time: number
  ): ValidationResult;
  validateSessionCreation(
    name: string,
    workType: string,
    operators: string[],
    targets: string[]
  ): ValidationResult;
  validateGageRRAnalysis(lapTimes: LapTime[]): ValidationResult;
}

export interface IGageRRAnalyzer {
  calculateGageRR(lapTimes: LapTime[]): GageRRResult;
}

export interface IDataTransformer {
  transformData(data: number[], transformType?: 'ln' | 'log10' | 'sqrt'): number[];
}

export interface IAnalysisService extends IGageRRAnalyzer, IDataTransformer {
  // 기존 분석 서비스는 여러 인터페이스 조합
}

export interface IExportService {
  formatTime(ms: number): string;
  exportMeasurementData(session: SessionData, lapTimes: LapTime[]): boolean;
  exportDetailedAnalysis(
    session: SessionData,
    lapTimes: LapTime[],
    analysis: GageRRResult
  ): boolean;
}
