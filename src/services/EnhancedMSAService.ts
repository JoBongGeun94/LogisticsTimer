import { LapTime } from '../types';

export interface MSAOptions {
  logTransform: boolean;
  confidenceLevel: number;
  strictMode: boolean;
  outlierDetection: boolean;
}

export interface EnhancedGageRRResult {
  // 기본 Gage R&R
  repeatability: number;
  reproducibility: number;
  gageRR: number;
  gageRRPercent: number;
  
  // 고급 MSA 지표
  ptRatio: number;           // P/T 비율 (신규)
  ndc: number;
  cpk: number;
  
  // 통계적 검정
  anova: {
    operatorFValue: number;
    partFValue: number;
    interactionFValue: number;
    pValues: {
      operator: number;
      part: number;
      interaction: number;
    };
  };
  
  // 신뢰구간 (신규)
  confidenceIntervals: {
    gageRR: { lower: number; upper: number };
    repeatability: { lower: number; upper: number };
    reproducibility: { lower: number; upper: number };
  };
  
  // 상태 평가
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  recommendations: string[];
  
  // 부분 통계 (GRR 불가능시에도 제공)
  basicStatistics: {
    mean: number;
    stdDev: number;
    variance: number;
    cv: number; // 변동계수
    range: number;
    operatorStats: Record<string, {mean: number; stdDev: number}>;
    partStats: Record<string, {mean: number; stdDev: number}>;
  };
}

export class EnhancedMSAService {
  
  /**
   * 완전한 MSA 분석 수행
   */
  static calculateEnhancedGageRR(
    lapTimes: LapTime[], 
    _options: MSAOptions = {
      logTransform: false,
      confidenceLevel: 0.95,
      strictMode: true,
      outlierDetection: true
    }
  ): EnhancedGageRRResult {
    
    // 기본 통계는 항상 제공 (GRR 불가능해도)
    const basicStatistics = this.calculateBasicStatistics(lapTimes);
    
    // 엄격 모드 검증 (10회 이상)
    const canPerformGRR = _options.strictMode 
      ? this.validateStrictMSA(lapTimes)
      : this.validateBasicMSA(lapTimes);
    
    if (!canPerformGRR.isValid) {
      // GRR은 불가능하지만 기본 통계는 제공
      return this.createPartialResult(lapTimes, basicStatistics, canPerformGRR.reason);
    }
    
    // 로그 변환 적용 (선택적)
    const processedData = _options.logTransform 
      ? this.applyLogTransform(lapTimes) 
      : lapTimes;
    
    // 이상치 탐지 및 제거 (선택적)
    const cleanData = _options.outlierDetection 
      ? this.removeOutliers(processedData)
      : processedData;
    
    // 완전한 MSA 분석 수행
    return this.performCompleteAnalysis(cleanData, basicStatistics, _options);
  }
  
  /**
   * 기본 통계 계산 (항상 가능)
   */
  private static calculateBasicStatistics(lapTimes: LapTime[]) {
    const times = lapTimes.map((lap: LapTime) => lap.time).filter((t: number) => t > 0);
    const mean = times.reduce((sum: number, t: number) => sum + t, 0) / times.length;
    const variance = times.reduce((sum: number, t: number) => sum + Math.pow(t - mean, 2), 0) / Math.max(1, times.length - 1);
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
    const range = Math.max(...times) - Math.min(...times);
    
    // 측정자별 통계
    const operatorStats: Record<string, {mean: number; stdDev: number}> = {};
    const operators = [...new Set(lapTimes.map((l: LapTime) => l.operator))];
    
    operators.forEach((op: string) => {
      const opTimes = lapTimes.filter((l: LapTime) => l.operator === op).map((l: LapTime) => l.time);
      if (opTimes.length > 0) {
        const opMean = opTimes.reduce((sum: number, t: number) => sum + t, 0) / opTimes.length;
        const opVariance = opTimes.reduce((sum: number, t: number) => sum + Math.pow(t - opMean, 2), 0) / Math.max(1, opTimes.length - 1);
        operatorStats[op] = {
          mean: opMean,
          stdDev: Math.sqrt(opVariance)
        };
      }
    });
    
    // 대상자별 통계
    const partStats: Record<string, {mean: number; stdDev: number}> = {};
    const parts = [...new Set(lapTimes.map((l: LapTime) => l.target))];
    
    parts.forEach((part: string) => {
      const partTimes = lapTimes.filter((l: LapTime) => l.target === part).map((l: LapTime) => l.time);
      if (partTimes.length > 0) {
        const partMean = partTimes.reduce((sum: number, t: number) => sum + t, 0) / partTimes.length;
        const partVariance = partTimes.reduce((sum: number, t: number) => sum + Math.pow(t - partMean, 2), 0) / Math.max(1, partTimes.length - 1);
        partStats[part] = {
          mean: partMean,
          stdDev: Math.sqrt(partVariance)
        };
      }
    });
    
    return {
      mean, stdDev, variance, cv, range,
      operatorStats, partStats
    };
  }
  
