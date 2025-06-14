
import { useState, useMemo, useCallback } from 'react';
import { LapTime } from '../types';
import { LOGISTICS_WORK_THRESHOLDS, NORMAL_DISTRIBUTION } from '../constants/analysis';

// 통계 계산 인터페이스 (Interface Segregation Principle)
interface IStatisticsCalculator {
  calcICC(values: { worker: string; observer: string; time: number }[]): number;
  calcDeltaPair(ev: { tA: number; tB: number }): number;
  statusFromGRR(grr: number): 'success' | 'warning' | 'error' | 'info';
  statusFromICC(icc: number): 'success' | 'warning' | 'error' | 'info';
  statusFromDP(dp: number): 'success' | 'warning' | 'error' | 'info';
}

// 분산 구성요소 인터페이스 (Single Responsibility Principle)
interface VarianceComponents {
  part: number;
  operator: number;
  interaction: number;
  equipment: number;
  total: number;
}

// ANOVA 결과 인터페이스
interface ANOVAResult {
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

// 통계 계산 구현체 (상세 분석과 완전 동일한 로직)
class StatisticsCalculator implements IStatisticsCalculator {
  // ICC 계산 - 상세 분석과 완전 동일한 공식 적용
  calcICC(values: { worker: string; observer: string; time: number }[]): number {
    if (values.length < 6) return 0;
    
    const workers = Array.from(new Set(values.map(v => v.worker)));
    const observers = Array.from(new Set(values.map(v => v.observer)));
    
    if (workers.length < 2 || observers.length < 2) return 0;
    
    try {
      // 데이터 그룹화 (상세 분석과 동일)
      const groupedData = new Map<string, Map<string, number[]>>();
      for (const value of values) {
        if (!groupedData.has(value.observer)) {
          groupedData.set(value.observer, new Map<string, number[]>());
        }
        if (!groupedData.get(value.observer)!.has(value.worker)) {
          groupedData.get(value.observer)!.set(value.worker, []);
        }
        groupedData.get(value.observer)!.get(value.worker)!.push(value.time);
      }
      
      // ANOVA 계산 (상세 분석과 완전 동일)
      const anova = this.calculateANOVA(groupedData);
      
      // ICC(2,1) 계산 - MSA 표준 공식
      const nOperators = workers.length;
      const nParts = observers.length;
      
      // ICC 분모 계산 (상세 분석과 동일)
      const denominator = anova.partMS + (nOperators - 1) * anova.equipmentMS + 
                         nOperators * (anova.operatorMS - anova.equipmentMS) / nParts;
      
      // ICC 계산
      const icc = denominator > 0 ? 
                  Math.max(0, (anova.partMS - anova.equipmentMS) / denominator) : 0;
      
      return Math.min(1, Math.max(0, icc));
    } catch (error) {
      console.warn('ICC 계산 오류:', error);
      return 0;
    }
  }

