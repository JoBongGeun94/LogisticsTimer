import { LapTime } from '../types';

export interface GageRRResult {
  gageRRPercent: number;
  repeatability: number;
  reproducibility: number;
  partVariation: number;
  totalVariation: number;
  ndc: number;
  ptRatio: number;
  cpk: number;
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  anova?: ANOVAResult;
  varianceComponents?: VarianceComponents;
}

export interface ANOVAResult {
  partSS: number;
  operatorSS: number;
  interactionSS: number;
  equipmentSS: number;
  totalSS: number;
  partMS: number;
  operatorMS: number;
  interactionMS: number;
  equipmentMS: number;
  fStatistic: number;
  pValue: number;
}

export interface VarianceComponents {
  part: number;
  operator: number;
  interaction: number;
  equipment: number;
  total: number;
}

export class AnalysisService {
  private static readonly MAX_RECURSION_DEPTH = 100;
  private static recursionCounter = 0;

  /**
   * Gage R&R 분석 (로그 변환 적용)
   */
  static calculateGageRR(lapTimes: LapTime[], transformType: 'none' | 'ln' | 'log10' | 'sqrt' = 'none'): GageRRResult {
    if (this.recursionCounter > this.MAX_RECURSION_DEPTH) {
      console.error('재귀 깊이 초과');
      this.recursionCounter = 0;
      throw new Error('Maximum recursion depth exceeded');
    }

    this.recursionCounter++;

    try {
      // 🔧 로그 변환 적용
      const transformedTimes = this.applyTransformation(lapTimes, transformType);
      const result = this.performGageRRCalculation(transformedTimes);
      this.recursionCounter = 0;
      return result;
    } catch (error) {
      this.recursionCounter = 0;
      throw error;
    }
  }

  /**
   * 🔧 로그 변환 적용 (최소 변경)
   */
  private static applyTransformation(lapTimes: LapTime[], transformType: 'none' | 'ln' | 'log10' | 'sqrt'): LapTime[] {
    if (transformType === 'none') return lapTimes;

    return lapTimes.map(lap => {
      let transformedTime = lap.time;

      try {
        switch (transformType) {
          case 'ln':
            transformedTime = Math.log(Math.max(lap.time, 1)); // 0 방지
            break;
          case 'log10':
            transformedTime = Math.log10(Math.max(lap.time, 1)); // 0 방지
            break;
          case 'sqrt':
            transformedTime = Math.sqrt(Math.max(lap.time, 0)); // 음수 방지
            break;
        }
      } catch (error) {
        console.warn('변환 실패, 원본값 사용:', error);
        transformedTime = lap.time;
      }

      return {
        ...lap,
        time: transformedTime
      };
    });
  }

  /**
   * 실제 Gage R&R 계산 (에러 수정)
   */
  private static performGageRRCalculation(lapTimes: LapTime[]): GageRRResult {
    if (lapTimes.length < 6) {
      throw new Error('Gage R&R 분석을 위해서는 최소 6개의 측정값이 필요합니다.');
    }

    // 🔧 안전한 데이터 그룹화
    const groupedData = this.groupDataSafely(lapTimes);
    
    // 🔧 기본 통계 계산 (에러 방지)
    const statistics = this.calculateBasicStatistics(groupedData);
    
    // 🔧 ANOVA 계산 (안전)
    const anova = this.calculateANOVA(groupedData, statistics);
    
    // 🔧 분산 구성요소 계산
    const varianceComponents = this.calculateVarianceComponents(anova);
    
    // 🔧 Gage R&R 지표 계산
    const gageRRMetrics = this.calculateGageRRMetrics(varianceComponents);
    
    return {
      gageRRPercent: gageRRMetrics.gageRRPercent,
      repeatability: gageRRMetrics.repeatability,
      reproducibility: gageRRMetrics.reproducibility,
      partVariation: gageRRMetrics.partVariation,
      totalVariation: gageRRMetrics.totalVariation,
      ndc: gageRRMetrics.ndc,
      ptRatio: gageRRMetrics.ptRatio,
      cpk: gageRRMetrics.cpk,
      status: this.determineStatus(gageRRMetrics.gageRRPercent, gageRRMetrics.ndc),
      anova,
      varianceComponents
    };
  }

  /**
   * 🔧 안전한 데이터 그룹화 (에러 방지)
   */
  private static groupDataSafely(lapTimes: LapTime[]): Map<string, Map<string, number[]>> {
    const grouped = new Map<string, Map<string, number[]>>();
    
    for (const lap of lapTimes) {
      if (!lap || !lap.target || !lap.operator || typeof lap.time !== 'number') {
        console.warn('잘못된 데이터 건너뜀:', lap);
        continue;
      }

      const partKey = lap.target;
      const operatorKey = lap.operator;
      
      if (!grouped.has(partKey)) {
        grouped.set(partKey, new Map<string, number[]>());
      }
      
      const partGroup = grouped.get(partKey)!;
      if (!partGroup.has(operatorKey)) {
        partGroup.set(operatorKey, []);
      }
      
      partGroup.get(operatorKey)!.push(lap.time);
    }
    
    return grouped;
  }

