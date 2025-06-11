
import { useState, useMemo, useCallback } from 'react';
import { LapTime } from '../types';

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
    const threshold = 10 * 0.01;
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
  const [gaugeData] = useState({ grr: 15.2 });
  const [windowBuffer] = useState(() => createWindowBuffer<{ worker: string; observer: string; time: number }>(30));
  const [iccValue, setIccValue] = useState(0);
  const [deltaPairValue, setDeltaPairValue] = useState(0);
  const [showRetakeModal, setShowRetakeModal] = useState(false);

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

      const threshold = 10 * 0.01;
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
    gaugeData,
    iccValue,
    deltaPairValue,
    showRetakeModal,
    setShowRetakeModal,
    updateStatistics,
    statisticsStatus
  };
};
