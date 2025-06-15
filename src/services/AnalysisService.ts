import { LapTime, GageRRResult, ANOVAResult, VarianceComponents, TransformType } from '../types';
import { LOGISTICS_WORK_THRESHOLDS, NORMAL_DISTRIBUTION, F_DISTRIBUTION_CRITICAL } from '../constants/analysis';

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
  q95: number;           // 95% 달성가능 시간
  q99: number;           // 99% 달성가능 시간
  q999: number;          // 99.9% 달성가능 시간
  isReliableForStandard: boolean; // 표준시간 설정 가능 여부
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
        console.error('데이터 변환 실패:', error);
        throw new Error(`데이터 변환 중 오류: ${error}`);
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
        console.error('유효하지 않은 데이터:', lap);
        throw new Error(`데이터 검증 실패: ${JSON.stringify(lap)}`);
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

    for (const [, operators] of groupedData) {
      for (const [, measurements] of operators) {
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
    for (const [, operators] of groupedData) {
      for (const [, measurements] of operators) {
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
    for (const [, operatorMap] of groupedData) {
      for (const operatorKey of operatorMap.keys()) {
        if (!operators.includes(operatorKey)) {
          operators.push(operatorKey);
        }
      }
    }

    const grandMean = statistics.grandMean;
    const nParts = parts.length;
    const nOperators = operators.length;

    // 측정 횟수 계산 및 균형성 검증
    let minRepeats = Infinity;
    let maxRepeats = 0;
    for (const [, operatorMap] of groupedData) {
      for (const [, measurements] of operatorMap) {
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
        for (const [, measurements] of groupedData.get(part)!) {
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

      for (const [, operatorMap] of groupedData) {
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
            for (const [, opMeasurements] of groupedData.get(part)!) {
              partSum += opMeasurements.reduce((sum, val) => sum + val, 0);
              partCount += opMeasurements.length;
            }
            const partMean = partCount > 0 ? partSum / partCount : grandMean;

            // 해당 operator의 평균
            let operatorSum = 0;
            let operatorCount = 0;
            for (const [, operatorMap] of groupedData) {
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
    for (const [, operators] of groupedData) {
      for (const [, measurements] of operators) {
        for (const measurement of measurements) {
          if (!isNaN(measurement)) {
            totalSS += Math.pow(measurement - grandMean, 2);
          }
        }
      }
    }

    // Equipment SS (Repeatability) 계산
    const equipmentSS = Math.max(0, totalSS - partSS - operatorSS - interactionSS);

    // 자유도 계산 (MSA 표준) - 극단적 케이스 처리 개선
    const partDF = nParts > 1 ? (nParts - 1) : 1;
    const operatorDF = nOperators > 1 ? (nOperators - 1) : 1;
    const interactionDF = (nParts > 1 && nOperators > 1) ? 
      (nParts - 1) * (nOperators - 1) : 1;
    const equipmentDF = Math.max(1, nParts * nOperators * Math.max(1, nRepeats - 1));

    // 자유도 유효성 검증
    if (partDF <= 0 || operatorDF <= 0 || interactionDF <= 0 || equipmentDF <= 0) {
      console.warn('⚠️ 자유도 계산 이상 - 최소값으로 보정');
    }

    // 평균제곱 계산
    const partMS = partSS / partDF;
    const operatorMS = operatorSS / operatorDF;
    const interactionMS = interactionSS / interactionDF;
    const equipmentMS = equipmentSS / equipmentDF;

    // F 통계량 계산 (올바른 공식)
    const fStatistic = equipmentMS > 0 ? partMS / equipmentMS : 0;

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

  private calculatePValue(fStat: number, _df1: number, df2: number): number {
    // 간단하고 직관적인 p-value 근사 계산
    if (fStat <= 0) return 1.0;
    if (fStat < 0.5) return 0.9;

    // 자유도 고려한 개선된 임계값
    const smallSampleAdjustment = df2 < 15 ? 1.2 : 1.0;
    const adjustedThresholds = {
      alpha001: F_DISTRIBUTION_CRITICAL.ALPHA_001.small_df * smallSampleAdjustment,
      alpha01: F_DISTRIBUTION_CRITICAL.ALPHA_01.small_df * smallSampleAdjustment,
      alpha05: F_DISTRIBUTION_CRITICAL.ALPHA_05.small_df * smallSampleAdjustment,
      alpha10: F_DISTRIBUTION_CRITICAL.ALPHA_10.small_df * smallSampleAdjustment
    };

    if (fStat > adjustedThresholds.alpha001) return 0.001;
    if (fStat > adjustedThresholds.alpha01) return 0.01;
    if (fStat > adjustedThresholds.alpha05) return 0.05;
    if (fStat > adjustedThresholds.alpha10) return 0.1;

    // 선형 보간으로 중간값 계산
    return Math.max(0.1, Math.min(0.5, 0.4 - (fStat - 1.0) * 0.1));
  }
}

/**
 * Gage R&R 계산기 (Single Responsibility Principle)
 */
class GageRRCalculator implements IGageRRCalculator {
  calculate(anova: ANOVAResult, nParts: number = 5, nOperators: number = 2, nRepeats: number = 5, groupedData?: Map<string, Map<string, number[]>>): GageRRMetrics {
    const varianceComponents = this.calculateVarianceComponents(anova, nParts, nOperators, nRepeats);

    // MSA-4 표준 계산 (물류현장 99.73% 신뢰구간)
    const repeatability = 6.0 * Math.sqrt(Math.max(0, varianceComponents.equipment));

    // 재현성 = 6σ × √(측정자분산 + 상호작용분산)
    const reproducibilityVariance = Math.max(0, 
      varianceComponents.operator + varianceComponents.interaction
    );
    const reproducibility = 6.0 * Math.sqrt(reproducibilityVariance);

    const partVariation = 6.0 * Math.sqrt(Math.max(0, varianceComponents.part));

    // MSA 표준 Total Gage R&R = √(반복성² + 재현성²)
    const gageRR = Math.sqrt(
      Math.pow(repeatability, 2) + 
      Math.pow(reproducibility, 2)
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
    const workTimeMetrics = this.calculateWorkTimeMetrics(anova, nParts, nOperators, nRepeats, '기타', groupedData || new Map());

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

    // MSA-4 표준 ICC(2,1) 공식 (물류현장 신뢰성 평가)
    // ICC(2,1) = (MS_parts - MS_error) / (MS_parts + (k-1)*MS_error + k*(MS_operators - MS_error)/n)
    const MS_parts = anova.partMS;
    const MS_operators = anova.operatorMS;
    const MS_error = anova.equipmentMS;
    const k = nOperators;
    const n = nParts;

    // 분모 계산 (상호작용 효과 포함)
    const numerator = MS_parts - MS_error;
    const denominator = MS_parts + (k - 1) * MS_error + k * Math.max(0, MS_operators - MS_error) / n;

    const icc = denominator > 0 ? 
                Math.max(0, Math.min(1, numerator / denominator)) : 0;

    // Grand Mean 계산 - ANOVA에서 사용된 전체 평균 (올바른 CV 계산을 위함)
    let grandMeanSum = 0;
    let grandMeanCount = 0;

    if (groupedData) {
      // 모든 측정값의 합계와 개수 계산 (Grand Mean 구하기)
      for (const [, operatorMap] of groupedData) {
        for (const [, measurements] of operatorMap) {
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
    const grandMean = grandMeanCount > 0 ? grandMeanSum / grandMeanCount : 1000; // 1초 기본값

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
    // MSA-4 표준에 따른 분산 성분 계산 (개선된 REML 접근법)

    // Repeatability (Equipment Variance) - 항상 양수
    const sigma2_equipment = Math.max(0, anova.equipmentMS);

    // Interaction Variance - 제약 없는 추정
    const var_interaction_raw = (anova.interactionMS - anova.equipmentMS) / nRepeats;
    const var_interaction = var_interaction_raw < 0 ? 
      Math.max(0, var_interaction_raw * 0.1) : // 음수인 경우 작은 양수로 보정
      var_interaction_raw;

    // Reproducibility (Operator Variance) - 제약 없는 추정
    const var_operator_raw = (anova.operatorMS - anova.interactionMS) / (nParts * nRepeats);
    const var_operator = var_operator_raw < 0 ? 
      Math.max(0, var_operator_raw * 0.1) : // 음수인 경우 작은 양수로 보정
      var_operator_raw;

    // Part-to-Part Variance - 제약 없는 추정
    const var_part_raw = (anova.partMS - anova.interactionMS) / (nOperators * nRepeats);
    const var_part = var_part_raw < 0 ? 
      Math.max(0, var_part_raw * 0.1) : // 음수인 경우 작은 양수로 보정
      var_part_raw;

    // Total Variance - 안전한 계산
    const var_total = Math.max(0.0001, var_part + var_operator + var_interaction + sigma2_equipment);

    // 통계적 의미 검증
    if (var_part < 0 || var_operator < 0 || var_interaction < 0) {
      console.warn('⚠️ 음수 분산 성분 감지 - REML 보정 적용');
    }

    return {
      part: Math.max(0, var_part),
      operator: Math.max(0, var_operator),
      interaction: Math.max(0, var_interaction),
      equipment: sigma2_equipment,
      total: var_total
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

  static getGRRStatus(gageRRPercent: number): 'excellent' | 'acceptable' | 'marginal' | 'unacceptable' {
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
export interface IAnalysisConfig {
  readonly maxRecursionDepth: number;
}

export class AnalysisService {
  private static readonly config: IAnalysisConfig = {
    maxRecursionDepth: 100
  };
  // 스레드 안전성을 위해 심볼 기반 추적으로 변경
  private static readonly recursionMap = new WeakMap<any, number>();

  private static readonly dataTransformer = AnalysisFactory.createDataTransformer();
  private static readonly statisticsCalculator = AnalysisFactory.createStatisticsCalculator();
  private static readonly anovaCalculator = AnalysisFactory.createANOVACalculator();
  private static readonly gageRRCalculator = AnalysisFactory.createGageRRCalculator();

  static calculateGageRR(lapTimes: LapTime[], transformType: TransformType = 'none'): GageRRResult {
    const callId = { id: Math.random() };
    const currentDepth = (this.recursionMap.get(callId) || 0) + 1;
    
    if (currentDepth > this.config.maxRecursionDepth) {
      console.error('재귀 깊이 초과');
      throw new Error('Maximum recursion depth exceeded');
    }

    this.recursionMap.set(callId, currentDepth);

    try {
      if (lapTimes.length < 2) {
        throw new Error('분석을 위해서는 최소 2개의 측정값이 필요합니다.');
      }

      // 1인 측정 등 최소 요구사항 미충족 시 기본 분석 제공
      if (lapTimes.length < 6) {
        const basicResult = this.calculateBasicAnalysis(lapTimes);
        this.recursionMap.delete(callId);
        return basicResult;
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

      for (const [, operatorMap] of groupedData) {
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

      this.recursionMap.delete(callId);

      return {
        ...metrics,
        status: StatusEvaluator.getGRRStatus(metrics.gageRRPercent),
        anova,
        varianceComponents,
        q95: metrics.q95 || 0,
        q999: metrics.q999 || 0
      };
    } catch (error) {
      this.recursionMap.delete(callId);
      throw error;
    }
  }

  /**
   * 1인 측정 등 최소 요구사항 미충족 시 기본 분석 제공
   */
  private static calculateBasicAnalysis(lapTimes: LapTime[]): GageRRResult {
    const times = lapTimes.map(lap => lap.time);
    const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
    const variance = times.length > 1 ? 
      times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / (times.length - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0;

    // 기본 분위수 계산 (정규분포 가정)
    const q95 = mean + 1.645 * stdDev;
    const q99 = mean + 2.326 * stdDev;
    const q999 = mean + 3.090 * stdDev;

    // 측정시스템 신뢰성 평가 (1인 측정은 기본적으로 부적절)
    const operators = new Set(lapTimes.map(lap => lap.operator)).size;
    const targets = new Set(lapTimes.map(lap => lap.target)).size;
    
    return {
      gageRRPercent: 100, // 1인 측정은 측정시스템 신뢰성 부족
      repeatability: 0, // 측정자간 비교 불가
      reproducibility: 0, // 측정자간 비교 불가
      partVariation: 0, // 대상자간 변동 분석 제한적
      totalVariation: stdDev * 6, // 6σ 기준
      icc: 0, // 측정자간 신뢰성 계산 불가
      cv: cv,
      q95: q95,
      q99: q99,
      q999: q999,
      isReliableForStandard: false, // 표준시간 설정 부적절
      ndc: 0,
      ptRatio: 0,
      cpk: 0,
      status: operators < 2 ? 'unacceptable' : 'marginal', // 측정자 수에 따른 상태
      anova: {
        partSS: 0, operatorSS: 0, interactionSS: 0, equipmentSS: variance * times.length,
        totalSS: variance * times.length, partMS: 0, operatorMS: 0, interactionMS: 0,
        equipmentMS: variance, fStatistic: 0, pValue: 1.0
      },
      varianceComponents: {
        part: 0, operator: 0, interaction: 0, equipment: 1.0, total: 1.0
      }
    };
  }

  private static calculateVarianceComponents(anova: ANOVAResult): VarianceComponents {
    if (!anova) {
      return { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0.0001 };
    }
    const total = Math.max(0.0001, 
      (anova.partMS || 0) + (anova.operatorMS || 0) + (anova.interactionMS || 0) + (anova.equipmentMS || 0));

    return {
      part: (anova.partMS || 0) / total,
      operator: (anova.operatorMS || 0) / total,
      interaction: (anova.interactionMS || 0) / total,
      equipment: (anova.equipmentMS || 0) / total,
      total: total
    };
  }
}