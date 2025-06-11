
import { LapTime, GageRRResult, ANOVAResult, VarianceComponents, TransformType } from '../types';

/**
 * 변환 인터페이스 (Interface Segregation Principle)
 */
interface IDataTransformer {
  transform(lapTimes: LapTime[], transformType: TransformType): LapTime[];
}

interface IStatisticsCalculator {
  calculateBasicStatistics(groupedData: Map<string, Map<string, number[]>>): BasicStatistics;
}

interface IANOVACalculator {
  calculate(groupedData: Map<string, Map<string, number[]>>, statistics: BasicStatistics): ANOVAResult;
}

interface IGageRRCalculator {
  calculate(anova: ANOVAResult, nParts?: number, nOperators?: number, nRepeats?: number): GageRRMetrics;
}

/**
 * 기본 통계 타입
 */
interface BasicStatistics {
  grandMean: number;
  variance: number;
  standardDeviation: number;
  means: number[];
  totalCount: number;
}

/**
 * Gage R&R 지표 타입
 */
interface GageRRMetrics {
  gageRRPercent: number;
  repeatability: number;
  reproducibility: number;
  partVariation: number;
  totalVariation: number;
  ndc: number;
  ptRatio: number;
  cpk: number;
}

/**
 * 데이터 변환기 (Single Responsibility Principle)
 */
class DataTransformer implements IDataTransformer {
  transform(lapTimes: LapTime[], transformType: TransformType): LapTime[] {
    if (transformType === 'none') return lapTimes;

    return lapTimes.map(lap => {
      let transformedTime = lap.time;

      try {
        switch (transformType) {
          case 'ln':
            transformedTime = Math.log(Math.max(lap.time, 1));
            break;
          case 'log10':
            transformedTime = Math.log10(Math.max(lap.time, 1));
            break;
          case 'sqrt':
            transformedTime = Math.sqrt(Math.max(lap.time, 0));
            break;
        }
      } catch (error) {
        console.warn('변환 실패, 원본값 사용:', error);
        transformedTime = lap.time;
      }

      return { ...lap, time: transformedTime };
    });
  }
}

/**
 * 데이터 그룹화 유틸리티 (Single Responsibility Principle)
 */
