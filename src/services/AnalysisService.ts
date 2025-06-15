import { LapTime, GageRRResult } from '../types';
import { OutlierDetectionService } from './OutlierDetectionService';
import { NormalityTestService } from './NormalityTestService';

// 팩토리 패턴으로 의존성 관리 (Dependency Inversion Principle)
class AnalysisFactory {
  static createStatisticsCalculator() {
    return new StatisticsCalculator();
  }

  static createANOVACalculator() {
    return new ANOVACalculator();
  }

  static createGageRRCalculator() {
    return new GageRRCalculator();
  }
}

// 데이터 그룹화 유틸리티 (Single Responsibility Principle)
class DataGrouper {
  static groupSafely(lapTimes: LapTime[]): Map<string, Map<string, number[]>> {
    const groupedData = new Map();

    lapTimes.forEach(lap => {
      const partKey = lap.target;
      const operatorKey = lap.operator;

      if (!groupedData.has(partKey)) {
        groupedData.set(partKey, new Map());
      }

      if (!groupedData.get(partKey)!.has(operatorKey)) {
        groupedData.get(partKey)!.set(operatorKey, []);
      }

      groupedData.get(partKey)!.get(operatorKey)!.push(lap.time);
    });

    return groupedData;
  }
}

// 상태 평가기 (Single Responsibility Principle)
class StatusEvaluator {
  static determineStatus(grrPercent: number): 'excellent' | 'acceptable' | 'marginal' | 'unacceptable' {
    if (grrPercent < 10) return 'excellent';
    if (grrPercent < 30) return 'acceptable';
    if (grrPercent < 50) return 'marginal';
    return 'unacceptable';
  }
}

// 기본 통계 계산기 (Single Responsibility Principle)
class StatisticsCalculator {
  calculateBasicStatistics(groupedData: Map<string, Map<string, number[]>>) {
    let grandTotal = 0;
    let grandCount = 0;

    for (const [partKey, operatorMap] of groupedData) {
      for (const [operatorKey, measurements] of operatorMap) {
        const validMeasurements = measurements.filter(m => !isNaN(m));
        grandTotal += validMeasurements.reduce((sum, m) => sum + m, 0);
        grandCount += validMeasurements.length;
      }
    }

    const grandMean = grandCount > 0 ? grandTotal / grandCount : 0;

    return {
      grandMean,
      grandCount,
      grandTotal
    };
  }
}

// ANOVA 계산기 (Single Responsibility Principle)
class ANOVACalculator {
  calculate(groupedData: Map<string, Map<string, number[]>>, statistics: any) {
    const { grandMean } = statistics;

    // 부품간 제곱합 (Part SS)
    let partSS = 0;
    let nOperators = 0;
    let nRepeats = 0;

    for (const [partKey, operatorMap] of groupedData) {
      let partTotal = 0;
      let partCount = 0;

      for (const [operatorKey, measurements] of operatorMap) {
        const validMeasurements = measurements.filter(m => !isNaN(m));
        partTotal += validMeasurements.reduce((sum, m) => sum + m, 0);
        partCount += validMeasurements.length;
        nOperators = Math.max(nOperators, operatorMap.size);
        nRepeats = Math.max(nRepeats, validMeasurements.length);
      }

      if (partCount > 0) {
        const partMean = partTotal / partCount;
        partSS += partCount * Math.pow(partMean - grandMean, 2);
      }
    }

    // 측정자간 제곱합 (Operator SS)
    let operatorSS = 0;
    const operatorTotals = new Map();
    const operatorCounts = new Map();

    for (const [partKey, operatorMap] of groupedData) {
      for (const [operatorKey, measurements] of operatorMap) {
        const validMeasurements = measurements.filter(m => !isNaN(m));

        if (!operatorTotals.has(operatorKey)) {
          operatorTotals.set(operatorKey, 0);
          operatorCounts.set(operatorKey, 0);
        }

        operatorTotals.set(operatorKey, operatorTotals.get(operatorKey) + validMeasurements.reduce((sum, m) => sum + m, 0));
        operatorCounts.set(operatorKey, operatorCounts.get(operatorKey) + validMeasurements.length);
      }
    }

    for (const [operatorKey, total] of operatorTotals) {
      const count = operatorCounts.get(operatorKey);
      if (count > 0) {
        const operatorMean = total / count;
        operatorSS += count * Math.pow(operatorMean - grandMean, 2);
      }
    }

    // 교호작용 제곱합 (Interaction SS)
    let interactionSS = 0;
    for (const [partKey, operatorMap] of groupedData) {
      for (const [operatorKey, measurements] of operatorMap) {
        const validMeasurements = measurements.filter(m => !isNaN(m));
        if (validMeasurements.length > 0) {
          const cellMean = validMeasurements.reduce((sum, m) => sum + m, 0) / validMeasurements.length;

          // 부품 평균과 측정자 평균 계산
          let partTotal = 0, partCount = 0;
          for (const [op, meas] of operatorMap) {
            const valid = meas.filter(m => !isNaN(m));
            partTotal += valid.reduce((sum, m) => sum + m, 0);
            partCount += valid.length;
          }
          const partMean = partCount > 0 ? partTotal / partCount : grandMean;

          const operatorTotal = operatorTotals.get(operatorKey) || 0;
          const operatorCount = operatorCounts.get(operatorKey) || 1;
          const operatorMean = operatorTotal / operatorCount;

          interactionSS += validMeasurements.length * Math.pow(cellMean - partMean - operatorMean + grandMean, 2);
        }
      }
    }

    // 총 제곱합 계산
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

    const nParts = groupedData.size;

    // 자유도 계산
    const partDF = Math.max(1, nParts - 1);
    const operatorDF = Math.max(1, nOperators - 1);
    const interactionDF = Math.max(1, (nParts - 1) * (nOperators - 1));
    const equipmentDF = Math.max(1, nParts * nOperators * Math.max(1, nRepeats - 1));

    // 평균제곱 계산
    const partMS = partSS / partDF;
    const operatorMS = operatorSS / operatorDF;
    const interactionMS = interactionSS / interactionDF;
    const equipmentMS = equipmentSS / equipmentDF;

    // F 통계량 계산
    const fStatistic = equipmentMS > 0 ? partMS / equipmentMS : 0;

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
      pValue: 0.05 // 단순화된 p-value
    };
  }
}