  // ANOVA 계산 - 상세 분석과 완전 동일한 로직
  private calculateANOVA(groupedData: Map<string, Map<string, number[]>>): ANOVAResult {
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
    
    // 기본 통계 계산
    let totalSum = 0;
    let totalCount = 0;
    for (const [partKey, operatorMap] of groupedData) {
      for (const [operatorKey, measurements] of operatorMap) {
        totalSum += measurements.reduce((sum, val) => sum + val, 0);
        totalCount += measurements.length;
      }
    }
    const grandMean = totalCount > 0 ? totalSum / totalCount : 0;
    
    const nParts = parts.length;
    const nOperators = operators.length;
    let nRepeats = 0;
    for (const [partKey, operatorMap] of groupedData) {
      for (const [operatorKey, measurements] of operatorMap) {
        nRepeats = Math.max(nRepeats, measurements.length);
      }
    }
    
    // Part SS 계산
    let partSS = 0;
    for (const part of parts) {
      let partSum = 0;
      let partCount = 0;
      if (groupedData.has(part)) {
        for (const [operatorKey, measurements] of groupedData.get(part)!) {
          partSum += measurements.reduce((sum, val) => sum + val, 0);
          partCount += measurements.length;
        }
      }
      if (partCount > 0) {
        const partMean = partSum / partCount;
        partSS += partCount * Math.pow(partMean - grandMean, 2);
      }
    }
    
    // Operator SS 계산
    let operatorSS = 0;
    for (const operator of operators) {
      let operatorSum = 0;
      let operatorCount = 0;
      for (const [partKey, operatorMap] of groupedData) {
        if (operatorMap.has(operator)) {
          const measurements = operatorMap.get(operator)!;
          operatorSum += measurements.reduce((sum, val) => sum + val, 0);
          operatorCount += measurements.length;
        }
      }
      if (operatorCount > 0) {
        const operatorMean = operatorSum / operatorCount;
        operatorSS += operatorCount * Math.pow(operatorMean - grandMean, 2);
      }
    }
    
    // Interaction SS 계산
    let interactionSS = 0;
    for (const part of parts) {
      for (const operator of operators) {
        if (groupedData.has(part) && groupedData.get(part)!.has(operator)) {
          const measurements = groupedData.get(part)!.get(operator)!;
          if (measurements.length > 0) {
            const cellMean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
            
            // Part 평균
            let partSum = 0, partCount = 0;
            for (const [opKey, opMeasurements] of groupedData.get(part)!) {
              partSum += opMeasurements.reduce((sum, val) => sum + val, 0);
              partCount += opMeasurements.length;
            }
            const partMean = partCount > 0 ? partSum / partCount : grandMean;
            
            // Operator 평균
            let operatorSum = 0, operatorCount = 0;
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
          totalSS += Math.pow(measurement - grandMean, 2);
        }
      }
    }
    
    // Equipment SS 계산
    const equipmentSS = Math.max(0, totalSS - partSS - operatorSS - interactionSS);
    
    // 자유도 및 평균제곱 계산
    const partDF = Math.max(1, nParts - 1);
    const operatorDF = Math.max(1, nOperators - 1);
    const interactionDF = Math.max(1, (nParts - 1) * (nOperators - 1));
    const equipmentDF = Math.max(1, nParts * nOperators * (nRepeats - 1));
    
    const partMS = partSS / partDF;
    const operatorMS = operatorSS / operatorDF;
    const interactionMS = interactionSS / interactionDF;
    const equipmentMS = equipmentSS / equipmentDF;
    
    // F 통계량 계산
    const fStatistic = equipmentMS > 0 ? partMS / equipmentMS : 0;
    const pValue = 0.05; // 간단한 근사값
    
    return {
      partSS, operatorSS, interactionSS, equipmentSS, totalSS,
      partMS, operatorMS, interactionMS, equipmentMS,
      fStatistic, pValue
    };
  }

  calcDeltaPair(ev: { tA: number; tB: number }): number {
    return Math.abs(ev.tA - ev.tB);
  }

  statusFromGRR(grr: number): 'success' | 'warning' | 'error' | 'info' {
    if (grr < 10) return 'success';
    if (grr < 30) return 'warning';
    return 'error';
  }

  statusFromICC(icc: number): 'success' | 'warning' | 'error' | 'info' {
    if (icc >= 0.8) return 'success';
    if (icc >= 0.7) return 'warning';
    return 'error';
  }

  statusFromDP(dp: number): 'success' | 'warning' | 'error' | 'info' {
    const threshold = LOGISTICS_WORK_THRESHOLDS.CV_THRESHOLD * 10; // 밀리초 기준
    return dp > threshold ? 'error' : 'success';
  }
}

// 윈도우 버퍼 (Single Responsibility Principle)
type WindowBuffer<T> = { 
  size: number; 
  push: (v: T) => void; 
  values: () => T[] 
};

function createWindowBuffer<T>(size: number): WindowBuffer<T> {
  const buffer: T[] = [];
  
  return {
    size,
    push: (value: T) => {
      buffer.push(value);
      if (buffer.length > size) {
        buffer.shift();
      }
    },
    values: () => [...buffer]
  };
}

// 게이지 데이터 인터페이스 (Interface Segregation Principle)
interface GaugeData {
  grr: number;
  repeatability: number;
  reproducibility: number;
  partVariation: number;
  totalVariation: number;
  status: 'success' | 'warning' | 'error' | 'info';
  varianceComponents: VarianceComponents;
  cv: number;
  q99: number;
  isReliableForStandard: boolean;
}

export const useStatisticsAnalysis = (lapTimes: LapTime[]) => {
  const [calculator] = useState<IStatisticsCalculator>(() => new StatisticsCalculator());
  const [windowBuffer] = useState(() => createWindowBuffer<{ worker: string; observer: string; time: number }>(30));
  const [iccValue, setIccValue] = useState(0);
  const [deltaPairValue, setDeltaPairValue] = useState(0);
  const [showRetakeModal, setShowRetakeModal] = useState(false);

  // 완전한 게이지 데이터 계산 (상세 분석과 동일)
  const gaugeData = useMemo((): GaugeData => {
    if (lapTimes.length < 6) {
      console.info(`실시간 분석: 데이터 부족 (${lapTimes.length}/6개). 최소 6개 측정값 필요.`);
      return {
        grr: 0,
        repeatability: 0,
        reproducibility: 0,
        partVariation: 0,
        totalVariation: 0,
        status: 'info',
        varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
        cv: 0,
        q99: 0,
        isReliableForStandard: false
      };
    }

    try {
      const operators = Array.from(new Set(lapTimes.map(lap => lap.operator)));
      const targets = Array.from(new Set(lapTimes.map(lap => lap.target)));
      
      if (operators.length < 2 || targets.length < 2) {
        return {
          grr: 0,
          repeatability: 0,
          reproducibility: 0,
          partVariation: 0,
          totalVariation: 0,
          status: 'info',
          varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
          cv: 0,
          q99: 0,
          isReliableForStandard: false
        };
      }

      // 데이터 그룹화 (상세 분석과 완전 동일)
      const groupedData = new Map<string, Map<string, number[]>>();
      for (const lap of lapTimes) {
        if (!groupedData.has(lap.target)) {
          groupedData.set(lap.target, new Map<string, number[]>());
        }
        if (!groupedData.get(lap.target)!.has(lap.operator)) {
          groupedData.get(lap.target)!.set(lap.operator, []);
        }
        groupedData.get(lap.target)!.get(lap.operator)!.push(lap.time);
      }

      // ANOVA 계산 (상세 분석과 동일)
      const anova = (calculator as any).calculateANOVA(groupedData);
      
      // 분산 구성요소 계산 (상세 분석과 동일)
      const nParts = targets.length;
      const nOperators = operators.length;
      let nRepeats = 0;
      for (const [target, operatorMap] of groupedData) {
        for (const [operator, measurements] of operatorMap) {
          nRepeats = Math.max(nRepeats, measurements.length);
        }
      }

      // MSA 표준 분산 성분 계산
      const var_equipment = anova.equipmentMS;
      const var_interaction = Math.max(0, (anova.interactionMS - anova.equipmentMS) / nRepeats);
      const var_operator = Math.max(0, (anova.operatorMS - anova.interactionMS) / (nParts * nRepeats));
      const var_part = Math.max(0, (anova.partMS - anova.interactionMS) / (nOperators * nRepeats));

      // 표준편차 계산
      const repeatability = Math.sqrt(Math.max(0, var_equipment));
      const reproducibility = Math.sqrt(Math.max(0, var_operator));
      const partVariation = Math.sqrt(Math.max(0, var_part));
      const interactionVariation = Math.sqrt(Math.max(0, var_interaction));

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

      // CV 계산 - 상세 분석과 완전 동일한 공식
      const actualMean = Math.sqrt(Math.max(0.01, anova.partMS / Math.max(1, nOperators * nRepeats)));
      const totalStd = Math.sqrt(var_part + var_operator + var_interaction + var_equipment);
      const cv = actualMean > 0 ? (totalStd / actualMean) * 100 : 100;

      // Q99 계산 - 상세 분석과 동일
      const conservativeFactor = 1.2;
      const q99 = actualMean + NORMAL_DISTRIBUTION.Q99 * totalStd * conservativeFactor;

      // 표준시간 설정 신뢰성 판단
      const thresholds = LOGISTICS_WORK_THRESHOLDS.BY_WORK_TYPE['기타'];
      const isReliableForStandard = (cv <= thresholds.cv) && (iccValue >= thresholds.icc);

      return {
        grr: Math.min(100, Math.max(0, gageRRPercent)),
        repeatability,
        reproducibility,
        partVariation,
        totalVariation,
        status: calculator.statusFromGRR(gageRRPercent),
        varianceComponents: {
          part: var_part,
          operator: var_operator,
          interaction: var_interaction,
          equipment: var_equipment,
          total: var_part + var_operator + var_interaction + var_equipment
        },
        cv: Math.max(0, cv),
        q99: Math.max(0, q99),
        isReliableForStandard
      };
    } catch (error) {
      console.warn('Gauge 데이터 계산 오류:', error);
      return {
        grr: 0,
        repeatability: 0,
        reproducibility: 0,
        partVariation: 0,
        totalVariation: 0,
        status: 'error',
        varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
        cv: 0,
        q99: 0,
        isReliableForStandard: false
      };
    }
  }, [lapTimes, calculator, iccValue]);

  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    // 윈도우 버퍼에 데이터 추가
    windowBuffer.push({
      worker: newLap.operator,
      observer: newLap.target,
      time: newLap.time
    });

    // ICC 재계산 (상세 분석과 동일한 로직)
    const newICC = calculator.calcICC(windowBuffer.values());
    setIccValue(newICC);

    // ΔPair 계산
    if (allLaps.length >= 2) {
      const lastTwo = allLaps.slice(-2);
      const deltaPair = calculator.calcDeltaPair({
        tA: lastTwo[0].time,
        tB: lastTwo[1].time
      });
      setDeltaPairValue(deltaPair);

      // 임계값 비교 - 실제 작업시간 기반으로 계산
      const workTimeMean = allLaps.reduce((sum, lap) => sum + lap.time, 0) / allLaps.length;
      const threshold = workTimeMean * 0.15; // 15% 변동 허용
      if (deltaPair > threshold) {
        setShowRetakeModal(true);
      }
    }
  }, [calculator, windowBuffer]);

  const statisticsStatus = useMemo(() => ({
    grr: calculator.statusFromGRR(gaugeData.grr),
    icc: calculator.statusFromICC(iccValue),
    deltaPair: calculator.statusFromDP(deltaPairValue)
  }), [calculator, gaugeData.grr, iccValue, deltaPairValue]);

  return {
    iccValue,
    deltaPairValue,
    showRetakeModal,
    setShowRetakeModal,
    updateStatistics,
    statisticsStatus,
    gaugeData
  };
};
