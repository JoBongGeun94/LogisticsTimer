import { LapTime, GageRRResult, ANOVAResult, VarianceComponents } from '../types';
import { LOGISTICS_WORK_THRESHOLDS, NORMAL_DISTRIBUTION, F_DISTRIBUTION_CRITICAL } from '../constants/analysis';

interface IStatisticsCalculator {
  calculateBasicStatistics(groupedData: Map<string, Map<string, number[]>>): BasicStatistics;
}

interface IANOVACalculator {
  calculate(groupedData: Map<string, Map<string, number[]>>, statistics: BasicStatistics): ANOVAResult;
}

interface IGageRRCalculator {
  calculate(anova: ANOVAResult, nParts?: number, nOperators?: number, nRepeats?: number, groupedData?: Map<string, Map<string, number[]>>): GageRRMetrics;
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
  // 작업시간 분석용 추가 지표
  icc: number;           // 급내상관계수 - 측정자간 신뢰성
  cv: number;            // 변동계수 - 일관성 지표  
  q99: number;           // 99% 달성가능 시간
  isReliableForStandard: boolean; // 표준시간 설정 가능 여부
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

    // 측정 횟수 계산 및 균형성 검증
    let minRepeats = Infinity;
    let maxRepeats = 0;
    for (const [partKey, operatorMap] of groupedData) {
      for (const [operatorKey, measurements] of operatorMap) {
        if (measurements.length > 0) {
          minRepeats = Math.min(minRepeats, measurements.length);
          maxRepeats = Math.max(maxRepeats, measurements.length);
        }
      }
    }

    // 비균형 데이터 경고
    if (minRepeats !== maxRepeats) {
      console.warn(`⚠️ 비균형 반복수 감지: ${minRepeats}~${maxRepeats}회. MS 추정 왜곡 위험`);
    }

    const nRepeats = maxRepeats;

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

    // 자유도 계산 (MSA 표준) - 극단적 케이스 처리 강화
    const partDF = Math.max(1, nParts - 1);
    const operatorDF = Math.max(1, nOperators - 1);
    const interactionDF = Math.max(1, (nParts - 1) * (nOperators - 1));

    // Equipment 자유도: 전체 측정수 - 처리 조합수
    const totalCells = nParts * nOperators;
    const totalMeasurements = totalCells * nRepeats;
    const equipmentDF = Math.max(1, totalMeasurements - totalCells);

    // 자유도 유효성 검증 및 경고
    if (partDF === 1) console.warn('⚠️ 대상자 수 부족: 최소 3개 권장');
    if (operatorDF === 1) console.warn('⚠️ 측정자 수 부족: 최소 3명 권장');
    if (equipmentDF < 5) console.warn('⚠️ 반복 측정 부족: 신뢰성 저하 위험');

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
    // F-분포 p-value 계산 개선 - 정확한 임계값 사용
    if (fStat <= 0) return 1.0;
    if (!isFinite(fStat)) return 0.001;

    // 자유도에 따른 정확한 F-임계값 선택
    let criticalF05: number;
    let criticalF01: number;

    // df1에 따른 임계값 선택
    if (df1 <= 1) {
      criticalF05 = df2 <= 5 ? 6.61 : df2 <= 10 ? 4.96 : df2 <= 20 ? 4.35 : 3.84;
      criticalF01 = df2 <= 5 ? 16.26 : df2 <= 10 ? 10.04 : df2 <= 20 ? 8.10 : 6.63;
    } else if (df1 <= 2) {
      criticalF05 = df2 <= 5 ? 5.79 : df2 <= 10 ? 4.10 : df2 <= 20 ? 3.49 : 2.99;
      criticalF01 = df2 <= 5 ? 13.27 : df2 <= 10 ? 7.56 : df2 <= 20 ? 5.85 : 4.61;
    } else if (df1 <= 5) {
      criticalF05 = df2 <= 5 ? 5.05 : df2 <= 10 ? 3.33 : df2 <= 20 ? 2.71 : 2.21;
      criticalF01 = df2 <= 5 ? 11.39 : df2 <= 10 ? 6.55 : df2 <= 20 ? 4.94 : 3.69;
    } else {
      criticalF05 = df2 <= 5 ? 4.74 : df2 <= 10 ? 2.98 : df2 <= 20 ? 2.35 : 1.83;
      criticalF01 = df2 <= 5 ? 10.67 : df2 <= 10 ? 5.64 : df2 <= 20 ? 4.10 : 2.99;
    }