// Gage R&R 계산기 (Single Responsibility Principle)
class GageRRCalculator {
  calculate(anova: any, nParts: number, nOperators: number, nRepeats: number, groupedData: Map<string, Map<string, number[]>>) {
    // 분산 성분 계산
    const sigma2_equipment = Math.max(0, anova.equipmentMS);
    const sigma2_interaction = Math.max(0, (anova.interactionMS - anova.equipmentMS) / nRepeats);
    const sigma2_operator = Math.max(0, (anova.operatorMS - anova.interactionMS) / (nParts * nRepeats));
    const sigma2_part = Math.max(0, (anova.partMS - anova.interactionMS) / (nOperators * nRepeats));

    // 총 분산
    const sigma2_total = sigma2_part + sigma2_operator + sigma2_interaction + sigma2_equipment;

    // Gage R&R 계산
    const sigma2_repeatability = sigma2_equipment;
    const sigma2_reproducibility = sigma2_operator + sigma2_interaction;
    const sigma2_gageRR = sigma2_repeatability + sigma2_reproducibility;

    // 백분율 계산
    const repeatabilityPercent = sigma2_total > 0 ? (sigma2_repeatability / sigma2_total) * 100 : 0;
    const reproducibilityPercent = sigma2_total > 0 ? (sigma2_reproducibility / sigma2_total) * 100 : 0;
    const gageRRPercent = sigma2_total > 0 ? (sigma2_gageRR / sigma2_total) * 100 : 0;
    const partVariationPercent = sigma2_total > 0 ? (sigma2_part / sigma2_total) * 100 : 0;

    // 기본 통계 계산
    const allTimes = [];
    for (const [partKey, operatorMap] of groupedData) {
      for (const [operatorKey, measurements] of operatorMap) {
        allTimes.push(...measurements.filter(m => !isNaN(m)));
      }
    }

    const mean = allTimes.length > 0 ? allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length : 0;
    const std = Math.sqrt(sigma2_total);
    const cv = mean > 0 ? (std / mean) * 100 : 0;

    // 분위수 계산
    const q95 = mean + 1.645 * std;
    const q99 = mean + 2.576 * std;
    const q999 = mean + 3.291 * std;

    // ICC 계산 (단순화)
    const icc = sigma2_total > 0 ? sigma2_part / sigma2_total : 0;

    // 신뢰성 판단
    const isReliableForStandard = gageRRPercent < 30 && icc > 0.7;

    return {
      gageRRPercent,
      repeatability: Math.sqrt(sigma2_repeatability),
      reproducibility: Math.sqrt(sigma2_reproducibility),
      partVariation: Math.sqrt(sigma2_part),
      totalVariation: std,
      icc,
      cv,
      q95,
      q99,
      q999,
      isReliableForStandard
    };
  }
}

// 메인 분석 서비스 (Facade Pattern)
class AnalysisService {
  private static statisticsCalculator = AnalysisFactory.createStatisticsCalculator();
  private static anovaCalculator = AnalysisFactory.createANOVACalculator();
  private static gageRRCalculator = AnalysisFactory.createGageRRCalculator();