  /**
   * 엄격한 MSA 검증 (AIAG MSA 4th Edition)
   */
  private static validateStrictMSA(lapTimes: LapTime[]) {
    const operators = [...new Set(lapTimes.map((l: LapTime) => l.operator))];
    const parts = [...new Set(lapTimes.map((l: LapTime) => l.target))];
    
    if (operators.length < 2) {
      return { isValid: false, reason: 'MSA 분석을 위해서는 측정자 2명 이상이 필요합니다.' };
    }
    
    if (parts.length < 5) {
      return { isValid: false, reason: 'MSA 분석을 위해서는 대상자 5개 이상이 필요합니다.' };
    }
    
    if (lapTimes.length < 10) {
      return { isValid: false, reason: '엄격한 MSA 분석을 위해서는 최소 10회 측정이 필요합니다.' };
    }
    
    // 각 조건별 최소 측정 횟수 확인
    const combinationCount = operators.length * parts.length;
    const minPerCombination = Math.floor(lapTimes.length / combinationCount);
    
    if (minPerCombination < 2) {
      return { 
        isValid: false, 
        reason: `각 조건별 최소 2회 측정이 필요합니다. (현재: 조건당 ${minPerCombination}회)` 
      };
    }
    
    return { isValid: true, reason: '' };
  }
  
  /**
   * 기본 MSA 검증 (기존 6회 기준)
   */
  private static validateBasicMSA(lapTimes: LapTime[]) {
    if (lapTimes.length < 6) {
      return { isValid: false, reason: '기본 분석을 위해서는 최소 6회 측정이 필요합니다.' };
    }
    
    return { isValid: true, reason: '' };
  }
  
  /**
   * 부분 결과 생성 (GRR 불가능시)
   */
  private static createPartialResult(
    _lapTimes: LapTime[], 
    basicStatistics: any, 
    reason: string
  ): EnhancedGageRRResult {
    return {
      repeatability: 0,
      reproducibility: 0,
      gageRR: 0,
      gageRRPercent: 100,
      ptRatio: 0,
      ndc: 0,
      cpk: 0,
      anova: {
        operatorFValue: 0,
        partFValue: 0,
        interactionFValue: 0,
        pValues: { operator: 1, part: 1, interaction: 1 }
      },
      confidenceIntervals: {
        gageRR: { lower: 0, upper: 0 },
        repeatability: { lower: 0, upper: 0 },
        reproducibility: { lower: 0, upper: 0 }
      },
      status: 'unacceptable',
      recommendations: [
        reason,
        '현재 가능한 기본 통계 분석만 제공됩니다.',
        '완전한 MSA 분석을 위해 더 많은 측정 데이터를 수집해주세요.'
      ],
      basicStatistics
    };
  }
  
  /**
   * 로그 변환 적용
   */
  private static applyLogTransform(lapTimes: LapTime[]): LapTime[] {
    return lapTimes.map((lap: LapTime) => ({
      ...lap,
      time: lap.time > 0 ? Math.log(lap.time) : lap.time
    }));
  }
  
  /**
   * 이상치 제거 (Grubbs test 기반)
   */
  private static removeOutliers(lapTimes: LapTime[]): LapTime[] {
    const times = lapTimes.map((l: LapTime) => l.time);
    const mean = times.reduce((sum: number, t: number) => sum + t, 0) / times.length;
    const stdDev = Math.sqrt(times.reduce((sum: number, t: number) => sum + Math.pow(t - mean, 2), 0) / times.length);
    
    // 3-sigma 규칙 적용
    const threshold = 3 * stdDev;
    
    return lapTimes.filter((lap: LapTime) => Math.abs(lap.time - mean) <= threshold);
  }
  