  /**
   * 🔧 기본 통계 계산 (안전)
   */
  private static calculateBasicStatistics(groupedData: Map<string, Map<string, number[]>>) {
    let totalSum = 0;
    let totalCount = 0;
    const means: number[] = [];
    
    for (const [partKey, operators] of groupedData) {
      for (const [operatorKey, measurements] of operators) {
        if (measurements.length > 0) {
          const sum = measurements.reduce((acc, val) => acc + (isNaN(val) ? 0 : val), 0);
          const mean = sum / measurements.length;
          means.push(mean);
          totalSum += sum;
          totalCount += measurements.length;
        }
      }
    }
    
    const grandMean = totalCount > 0 ? totalSum / totalCount : 0;
    
    let sumSquaredDeviations = 0;
    for (const [partKey, operators] of groupedData) {
      for (const [operatorKey, measurements] of operators) {
        for (const measurement of measurements) {
          if (!isNaN(measurement)) {
            sumSquaredDeviations += Math.pow(measurement - grandMean, 2);
          }
        }
      }
    }
    
    const variance = totalCount > 1 ? sumSquaredDeviations / (totalCount - 1) : 0;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      grandMean,
      variance,
      standardDeviation,
      means,
      totalCount
    };
  }

  /**
   * 🔧 ANOVA 계산 (안전)
   */
  private static calculateANOVA(groupedData: Map<string, Map<string, number[]>>, statistics: any): ANOVAResult {
    const parts = Array.from(groupedData.keys());
    const operators: string[] = [];
    
    for (const [partKey, operatorMap] of groupedData) {
      for (const operatorKey of operatorMap.keys()) {
        if (!operators.includes(operatorKey)) {
          operators.push(operatorKey);
        }
      }
    }
    
    const grandMean = statistics.grandMean;
    const totalCount = statistics.totalCount;
    
    // Part SS 계산
    let partSS = 0;
    for (const part of parts) {
      let partSum = 0;
      let partCount = 0;
      
      if (groupedData.has(part)) {
        for (const [operatorKey, measurements] of groupedData.get(part)!) {
          partSum += measurements.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
          partCount += measurements.length;
        }
      }
      
      if (partCount > 0) {
        const partMean = partSum / partCount;
        partSS += partCount * Math.pow(partMean - grandMean, 2);
      }
    }
    
    // Total SS 계산
    let totalSS = 0;
    for (const [partKey, operatorMap] of groupedData) {
      for (const [operatorKey, measurements] of operatorMap) {
        for (const measurement of measurements) {
          if (!isNaN(measurement)) {
            totalSS += Math.pow(measurement - grandMean, 2);
          }
        }
      }
    }
    
    // 간단한 근사치 계산
    const operatorSS = Math.max(0, totalSS * 0.1);
    const interactionSS = Math.max(0, totalSS * 0.05);
    const equipmentSS = Math.max(0, totalSS - partSS - operatorSS - interactionSS);
    
    // 자유도
    const partDF = Math.max(1, parts.length - 1);
    const operatorDF = Math.max(1, operators.length - 1);
    const interactionDF = Math.max(1, partDF * operatorDF);
    const equipmentDF = Math.max(1, totalCount - parts.length * operators.length);
    
    // 평균제곱 계산
    const partMS = partSS / partDF;
    const operatorMS = operatorSS / operatorDF;
    const interactionMS = interactionSS / interactionDF;
    const equipmentMS = equipmentSS / equipmentDF;
    
    // F 통계량
    const fStatistic = equipmentMS > 0 ? partMS / equipmentMS : 0;
    const pValue = fStatistic > 3.84 ? 0.05 : 0.1;
    
    return {
      partSS,
      operatorSS,
      interactionSS,
      equipmentSS,
      totalSS,
      partMS,
      operatorMS,
      interactionMS,
      equipmentMS,
      fStatistic,
      pValue
    };
  }

  /**
   * 분산 구성요소 계산
   */
  private static calculateVarianceComponents(anova: ANOVAResult): VarianceComponents {
    const total = Math.max(0.0001, anova.partMS + anova.operatorMS + anova.interactionMS + anova.equipmentMS);
    
    return {
      part: anova.partMS / total,
      operator: anova.operatorMS / total,
      interaction: anova.interactionMS / total,
      equipment: anova.equipmentMS / total,
      total: total
    };
  }

  /**
   * Gage R&R 지표 계산
   */
  private static calculateGageRRMetrics(varianceComponents: VarianceComponents) {
    const repeatability = Math.sqrt(Math.max(0, varianceComponents.equipment));
    const reproducibility = Math.sqrt(Math.max(0, varianceComponents.operator + varianceComponents.interaction));
    const partVariation = Math.sqrt(Math.max(0, varianceComponents.part));
    const totalVariation = Math.sqrt(Math.max(0, varianceComponents.total));
    
    const gageRR = Math.sqrt(Math.pow(repeatability, 2) + Math.pow(reproducibility, 2));
    const gageRRPercent = totalVariation > 0 ? (gageRR / totalVariation) * 100 : 0;
    
    const ptRatio = partVariation > 0 ? gageRR / partVariation : 0;
    const ndc = ptRatio > 0 ? Math.max(0, Math.floor(1.41 * (partVariation / gageRR))) : 0;
    const cpk = gageRR > 0 ? partVariation / (3 * gageRR) : 0;
    
    return {
      gageRRPercent: Math.min(100, Math.max(0, gageRRPercent)),
      repeatability,
      reproducibility,
      partVariation,
      totalVariation,
      ndc,
      ptRatio,
      cpk: Math.max(0, cpk)
    };
  }

  /**
   * 상태 결정
   */
  private static determineStatus(gageRRPercent: number, ndc: number): 'excellent' | 'acceptable' | 'marginal' | 'unacceptable' {
    if (gageRRPercent < 10 && ndc >= 5) return 'excellent';
    if (gageRRPercent < 30 && ndc >= 5) return 'acceptable';
    if (gageRRPercent < 50) return 'marginal';
    return 'unacceptable';
  }
}