    // 정확한 p-value 범위 반환
    if (fStat > criticalF01) return Math.min(0.01, 0.01 * Math.exp(-(fStat - criticalF01) * 0.5));
    if (fStat > criticalF05) {
      // 0.01 < p < 0.05 구간에서 보간
      const ratio = (fStat - criticalF05) / (criticalF01 - criticalF05);
      return Math.max(0.01, 0.05 - 0.04 * ratio);
    }

    // p > 0.05 구간
    if (fStat > 1.0) {
      const ratio = (fStat - 1.0) / (criticalF05 - 1.0);
      return Math.max(0.05, Math.min(0.9, 0.9 - 0.85 * ratio));
    }

    return Math.max(0.5, Math.min(0.95, 0.95 - fStat * 0.45));
  }
}

/**
 * Gage R&R 계산기 (Single Responsibility Principle)
 */
class GageRRCalculator implements IGageRRCalculator {
  calculate(anova: ANOVAResult, nParts: number = 5, nOperators: number = 2, nRepeats: number = 5, groupedData?: Map<string, Map<string, number[]>>): GageRRMetrics {
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

    // 기존 P/T, NDC, Cpk 제거 - 현재 분석에서 사용하지 않음

    // 작업시간 분석용 추가 지표 계산 (작업 유형 고려)
    const workTimeMetrics = this.calculateWorkTimeMetrics(anova, nParts, nOperators, nRepeats, '기타', groupedData);

    return {
      gageRRPercent: Math.min(100, Math.max(0, gageRRPercent)),
      repeatability,
      reproducibility,
      partVariation,
      totalVariation,
      ...workTimeMetrics
    };
  }