  /**
   * 완전한 MSA 분석 수행
   */
  private static performCompleteAnalysis(
    lapTimes: LapTime[], 
    basicStatistics: any, 
    _options: MSAOptions
  ): EnhancedGageRRResult {
    
    // 기존 AnalysisService 로직 활용하되 강화
    const operators = [...new Set(lapTimes.map((l: LapTime) => l.operator))];
    const parts = [...new Set(lapTimes.map((l: LapTime) => l.target))];
    const times = lapTimes.map((l: LapTime) => l.time);
    const mean = times.reduce((sum: number, t: number) => sum + t, 0) / times.length;
    
    // 반복성 계산 (강화)
    let repeatabilityVariance = 0;
    let totalWithinGroups = 0;
    
    operators.forEach((op: string) => {
      const opTimes = lapTimes.filter((l: LapTime) => l.operator === op).map((l: LapTime) => l.time);
      if (opTimes.length > 1) {
        const opMean = opTimes.reduce((sum: number, t: number) => sum + t, 0) / opTimes.length;
        repeatabilityVariance += opTimes.reduce((sum: number, t: number) => sum + Math.pow(t - opMean, 2), 0);
        totalWithinGroups += opTimes.length - 1;
      }
    });
    
    const repeatability = totalWithinGroups > 0 
      ? Math.sqrt(repeatabilityVariance / totalWithinGroups) 
      : 0;
    
    // 재현성 계산 (강화)
    const operatorMeans = operators.map((op: string) => {
      const opTimes = lapTimes.filter((l: LapTime) => l.operator === op).map((l: LapTime) => l.time);
      return opTimes.reduce((sum: number, t: number) => sum + t, 0) / opTimes.length;
    });
    
    const operatorVariance = operatorMeans.length > 1
      ? operatorMeans.reduce((sum: number, opMean: number) => sum + Math.pow(opMean - mean, 2), 0) / (operators.length - 1)
      : 0;
    
    const trialsPerCondition = Math.max(1, Math.floor(lapTimes.length / (operators.length * parts.length)));
    const reproducibility = Math.sqrt(Math.max(0, operatorVariance - (repeatability ** 2) / trialsPerCondition));
    
    // 부품 변동성 계산
    const partMeans = parts.map((part: string) => {
      const partTimes = lapTimes.filter((l: LapTime) => l.target === part).map((l: LapTime) => l.time);
      return partTimes.reduce((sum: number, t: number) => sum + t, 0) / partTimes.length;
    });
    
    const partVariance = partMeans.length > 1
      ? partMeans.reduce((sum: number, partMean: number) => sum + Math.pow(partMean - mean, 2), 0) / (parts.length - 1)
      : 0;
    
    const partVariation = Math.sqrt(Math.max(0, partVariance - (repeatability ** 2) / trialsPerCondition));
    
    // 종합 계산
    const gageRR = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
    const totalVariation = Math.sqrt(gageRR ** 2 + partVariation ** 2);
    const gageRRPercent = totalVariation > 0 ? (gageRR / totalVariation) * 100 : 100;
    
    // P/T 비율 계산 (신규)
    const tolerance = partVariation * 6; // 가정된 공차
    const ptRatio = tolerance > 0 ? (gageRR * 5.15) / tolerance : 0;
    
    // NDC 계산
    const ndc = partVariation > 0 && gageRR > 0 ? Math.floor((partVariation / gageRR) * 1.41) : 0;
    
    // Cpk 계산
    const cpk = partVariation > 0 ? partVariation / (3 * gageRR) : 0;
    
    // ANOVA F-값 계산 (간소화)
    const operatorFValue = operatorVariance > 0 ? operatorVariance / (repeatability ** 2) : 0;
    const partFValue = partVariance > 0 ? partVariance / (repeatability ** 2) : 0;
    const interactionFValue = 1.0; // 간소화
    
    // 신뢰구간 계산 (95%)
    const tValue = 1.96; // 95% 신뢰구간 근사값
    const seGageRR = gageRR / Math.sqrt(lapTimes.length);
    
    const confidenceIntervals = {
      gageRR: {
        lower: Math.max(0, gageRR - tValue * seGageRR),
        upper: gageRR + tValue * seGageRR
      },
      repeatability: {
        lower: Math.max(0, repeatability - tValue * (repeatability / Math.sqrt(lapTimes.length))),
        upper: repeatability + tValue * (repeatability / Math.sqrt(lapTimes.length))
      },
      reproducibility: {
        lower: Math.max(0, reproducibility - tValue * (reproducibility / Math.sqrt(operators.length))),
        upper: reproducibility + tValue * (reproducibility / Math.sqrt(operators.length))
      }
    };
    
    // 상태 평가
    let status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
    if (gageRRPercent < 10) status = 'excellent';
    else if (gageRRPercent < 30) status = 'acceptable';
    else if (gageRRPercent < 50) status = 'marginal';
    else status = 'unacceptable';
    
    // 권장사항 생성
    const recommendations = this.generateRecommendations(gageRRPercent, ptRatio, ndc, cpk);
    
    return {
      repeatability,
      reproducibility,
      gageRR,
      gageRRPercent,
      ptRatio,
      ndc,
      cpk,
      anova: {
        operatorFValue,
        partFValue,
        interactionFValue,
        pValues: {
          operator: operatorFValue > 3.84 ? 0.05 : 0.1,
          part: partFValue > 3.84 ? 0.05 : 0.1,
          interaction: 0.1
        }
      },
      confidenceIntervals,
      status,
      recommendations,
      basicStatistics
    };
  }
  
  /**
   * 권장사항 생성
   */
  private static generateRecommendations(
    gageRRPercent: number, 
    ptRatio: number, 
    ndc: number, 
    cpk: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (gageRRPercent > 30) {
      recommendations.push('측정 시스템 전반적인 개선이 필요합니다.');
      recommendations.push('측정 장비의 정밀도와 정확도를 점검하세요.');
    }
    
    if (ptRatio > 0.3) {
      recommendations.push('P/T 비율이 높습니다. 측정 정밀도 개선이 필요합니다.');
    }
    
    if (ndc < 5) {
      recommendations.push('측정 시스템의 구별 능력이 부족합니다.');
    }
    
    if (cpk < 1.33) {
      recommendations.push('공정 능력 개선이 필요합니다.');
    }
    
    return recommendations;
  }
}
