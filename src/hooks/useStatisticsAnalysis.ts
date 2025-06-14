
import { useState, useMemo, useCallback } from 'react';
import { LapTime } from '../types';
import { LOGISTICS_WORK_THRESHOLDS } from '../constants/analysis';

// 통계 계산 인터페이스
interface IStatisticsCalculator {
  calcICC(values: { worker: string; observer: string; time: number }[]): number;
  calcDeltaPair(ev: { tA: number; tB: number }): number;
  statusFromGRR(grr: number): 'success' | 'warning' | 'error' | 'info';
  statusFromICC(icc: number): 'success' | 'warning' | 'error' | 'info';
  statusFromDP(dp: number): 'success' | 'warning' | 'error' | 'info';
}

// 통계 계산 구현체
class StatisticsCalculator implements IStatisticsCalculator {
  calcICC(values: { worker: string; observer: string; time: number }[]): number {
    if (values.length < 6) return 0;
    
    const workers = Array.from(new Set(values.map(v => v.worker)));
    const observers = Array.from(new Set(values.map(v => v.observer)));
    
    if (workers.length < 2 || observers.length < 2) return 0;
    
    const grandMean = values.reduce((sum, v) => sum + v.time, 0) / values.length;
    
    let betweenWorkerSS = 0;
    let withinWorkerSS = 0;
    
    for (const worker of workers) {
      const workerValues = values.filter(v => v.worker === worker);
      if (workerValues.length > 0) {
        const workerMean = workerValues.reduce((sum, v) => sum + v.time, 0) / workerValues.length;
        betweenWorkerSS += workerValues.length * Math.pow(workerMean - grandMean, 2);
        
        for (const value of workerValues) {
          withinWorkerSS += Math.pow(value.time - workerMean, 2);
        }
      }
    }
    
    const betweenWorkerMS = betweenWorkerSS / Math.max(1, workers.length - 1);
    const withinWorkerMS = withinWorkerSS / Math.max(1, values.length - workers.length);
    
    const icc = Math.max(0, (betweenWorkerMS - withinWorkerMS) / (betweenWorkerMS + withinWorkerMS));
    return Math.min(1, icc);
  }

  calcDeltaPair(ev: { tA: number; tB: number }): number {
    return Math.abs(ev.tA - ev.tB);
  }

  statusFromGRR(grr: number): 'success' | 'warning' | 'error' | 'info' {
    return grr >= 10 ? 'warning' : 'success';
  }

  statusFromICC(icc: number): 'success' | 'warning' | 'error' | 'info' {
    if (icc >= 0.8) return 'success';
    if (icc >= 0.7) return 'warning';
    return 'error';
  }

  statusFromDP(dp: number): 'success' | 'warning' | 'error' | 'info' {
    const threshold = LOGISTICS_WORK_THRESHOLDS.CV_THRESHOLD * 0.01;
    return dp > threshold ? 'error' : 'success';
  }
}

// 윈도우 버퍼 타입
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