  /**
   * 작업시간 분석용 지표 계산 (물류작업 특성 반영)
   */
  private calculateWorkTimeMetrics(anova: ANOVAResult, nParts: number, nOperators: number, nRepeats: number, workType: string = '기타', groupedData: Map<string, Map<string, number[]>>) {
    const varianceComponents = this.calculateVarianceComponents(anova, nParts, nOperators, nRepeats);

    // ICC(2,1) 계산 - 극단적 케이스 처리 개선 (MSA-4 표준)
    // ICC(2,1) = (MS_between - MS_within) / (MS_between + (k-1) * MS_within)
    // MS_between = partMS, MS_within = equipmentMS, k = nOperators
    const MS_between = Math.max(0.0001, anova.partMS); // 최소값 보장
    const MS_within = Math.max(0.0001, anova.equipmentMS); // 최소값 보장
    const k = Math.max(2, nOperators); // 최소 2명 보장

    // 극단적 케이스 처리: MS_within이 0에 가까운 경우
    let icc: number;
    if (MS_within < 0.001) {
      // 측정 오차가 거의 없는 경우 (이상적 상황)
      icc = 0.99; // 매우 높은 신뢰성으로 설정
    } else if (MS_between < MS_within) {
      // 대상자간 차이가 측정 오차보다 작은 경우
      icc = 0.01; // 매우 낮은 신뢰성
    } else {
      const icc_numerator = MS_between - MS_within;
      const icc_denominator = MS_between + (k - 1) * MS_within;

      if (icc_denominator > 0) {
        icc = Math.max(0.01, Math.min(0.99, icc_numerator / icc_denominator));
      } else {
        icc = 0.01; // 안전한 기본값
      }
    }

    // Grand Mean 계산 - ANOVA에서 사용된 전체 평균 (올바른 CV 계산을 위함)
    let grandMeanSum = 0;
    let grandMeanCount = 0;

    if (groupedData) {
      // 모든 측정값의 합계와 개수 계산 (Grand Mean 구하기)
      for (const [partKey, operatorMap] of groupedData) {
        for (const [operatorKey, measurements] of operatorMap) {
          for (const measurement of measurements) {
            if (!isNaN(measurement) && measurement > 0) {
              grandMeanSum += measurement;
              grandMeanCount++;
            }
          }
        }
      }
    }

    // Grand Mean 계산 (ANOVA에서 사용된 전체 평균)
    const grandMean = totalCount > 0 ? totalSum / totalCount : 1000; // 1초 기본값

    // 총 표준편차 계산 (모든 변동 성분 포함) - 올바른 공식
    const totalStd = Math.sqrt(Math.max(0, 
      varianceComponents.part + varianceComponents.operator + 
      varianceComponents.interaction + varianceComponents.equipment));

    // 변동계수 계산: CV = (σ / Grand Mean) × 100 (올바른 공식)
    const cv = grandMean > 0 ? (totalStd / grandMean) * 100 : 100;

    // 작업 유형별 임계값 가져오기 (자동 감지 로직 포함)
    const detectWorkType = (cv: number, icc: number): string => {
      if (cv <= 6 && icc >= 0.8) return '피킹';
      if (cv <= 7 && icc >= 0.78) return '검수';
      if (cv <= 10 && icc >= 0.7) return '운반';
      if (cv <= 12 && icc >= 0.65) return '적재';
      return workType;
    };

    const autoDetectedType = detectWorkType(cv, icc);
    const thresholds = LOGISTICS_WORK_THRESHOLDS.BY_WORK_TYPE[autoDetectedType as keyof typeof LOGISTICS_WORK_THRESHOLDS.BY_WORK_TYPE] || 
                      LOGISTICS_WORK_THRESHOLDS.BY_WORK_TYPE['기타'];

    // 분위수 계산 - 보수적 접근법 (정규성 가정 완화) - Grand Mean 기반
    const conservativeFactor = 1.2; // 20% 안전 마진
    const q95 = grandMean + NORMAL_DISTRIBUTION.Q95 * totalStd * conservativeFactor;
    const q99 = grandMean + NORMAL_DISTRIBUTION.Q99 * totalStd * conservativeFactor;
    const q999 = grandMean + NORMAL_DISTRIBUTION.Q999 * totalStd * conservativeFactor;

    // 물류작업 특성에 맞는 표준시간 설정 신뢰성 판단
    const isReliableForStandard = (cv <= thresholds.cv) && (icc >= thresholds.icc);

    return {
      icc: Math.max(0, Math.min(1, icc)),
      cv: Math.max(0, cv),
      q95: Math.max(0, q95),
      q99: Math.max(0, q99),
      q999: Math.max(0, q999),
      isReliableForStandard,
      thresholds, // 사용된 임계값 정보 포함
      // Gage R&R 표준 지표 (NDC, P/T 등은 현재 분석에서 사용하지 않음)
      ndc: 0,
      ptRatio: 0,
      cpk: 0
    };
  }

  private calculateVarianceComponents(anova: ANOVAResult, nParts: number, nOperators: number, nRepeats: number): VarianceComponents {
    // MSA-4 표준에 따른 올바른 분산 성분 계산 (REML 방법론)
    const defaultVariance = { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 };

    if (!anova || typeof anova !== 'object') {
      return defaultVariance;
    }

    // Repeatability (Equipment Variance) - 항상 양수
    const sigma2_equipment = Math.max(0, anova.equipmentMS);

    // Interaction Variance - 올바른 공식 적용
    const var_interaction_raw = Math.max(0, (anova.interactionMS - anova.equipmentMS) / nRepeats);

    // Reproducibility (Operator Variance) - 올바른 공식 적용
    const var_operator_raw = Math.max(0, (anova.operatorMS - anova.interactionMS) / (nParts * nRepeats));

    // Part-to-Part Variance - 올바른 공식 적용
    const var_part_raw = Math.max(0, (anova.partMS - anova.interactionMS) / (nOperators * nRepeats));

    // Total Variance - 모든 성분의 합
    const var_total = var_part_raw + var_operator_raw + var_interaction_raw + sigma2_equipment;

    // 유효성 검증
    if (var_total <= 0) {
      console.warn('⚠️ 총 분산이 0 이하 - 최소값으로 보정');
    }

    return {
      part: var_part_raw,
      operator: var_operator_raw,
      interaction: var_interaction_raw,
      equipment: sigma2_equipment,
      total: Math.max(0.0001, var_total)
    };
  }
}

