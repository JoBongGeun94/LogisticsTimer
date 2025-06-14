
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

  // 실제 Gage R&R 값 계산 (물류작업 특성 반영) - 먼저 정의
  const actualGRR = useMemo(() => {
    if (lapTimes.length < 6) return 0;
    
    try {
      // 물류작업 특성에 맞는 간단한 GRR 근사 계산
      const operators = Array.from(new Set(lapTimes.map(lap => lap.operator)));
      const targets = Array.from(new Set(lapTimes.map(lap => lap.target)));
      
      if (operators.length < 2 || targets.length < 2) return 0;
      
      // 측정자간 변동성 계산
      let operatorVariance = 0;
      for (const operator of operators) {
        const operatorTimes = lapTimes.filter(lap => lap.operator === operator).map(lap => lap.time / 1000);
        if (operatorTimes.length > 1) {
          const mean = operatorTimes.reduce((sum, t) => sum + t, 0) / operatorTimes.length;
          const variance = operatorTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / (operatorTimes.length - 1);
          operatorVariance += variance;
        }
      }
      
      // 총 변동성 계산
      const allTimes = lapTimes.map(lap => lap.time / 1000);
      const grandMean = allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length;
      const totalVariance = allTimes.reduce((sum, t) => sum + Math.pow(t - grandMean, 2), 0) / (allTimes.length - 1);
      
      // GRR 백분율 계산 (물류작업 특성 고려)
      const grrPercent = totalVariance > 0 ? Math.sqrt(operatorVariance / operators.length) / Math.sqrt(totalVariance) * 100 : 0;
      
      return Math.min(100, Math.max(0, grrPercent));
    } catch (error) {
      console.warn('GRR 계산 오류:', error);
      return 0;
    }
  }, [lapTimes]);

  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    // 윈도우 버퍼에 데이터 추가
    windowBuffer.push({
      worker: newLap.operator,
      observer: newLap.target,
      time: newLap.time / 1000
    });

    // ICC 재계산
    const newICC = calculator.calcICC(windowBuffer.values());
    setIccValue(newICC);

    // ΔPair 계산
    if (allLaps.length >= 2) {
      const lastTwo = allLaps.slice(-2);
      const deltaPair = calculator.calcDeltaPair({
        tA: lastTwo[0].time / 1000,
        tB: lastTwo[1].time / 1000
      });
      setDeltaPairValue(deltaPair);

      // 물류작업 특성에 맞는 임계값 사용
      const threshold = LOGISTICS_WORK_THRESHOLDS.CV_THRESHOLD * 0.01;
      if (deltaPair > threshold) {
        setShowRetakeModal(true);
      }
    }

    // gaugeData 업데이트 (안전한 GRR 참조)
    if (allLaps.length >= 6) {
      // 실시간 GRR 계산 (actualGRR 대신 직접 계산)
      const operators = Array.from(new Set(allLaps.map(lap => lap.operator)));
      const targets = Array.from(new Set(allLaps.map(lap => lap.target)));
      
      if (operators.length >= 2 && targets.length >= 2) {
        let operatorVariance = 0;
        for (const operator of operators) {
          const operatorTimes = allLaps.filter(lap => lap.operator === operator).map(lap => lap.time / 1000);
          if (operatorTimes.length > 1) {
            const mean = operatorTimes.reduce((sum, t) => sum + t, 0) / operatorTimes.length;
            const variance = operatorTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / (operatorTimes.length - 1);
            operatorVariance += variance;
          }
        }
        
        const allTimes = allLaps.map(lap => lap.time / 1000);
        const grandMean = allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length;
        const totalVariance = allTimes.reduce((sum, t) => sum + Math.pow(t - grandMean, 2), 0) / (allTimes.length - 1);
        
        const newGRR = totalVariance > 0 ? Math.sqrt(operatorVariance / operators.length) / Math.sqrt(totalVariance) * 100 : 0;
        
        gaugeData.grr = Math.min(100, Math.max(0, newGRR));
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