  static calculateGageRR(lapTimes: LapTime[]): GageRRResult {
    try {
      // 엣지 케이스 처리 강화
      if (!lapTimes || lapTimes.length < 3) {
        throw new Error('분석을 위해서는 최소 3개의 측정값이 필요합니다.');
      }

      // 6개 미만일 때 기본 분석 제공
      if (lapTimes.length < 6) {
        console.warn('⚠️ 완전한 Gage R&R 분석을 위해서는 6개 이상의 측정값이 권장됩니다.');
        return this.calculateBasicAnalysis(lapTimes);
      }

      // 데이터 유효성 검증
      const validLapTimes = lapTimes.filter(lap => 
        lap && 
        typeof lap.time === 'number' && 
        lap.time > 0 && 
        lap.operator && 
        lap.target
      );

      if (validLapTimes.length < 6) {
        throw new Error('유효한 측정값이 부족합니다.');
      }

      // 데이터 전처리
      const timeValues = validLapTimes.map(lap => lap.time);
      const outlierAnalysis = OutlierDetectionService.detectOutliersIQR(timeValues);

      let normalityTest = null;
      let isDataNormal = true;

      try {
        if (outlierAnalysis.cleanData.length >= 3) {
          normalityTest = NormalityTestService.shapiroWilkTest(outlierAnalysis.cleanData);
          isDataNormal = normalityTest.isNormal;
        }
      } catch (error) {
        console.warn('정규성 검정 실패:', error);
        isDataNormal = false;
      }

      // 데이터 그룹화
      const groupedData = DataGrouper.groupSafely(validLapTimes);

      // 그룹화된 데이터 유효성 검증
      if (groupedData.size < 2) {
        throw new Error('분석을 위해서는 최소 2개 이상의 대상자가 필요합니다.');
      }

      const operatorSet = new Set();
      for (const [partKey, operatorMap] of groupedData) {
        for (const [operatorKey] of operatorMap) {
          operatorSet.add(operatorKey);
        }
      }

      if (operatorSet.size < 2) {
        throw new Error(`분석을 위해서는 최소 2명 이상의 측정자가 필요합니다.`);
      }

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
      const metrics = this.gageRRCalculator.calculate(anova, parts.length, operators.length, maxRepeats, groupedData);

      // 분산 구성요소 계산
      const varianceComponents = this.calculateVarianceComponents(anova);

      return {
        ...metrics,
        status: StatusEvaluator.determineStatus(metrics.gageRRPercent),
        anova,
        varianceComponents,
        dataQuality: {
          originalCount: lapTimes.length,
          validCount: validLapTimes.length,
          outliersDetected: outlierAnalysis?.outliers.length || 0,
          isNormalDistribution: isDataNormal,
          normalityTest: normalityTest ? {
            statistic: normalityTest.statistic,
            pValue: normalityTest.pValue,
            method: 'Shapiro-Wilk'
          } : null,
          outlierMethod: 'IQR',
          preprocessingApplied: (outlierAnalysis?.outliers.length || 0) > 0
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 기본 분석 메서드 (6개 미만 데이터용)
   */
  private static calculateBasicAnalysis(lapTimes: LapTime[]): GageRRResult {
    const validLapTimes = lapTimes.filter(lap => 
      lap && typeof lap.time === 'number' && lap.time > 0 && lap.operator && lap.target
    );

    if (validLapTimes.length < 3) {
      throw new Error('유효한 측정값이 부족합니다.');
    }

    const times = validLapTimes.map(lap => lap.time);
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / (times.length - 1);
    const std = Math.sqrt(variance);
    const cv = mean > 0 ? (std / mean) * 100 : 0;

    const q95 = mean + 1.645 * std;
    const q99 = mean + 2.576 * std;
    const q999 = mean + 3.291 * std;

    return {
      gageRRPercent: 0,
      repeatability: std,
      reproducibility: 0,
      partVariation: 0,
      totalVariation: std,
      icc: 0,
      cv: Math.max(0, cv),
      q95,
      q99,
      q999,
      isReliableForStandard: false,
      status: 'marginal',
      anova: {
        partSS: 0, operatorSS: 0, interactionSS: 0, equipmentSS: variance * (times.length - 1),
        totalSS: variance * (times.length - 1), partMS: 0, operatorMS: 0, interactionMS: 0,
        equipmentMS: variance, fStatistic: 0, pValue: 1.0
      },
      varianceComponents: {
        part: 0, operator: 0, interaction: 0, equipment: variance, total: variance
      },
      dataQuality: {
        originalCount: lapTimes.length,
        validCount: validLapTimes.length,
        outliersDetected: 0,
        isNormalDistribution: true,
        normalityTest: null,
        outlierMethod: 'IQR',
        preprocessingApplied: false
      }
    };
  }

  private static calculateVarianceComponents(anova: any) {
    const sigma2_equipment = Math.max(0, anova.equipmentMS);
    const var_interaction = Math.max(0, (anova.interactionMS - anova.equipmentMS) / 2);
    const var_operator = Math.max(0, (anova.operatorMS - anova.interactionMS) / (5 * 2));
    const var_part = Math.max(0, (anova.partMS - anova.interactionMS) / (2 * 2));
    const var_total = var_part + var_operator + var_interaction + sigma2_equipment;

    return {
      part: var_part,
      operator: var_operator,
      interaction: var_interaction,
      equipment: sigma2_equipment,
      total: Math.max(0.0001, var_total)
    };
  }
}

export { AnalysisService };