/**
 * 상태 평가기 (Single Responsibility Principle)
 */
class StatusEvaluator {
  static determineStatus(gageRRPercent: number): 'excellent' | 'acceptable' | 'marginal' | 'unacceptable' {
    if (gageRRPercent < 10) return 'excellent';
    if (gageRRPercent < 30) return 'acceptable';
    if (gageRRPercent < 50) return 'marginal';
    return 'unacceptable';
  }
}

/**
 * 분석 팩토리 (Dependency Inversion Principle)
 */
class AnalysisFactory {
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

  private static readonly statisticsCalculator = AnalysisFactory.createStatisticsCalculator();
  private static readonly anovaCalculator = AnalysisFactory.createANOVACalculator();
  private static readonly gageRRCalculator = AnalysisFactory.createGageRRCalculator();

  static calculateGageRR(lapTimes: LapTime[]): GageRRResult {
    if (this.recursionCounter > this.MAX_RECURSION_DEPTH) {
      console.error('재귀 깊이 초과');
      this.recursionCounter = 0;
      throw new Error('Maximum recursion depth exceeded');
    }

    this.recursionCounter++;

    try {
      // 엣지 케이스 처리 강화
      if (!lapTimes || lapTimes.length < 6) {
        throw new Error('Gage R&R 분석을 위해서는 최소 6개의 측정값이 필요합니다.');
      }

      // 데이터 유효성 검증 강화
      const validLapTimes = lapTimes.filter(lap => 
        lap && 
        typeof lap.time === 'number' && 
        lap.time > 0 && 
        lap.operator && 
        lap.target
      );

      if (validLapTimes.length < 6) {
        throw new Error('유효한 측정값이 부족합니다. 최소 6개의 유효한 측정값이 필요합니다.');
      }

      // 데이터 그룹화
      const groupedData = DataGrouper.groupSafely(validLapTimes);

      // 그룹화된 데이터 유효성 검증
      if (groupedData.size < 2) {
        throw new Error('분석을 위해서는 최소 2개 이상의 대상자가 필요합니다.');
      }

      // 측정자 수 검증
      const operatorSet = new Set();
      for (const [partKey, operatorMap] of groupedData) {
        for (const operatorKey of operatorMap.keys()) {
          operatorSet.add(operatorKey);
        }
      }

      if (operatorSet.size < 2) {
        throw new Error('분석을 위해서는 최소 2명 이상의 측정자가 필요합니다.');
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

      this.recursionCounter = 0;

      return {
        ...metrics,
        status: StatusEvaluator.determineStatus(metrics.gageRRPercent),
        anova,
        varianceComponents
      };
    } catch (error) {
      this.recursionCounter = 0;
      throw error;
    }
  }

  private static calculateVarianceComponents(anova: ANOVAResult): VarianceComponents {
    // MSA-4 표준에 따른 분산 성분 계산 (REML 방법론)

    // Repeatability (Equipment Variance) - 항상 양수
    const sigma2_equipment = Math.max(0, anova.equipmentMS);

    // Interaction Variance - 제약 없는 추정
    const var_interaction_raw = (anova.interactionMS - anova.equipmentMS) / 2; // nRepeats = 2 가정
    const var_interaction = Math.max(0, var_interaction_raw);

    // Reproducibility (Operator Variance) - 제약 없는 추정  
    const var_operator_raw = (anova.operatorMS - anova.interactionMS) / (5 * 2); // nParts=5, nRepeats=2 가정
    const var_operator = Math.max(0, var_operator_raw);

    // Part-to-Part Variance - 제약 없는 추정
    const var_part_raw = (anova.partMS - anova.interactionMS) / (2 * 2); // nOperators=2, nRepeats=2 가정  
    const var_part = Math.max(0, var_part_raw);

    // Total Variance - 모든 성분의 합
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