export const useStatisticsAnalysis = (lapTimes: LapTime[]) => {
  const [calculator] = useState<IStatisticsCalculator>(() => new StatisticsCalculator());
  const [windowBuffer] = useState(() => createWindowBuffer<{ worker: string; observer: string; time: number }>(30));
  const [iccValue, setIccValue] = useState(0);
  const [deltaPairValue, setDeltaPairValue] = useState(0);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  
  // gaugeData 객체 추가 (물류작업 특성 반영)
  const [gaugeData] = useState(() => ({
    grr: 0,
    repeatability: 0,
    reproducibility: 0,
    status: 'info' as 'success' | 'warning' | 'error' | 'info'
  }));

  // MSA 표준 ANOVA 기반 Gage R&R 계산 (상세 분석과 동일한 공식)
  const actualGRR = useMemo(() => {
    if (lapTimes.length < 6) return 0;
    
    try {
      const operators = Array.from(new Set(lapTimes.map(lap => lap.operator)));
      const targets = Array.from(new Set(lapTimes.map(lap => lap.target)));
      
      if (operators.length < 2 || targets.length < 2) return 0;
      
      // 데이터 그룹화 (밀리초 단위 그대로 사용 - 상세 분석과 일치)
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
      
      // 기본 통계
      let totalSum = 0;
      let totalCount = 0;
      for (const [target, operatorMap] of groupedData) {
        for (const [operator, measurements] of operatorMap) {
          totalSum += measurements.reduce((sum, val) => sum + val, 0);
          totalCount += measurements.length;
        }
      }
      const grandMean = totalSum / totalCount;
      
      // ANOVA 계산 (MSA 표준)
      const nParts = targets.length;
      const nOperators = operators.length;
      let nRepeats = 0;
      for (const [target, operatorMap] of groupedData) {
        for (const [operator, measurements] of operatorMap) {
          nRepeats = Math.max(nRepeats, measurements.length);
        }
      }
      
      // Part SS 계산
      let partSS = 0;
      for (const target of targets) {
        let partSum = 0;
        let partCount = 0;
        if (groupedData.has(target)) {
          for (const [operator, measurements] of groupedData.get(target)!) {
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
        for (const [target, operatorMap] of groupedData) {
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
      for (const target of targets) {
        for (const operator of operators) {
          if (groupedData.has(target) && groupedData.get(target)!.has(operator)) {
            const measurements = groupedData.get(target)!.get(operator)!;
            if (measurements.length > 0) {
              const cellMean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
              
              // Part 평균
              let partSum = 0, partCount = 0;
              for (const [op, meas] of groupedData.get(target)!) {
                partSum += meas.reduce((sum, val) => sum + val, 0);
                partCount += meas.length;
              }
              const partMean = partCount > 0 ? partSum / partCount : grandMean;
              
              // Operator 평균
              let operatorSum = 0, operatorCount = 0;
              for (const [tgt, operatorMap] of groupedData) {
                if (operatorMap.has(operator)) {
                  const meas = operatorMap.get(operator)!;
                  operatorSum += meas.reduce((sum, val) => sum + val, 0);
                  operatorCount += meas.length;
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
      for (const [target, operatorMap] of groupedData) {
        for (const [operator, measurements] of operatorMap) {
          for (const measurement of measurements) {
            totalSS += Math.pow(measurement - grandMean, 2);
          }
        }
      }
      
      // Equipment SS (Repeatability)
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
      
      // MSA 표준 분산 성분 계산
      const var_equipment = equipmentMS;
      const var_interaction = Math.max(0, (interactionMS - equipmentMS) / nRepeats);
      const var_operator = Math.max(0, (operatorMS - interactionMS) / (nParts * nRepeats));
      const var_part = Math.max(0, (partMS - interactionMS) / (nOperators * nRepeats));
      
      // 표준편차 계산
      const repeatability = Math.sqrt(Math.max(0, var_equipment));
      const reproducibility = Math.sqrt(Math.max(0, var_operator));
      const partVariation = Math.sqrt(Math.max(0, var_part));
      const interactionVariation = Math.sqrt(Math.max(0, var_interaction));
      
      // Total Gage R&R 계산 (MSA 표준)
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
      
      // Gage R&R 백분율 계산 (상세 분석과 완전 동일)
      const gageRRPercent = totalVariation > 0 ? (gageRR / totalVariation) * 100 : 0;
      
      return Math.min(100, Math.max(0, gageRRPercent));
    } catch (error) {
      console.warn('GRR 계산 오류:', error);
      return 0;
    }
  }, [lapTimes]);

  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    // 윈도우 버퍼에 데이터 추가 (밀리초 단위 유지)
    windowBuffer.push({
      worker: newLap.operator,
      observer: newLap.target,
      time: newLap.time
    });

    // ICC 재계산
    const newICC = calculator.calcICC(windowBuffer.values());
    setIccValue(newICC);

    // ΔPair 계산 (밀리초 단위 유지)
    if (allLaps.length >= 2) {
      const lastTwo = allLaps.slice(-2);
      const deltaPair = calculator.calcDeltaPair({
        tA: lastTwo[0].time,
        tB: lastTwo[1].time
      });
      setDeltaPairValue(deltaPair);

      // 물류작업 특성에 맞는 임계값 사용 (밀리초 단위로 변환)
      const threshold = LOGISTICS_WORK_THRESHOLDS.CV_THRESHOLD * 10; // 밀리초 기준으로 조정
      if (deltaPair > threshold) {
        setShowRetakeModal(true);
      }
    }

    // gaugeData 업데이트 (actualGRR과 동일한 값 사용)
    if (allLaps.length >= 6) {
      const operators = Array.from(new Set(allLaps.map(lap => lap.operator)));
      const targets = Array.from(new Set(allLaps.map(lap => lap.target)));
      
      if (operators.length >= 2 && targets.length >= 2) {
        // actualGRR과 동일한 계산 결과 사용하여 일관성 보장
        gaugeData.grr = actualGRR;
        gaugeData.status = calculator.statusFromGRR(gaugeData.grr);
      }
    }
  }, [calculator, windowBuffer, gaugeData]);

  const statisticsStatus = useMemo(() => ({
    grr: calculator.statusFromGRR(actualGRR),
    icc: calculator.statusFromICC(iccValue),
    deltaPair: calculator.statusFromDP(deltaPairValue)
  }), [calculator, actualGRR, iccValue, deltaPairValue]);

  return {
    iccValue,
    deltaPairValue,
    showRetakeModal,
    setShowRetakeModal,
    updateStatistics,
    statisticsStatus,
    gaugeData  // 누락된 gaugeData 객체 추가
  };
};
