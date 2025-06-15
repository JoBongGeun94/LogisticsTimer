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

export interface IAnalysisService {
  calculateGageRR(lapTimes: LapTime[]): GageRRResult;
  transformData(data: number[], transformType?: 'ln' | 'log10' | 'sqrt'): number[];
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