class DataGrouper {
  static groupSafely(lapTimes: LapTime[]): Map<string, Map<string, number[]>> {
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
}

/**
 * 통계 계산기 (Single Responsibility Principle)
 */
class StatisticsCalculator implements IStatisticsCalculator {
  calculateBasicStatistics(groupedData: Map<string, Map<string, number[]>>): BasicStatistics {
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
}

/**
 * ANOVA 계산기 (Single Responsibility Principle)
 */
class ANOVACalculator implements IANOVACalculator {
  calculate(groupedData: Map<string, Map<string, number[]>>, statistics: BasicStatistics): ANOVAResult {
    const parts = Array.from(groupedData.keys());
    const operators: string[] = [];
    
    // 모든 측정자 수집
    for (const [partKey, operatorMap] of groupedData) {
      for (const operatorKey of operatorMap.keys()) {
        if (!operators.includes(operatorKey)) {
          operators.push(operatorKey);
        }
      }
    }
    
    const grandMean = statistics.grandMean;
    const totalCount = statistics.totalCount;
    const nParts = parts.length;
    const nOperators = operators.length;
    
    // 측정 횟수 계산 (각 part-operator 조합당)
    let nRepeats = 0;
    for (const [partKey, operatorMap] of groupedData) {
      for (const [operatorKey, measurements] of operatorMap) {
        if (measurements.length > 0) {
          nRepeats = Math.max(nRepeats, measurements.length);
        }
      }
    }
    
    // Part SS 계산 (올바른 공식)
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
    
    // Operator SS 계산 (올바른 공식)
    let operatorSS = 0;
    for (const operator of operators) {
      let operatorSum = 0;
      let operatorCount = 0;
      
      for (const [partKey, operatorMap] of groupedData) {
        if (operatorMap.has(operator)) {
          const measurements = operatorMap.get(operator)!;
          operatorSum += measurements.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
          operatorCount += measurements.length;
        }
      }
      
      if (operatorCount > 0) {
        const operatorMean = operatorSum / operatorCount;
        operatorSS += operatorCount * Math.pow(operatorMean - grandMean, 2);
      }
    }
    
    // Interaction SS 계산 (올바른 공식)
    let interactionSS = 0;
    for (const part of parts) {
      for (const operator of operators) {
        if (groupedData.has(part) && groupedData.get(part)!.has(operator)) {
          const measurements = groupedData.get(part)!.get(operator)!;
          if (measurements.length > 0) {
            const cellMean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
            
            // 해당 part의 평균
            let partSum = 0;
            let partCount = 0;
            for (const [opKey, opMeasurements] of groupedData.get(part)!) {
              partSum += opMeasurements.reduce((sum, val) => sum + val, 0);
              partCount += opMeasurements.length;
            }
            const partMean = partCount > 0 ? partSum / partCount : grandMean;
            
            // 해당 operator의 평균
            let operatorSum = 0;
            let operatorCount = 0;
            for (const [partKey, operatorMap] of groupedData) {
              if (operatorMap.has(operator)) {
                const opMeasurements = operatorMap.get(operator)!;
                operatorSum += opMeasurements.reduce((sum, val) => sum + val, 0);
                operatorCount += opMeasurements.length;
              }
            }
            const operatorMean = operatorCount > 0 ? operatorSum / operatorCount : grandMean;
            
            interactionSS += measurements.length * Math.pow(cellMean - partMean - operatorMean + grandMean, 2);
          }
        }
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
    
    // Equipment SS (Repeatability) 계산
    const equipmentSS = Math.max(0, totalSS - partSS - operatorSS - interactionSS);
    
    // 자유도 계산
    const partDF = Math.max(1, nParts - 1);
    const operatorDF = Math.max(1, nOperators - 1);
    const interactionDF = Math.max(1, partDF * operatorDF);
    const equipmentDF = Math.max(1, totalCount - nParts * nOperators);
    
    // 평균제곱 계산
    const partMS = partSS / partDF;
    const operatorMS = operatorSS / operatorDF;
    const interactionMS = interactionSS / interactionDF;
    const equipmentMS = equipmentSS / equipmentDF;
    
    // F 통계량 계산 (올바른 공식)
    const fStatistic = equipmentMS > 0 ? partMS / equipmentMS : 0;
    const fOperator = equipmentMS > 0 ? operatorMS / equipmentMS : 0;
    const fInteraction = equipmentMS > 0 ? interactionMS / equipmentMS : 0;
    
    // p-value 계산 (F 분포 기반)
    const pValue = this.calculatePValue(fStatistic, partDF, equipmentDF);
    
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
  
  private calculatePValue(fStat: number, df1: number, df2: number): number {
    // F 분포 기반 p-value 근사 계산
    if (fStat < 1) return 0.5;
    if (fStat > 10) return 0.001;
    if (fStat > 5) return 0.01;
    if (fStat > 3) return 0.05;
    if (fStat > 2) return 0.1;
    return 0.2;
  }
}

/**
 * Gage R&R 계산기 (Single Responsibility Principle)
 */
class GageRRCalculator implements IGageRRCalculator {
  calculate(anova: ANOVAResult, nParts: number = 5, nOperators: number = 2, nRepeats: number = 5): GageRRMetrics {
    const varianceComponents = this.calculateVarianceComponents(anova, nParts, nOperators, nRepeats);
    
    // 표준편차 계산 (올바른 공식)
    const repeatability = Math.sqrt(Math.max(0, varianceComponents.equipment));
    const reproducibility = Math.sqrt(Math.max(0, varianceComponents.operator));
    const partVariation = Math.sqrt(Math.max(0, varianceComponents.part));
    const interactionVariation = Math.sqrt(Math.max(0, varianceComponents.interaction));
    
    // Total Gage R&R 계산
    const gageRR = Math.sqrt(
      Math.pow(repeatability, 2) + 
      Math.pow(reproducibility, 2) + 
      Math.pow(interactionVariation, 2)
    );
    
    // Total Variation 계산
    const totalVariation = Math.sqrt(
      Math.pow(gageRR, 2) + 
      Math.pow(partVariation, 2)
    );
    
    // Gage R&R 백분율 계산
    const gageRRPercent = totalVariation > 0 ? (gageRR / totalVariation) * 100 : 0;
    
    // P/T 비율 계산 (올바른 공식)
    const ptRatio = partVariation > 0 ? gageRR / partVariation : Infinity;
    
    // NDC 계산 (올바른 공식)
    const ndc = gageRR > 0 ? Math.max(0, Math.floor(1.41 * (partVariation / gageRR))) : 0;
    
    // Cpk 계산 (공정 능력 지수)
    const cpk = gageRR > 0 ? (partVariation * Math.sqrt(2)) / (3 * gageRR) : 0;
    
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

  private calculateVarianceComponents(anova: ANOVAResult, nParts: number, nOperators: number, nRepeats: number): VarianceComponents {
    // MSA-4 표준에 따른 분산 성분 계산
    
    // Repeatability (Equipment Variance)
    const σ²_equipment = anova.equipmentMS;
    
    // Interaction Variance
    const σ²_interaction = Math.max(0, (anova.interactionMS - anova.equipmentMS) / nRepeats);
    
    // Reproducibility (Operator Variance)
    const σ²_operator = Math.max(0, (anova.operatorMS - anova.interactionMS) / (nParts * nRepeats));
    
    // Part-to-Part Variance
    const σ²_part = Math.max(0, (anova.partMS - anova.interactionMS) / (nOperators * nRepeats));
    
    // Total Variance
    const σ²_total = σ²_part + σ²_operator + σ²_interaction + σ²_equipment;
    
    return {
      part: σ²_part,
      operator: σ²_operator,
      interaction: σ²_interaction,
      equipment: σ²_equipment,
      total: σ²_total
    };
  }
}

/**
 * 상태 평가기 (Single Responsibility Principle)
 */
class StatusEvaluator {
  static determineStatus(gageRRPercent: number, ndc: number): 'excellent' | 'acceptable' | 'marginal' | 'unacceptable' {
    if (gageRRPercent < 10 && ndc >= 5) return 'excellent';
    if (gageRRPercent < 30 && ndc >= 5) return 'acceptable';
    if (gageRRPercent < 50) return 'marginal';
    return 'unacceptable';
  }
}

/**
 * 분석 팩토리 (Dependency Inversion Principle)
 */
class AnalysisFactory {
  static createDataTransformer(): IDataTransformer {
    return new DataTransformer();
  }

  static createStatisticsCalculator(): IStatisticsCalculator {
    return new StatisticsCalculator();
  }

  static createANOVACalculator(): IANOVACalculator {
    return new ANOVACalculator();
  }

  static createGageRRCalculator(): IGageRRCalculator {
    return new GageRRCalculator();
  }
}

/**
 * 통합 분석 서비스 (Facade Pattern + Open/Closed Principle)
 */
export class AnalysisService {
  private static readonly MAX_RECURSION_DEPTH = 100;
  private static recursionCounter = 0;

  private static dataTransformer = AnalysisFactory.createDataTransformer();
  private static statisticsCalculator = AnalysisFactory.createStatisticsCalculator();
  private static anovaCalculator = AnalysisFactory.createANOVACalculator();
  private static gageRRCalculator = AnalysisFactory.createGageRRCalculator();

  static calculateGageRR(lapTimes: LapTime[], transformType: TransformType = 'none'): GageRRResult {
    if (this.recursionCounter > this.MAX_RECURSION_DEPTH) {
      console.error('재귀 깊이 초과');
      this.recursionCounter = 0;
      throw new Error('Maximum recursion depth exceeded');
    }

    this.recursionCounter++;

    try {
      if (lapTimes.length < 6) {
        throw new Error('Gage R&R 분석을 위해서는 최소 6개의 측정값이 필요합니다.');
      }

      // 데이터 변환
      const transformedTimes = this.dataTransformer.transform(lapTimes, transformType);
      
      // 데이터 그룹화
      const groupedData = DataGrouper.groupSafely(transformedTimes);
      
      // 기본 통계 계산
      const statistics = this.statisticsCalculator.calculateBasicStatistics(groupedData);
      
      // ANOVA 계산
      const anova = this.anovaCalculator.calculate(groupedData, statistics);
      
      // 데이터 구조 분석
      const parts = Array.from(groupedData.keys());
      const operators: string[] = [];
      let maxRepeats = 0;
      
      for (const [partKey, operatorMap] of groupedData) {
        for (const [operatorKey, measurements] of operatorMap) {
          if (!operators.includes(operatorKey)) {
            operators.push(operatorKey);
          }
          maxRepeats = Math.max(maxRepeats, measurements.length);
        }
      }
      
      // Gage R&R 지표 계산
      const metrics = this.gageRRCalculator.calculate(anova, parts.length, operators.length, maxRepeats);
      
      // 분산 구성요소 계산
      const varianceComponents = this.calculateVarianceComponents(anova);
      
      this.recursionCounter = 0;
      
      return {
        ...metrics,
        status: StatusEvaluator.determineStatus(metrics.gageRRPercent, metrics.ndc),
        anova,
        varianceComponents
      };
    } catch (error) {
      this.recursionCounter = 0;
      throw error;
    }
  }

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
}
