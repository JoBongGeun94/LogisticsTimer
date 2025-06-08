import { LapTime } from '../types';
import { MSA_REQUIREMENTS, GAGE_RR_THRESHOLDS, LogTransformType, LOG_TRANSFORM_OPTIONS } from '../constants/analysis';

export interface GageRRResult {
  totalVariation: number;
  repeatability: number;
  reproducibility: number;
  gageRR: number;
  gageRRPercent: number;
  ndc: number; // Number of Distinct Categories
  ptRatio: number; // P/T 비율
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  recommendations: string[];
}

export interface StatisticalMetrics {
  mean: number;
  variance: number;
  standardDeviation: number;
  range: number;
  cv: number; // 변동계수
  cpk: number; // 공정능력지수
}

export class AnalysisService {
  
  // 로그 변환 적용
  static applyLogTransform(values: number[], transformType: LogTransformType): number[] {
    if (transformType === LOG_TRANSFORM_OPTIONS.NONE) return values;
    
    return values.map(value => {
      if (value <= 0) return 0; // 음수나 0은 변환 불가
      
      switch (transformType) {
        case LOG_TRANSFORM_OPTIONS.NATURAL:
          return Math.log(value);
        case LOG_TRANSFORM_OPTIONS.BASE10:
          return Math.log10(value);
        case LOG_TRANSFORM_OPTIONS.SQRT:
          return Math.sqrt(value);
        default:
          return value;
      }
    });
  }
  
  // MSA 규격 준수 검증
  static validateMSARequirements(measurements: LapTime[]): {
    isValid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    
    if (measurements.length < MSA_REQUIREMENTS.MIN_MEASUREMENTS) {
      violations.push(`최소 ${MSA_REQUIREMENTS.MIN_MEASUREMENTS}회 측정 필요 (현재: ${measurements.length}회)`);
    }
    
    const operators = new Set(measurements.map(m => m.operatorId)).size;
    if (operators < MSA_REQUIREMENTS.MIN_OPERATORS) {
      violations.push(`최소 ${MSA_REQUIREMENTS.MIN_OPERATORS}명 측정자 필요 (현재: ${operators}명)`);
    }
    
    const parts = new Set(measurements.map(m => m.partId)).size;
    if (parts < MSA_REQUIREMENTS.MIN_PARTS) {
      violations.push(`최소 ${MSA_REQUIREMENTS.MIN_PARTS}개 대상자 필요 (현재: ${parts}개)`);
    }
    
    return {
      isValid: violations.length === 0,
      violations
    };
  }
  
  // 개선된 Gage R&R 분석
  static calculateGageRR(measurements: LapTime[], transformType: LogTransformType = LOG_TRANSFORM_OPTIONS.NONE): GageRRResult {
    const validation = this.validateMSARequirements(measurements);
    if (!validation.isValid) {
      throw new Error(`MSA 요구사항 미충족: ${validation.violations.join(', ')}`);
    }
    
    // 로그 변환 적용
    const times = this.applyLogTransform(measurements.map(m => m.time), transformType);
    
    // ANOVA 계산
    const operators = [...new Set(measurements.map(m => m.operatorId))];
    const parts = [...new Set(measurements.map(m => m.partId))];
    
    let ssTotal = 0;
    let ssOperator = 0;
    let ssPart = 0;
    
    let ssError = 0;
    
    const grandMean = times.reduce((sum, time) => sum + time, 0) / times.length;
    
    // Total Sum of Squares
    times.forEach(time => {
      ssTotal += Math.pow(time - grandMean, 2);
    });
    
    // Operator Sum of Squares
    operators.forEach(operatorId => {
      const operatorMeasurements = measurements.filter(m => m.operatorId === operatorId);
      const operatorTimes = this.applyLogTransform(operatorMeasurements.map(m => m.time), transformType);
      const operatorMean = operatorTimes.reduce((sum, time) => sum + time, 0) / operatorTimes.length;
      ssOperator += operatorTimes.length * Math.pow(operatorMean - grandMean, 2);
    });
    
    // Part Sum of Squares
    parts.forEach(partId => {
      const partMeasurements = measurements.filter(m => m.partId === partId);
      const partTimes = this.applyLogTransform(partMeasurements.map(m => m.time), transformType);
      const partMean = partTimes.reduce((sum, time) => sum + time, 0) / partTimes.length;
      ssPart += partTimes.length * Math.pow(partMean - grandMean, 2);
    });
    
    // Error calculation (simplified)
    ssError = ssTotal - ssOperator - ssPart;
    
    // Variance components
    const msError = ssError / (measurements.length - operators.length - parts.length + 1);
    const repeatability = Math.sqrt(msError);
    const reproducibility = Math.sqrt(Math.max(0, (ssOperator / (operators.length - 1) - msError) / parts.length));
    const gageRR = Math.sqrt(Math.pow(repeatability, 2) + Math.pow(reproducibility, 2));
    
    const totalVariation = Math.sqrt(ssTotal / (measurements.length - 1));
    const gageRRPercent = (gageRR / totalVariation) * 100;
    
    // P/T 비율 계산 (MSA 필수 항목)
    const ptRatio = (gageRR * 5.15) / (6 * Math.sqrt(ssPart / (parts.length - 1)));
    
    // NDC 계산
    const ndc = Math.floor(1.41 * (Math.sqrt(ssPart / (parts.length - 1)) / gageRR));
    
    // 상태 평가
    let status: GageRRResult['status'];
    if (gageRRPercent < GAGE_RR_THRESHOLDS.EXCELLENT * 100) status = 'excellent';
    else if (gageRRPercent < GAGE_RR_THRESHOLDS.ACCEPTABLE * 100) status = 'acceptable';
    else if (gageRRPercent < GAGE_RR_THRESHOLDS.MARGINAL * 100) status = 'marginal';
    else status = 'unacceptable';
    
    // 권장사항 생성
    const recommendations: string[] = [];
    if (gageRRPercent > 30) {
      recommendations.push('측정 시스템 개선 필요');
      recommendations.push('측정자 교육 실시');
    }
    if (ndc < 5) {
      recommendations.push('측정 시스템 해상도 개선 필요');
    }
    if (ptRatio > 0.3) {
      recommendations.push('측정 정밀도 향상 필요');
    }
    
    return {
      totalVariation,
      repeatability,
      reproducibility,
      gageRR,
      gageRRPercent,
      ndc,
      ptRatio,
      status,
      recommendations
    };
  }
  
  // 통계 메트릭 계산
  static calculateStatistics(values: number[], transformType: LogTransformType = LOG_TRANSFORM_OPTIONS.NONE): StatisticalMetrics {
    const transformedValues = this.applyLogTransform(values, transformType);
    
    const mean = transformedValues.reduce((sum, val) => sum + val, 0) / transformedValues.length;
    const variance = transformedValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (transformedValues.length - 1);
    const standardDeviation = Math.sqrt(variance);
    const range = Math.max(...transformedValues) - Math.min(...transformedValues);
    const cv = (standardDeviation / mean) * 100;
    
    // Cpk 계산 (공정능력지수)
    const usl = mean + 3 * standardDeviation; // Upper Specification Limit
    const lsl = mean - 3 * standardDeviation; // Lower Specification Limit
    const cpk = Math.min((usl - mean) / (3 * standardDeviation), (mean - lsl) / (3 * standardDeviation));
    
    return {
      mean,
      variance,
      standardDeviation,
      range,
      cv,
      cpk
    };
  }
}
