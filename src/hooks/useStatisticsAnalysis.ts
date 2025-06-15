import { useState, useMemo, useCallback, useRef } from 'react';
import { LapTime } from '../types';
import { LOGISTICS_WORK_THRESHOLDS } from '../constants/analysis';
import { AnalysisService } from '../services/AnalysisService';

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



// 게이지 데이터 인터페이스 (Interface Segregation Principle)
interface GaugeData {
  grr: number;
  repeatability: number;
  reproducibility: number;
  partVariation: number;
  totalVariation: number;
  status: 'success' | 'warning' | 'error' | 'info';
  cv: number;
  q99: number;
  isReliableForStandard: boolean;
  varianceComponents: VarianceComponents;
}

// 통계 계산 구현체 (Single Responsibility Principle)
class StatisticsCalculator implements IStatisticsCalculator {
  calcICC(values: { worker: string; observer: string; time: number }[]): number {
    if (values.length < 6) return 0;

    try {
      // LapTime 형식으로 변환하여 AnalysisService 활용
      const lapTimes: LapTime[] = values.map((v, index) => ({
        id: index,
        time: v.time,
        timestamp: new Date().toISOString(),
        operator: v.worker,
        target: v.observer,
        sessionId: 'temp'
      }));

      // AnalysisService를 통한 ICC 계산 (개선된 공식 적용)
      const analysis = AnalysisService.calculateGageRR(lapTimes);
      return Number.isNaN(analysis.icc) ? 0 : Math.max(0, Math.min(1, analysis.icc));
    } catch (error) {
      console.warn('ICC 계산 오류:', error);
      return 0;
    }
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
    const threshold = LOGISTICS_WORK_THRESHOLDS.CV_THRESHOLD * 10;
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

export const useStatisticsAnalysis = (lapTimes: LapTime[] = []) => {
  const [showRetakeModal, setShowRetakeModal] = useState(false);

  

  const [calculator] = useState<IStatisticsCalculator>(() => new StatisticsCalculator());
  const [windowBuffer] = useState(() => createWindowBuffer<{ worker: string; observer: string; time: number }>(20)); // 메모리 사용량 감소
  const [iccValue, setIccValue] = useState(0);
  const [deltaPairValue, setDeltaPairValue] = useState(0);

  // 성능 최적화: 메모이제이션 개선 및 해시 기반 캐싱 (크기 제한)
  const analysisCache = useRef<{
    dataHash: string;
    result: GaugeData;
    timestamp: number;
  }>({ dataHash: '', timestamp: 0, result: {
    grr: 0, repeatability: 0, reproducibility: 0, partVariation: 0, 
    totalVariation: 0, status: 'info', cv: 0, q99: 0, 
    isReliableForStandard: false, 
    varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 }
  }});

  // 게이지 데이터 계산 - AnalysisService 활용으로 중복 제거
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
        cv: 0,
		q99: 0,
        isReliableForStandard: false,
		varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
      };
    }

    // 성능 최적화: 안전한 해시 기반 캐시 활용
    const dataHash = lapTimes.length > 0 ? 
      `${lapTimes.length}-${lapTimes[lapTimes.length - 1]?.time}-${lapTimes[0]?.operator}` : 
      'empty';

    // 캐시 만료 체크 (5초)
    const now = Date.now();
    const cacheAge = now - (analysisCache.current.timestamp || 0);
    
    if (analysisCache.current.dataHash === dataHash && cacheAge < 5000) {
      return analysisCache.current.result;
    }

    try {
      // AnalysisService를 통한 통합 계산 (중복 제거)
      const analysis = AnalysisService.calculateGageRR(lapTimes);

      const result = {
        grr: Math.min(100, Math.max(0, analysis.gageRRPercent)),
        repeatability: analysis.repeatability,
        reproducibility: analysis.reproducibility,
        partVariation: analysis.partVariation,
        totalVariation: analysis.totalVariation,
        status: calculator.statusFromGRR(analysis.gageRRPercent),
        cv: Math.max(0, analysis.cv),
        q99: Math.max(0, analysis.q99),
        isReliableForStandard: analysis.isReliableForStandard,
        varianceComponents: analysis.varianceComponents || { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 }
      };

      // 캐시 업데이트 (타임스탬프 포함)
      analysisCache.current = {
        dataHash: dataHash,
        result: result,
        timestamp: now
      };

      return result;
    } catch (error) {
      console.warn('실시간 Gauge 데이터 계산 오류:', error);
      return {
        grr: 0,
        repeatability: 0,
        reproducibility: 0,
        partVariation: 0,
        totalVariation: 0,
        status: 'error',
        cv: 0,
		q99: 0,
        isReliableForStandard: false,
		varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
      };
    }
  }, [lapTimes.length, calculator]); // 의존성 최적화 - 객체 참조 제거

  // 통계 업데이트 최적화
  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    // 윈도우 버퍼에 데이터 추가
    windowBuffer.push({
      worker: newLap.operator,
      observer: newLap.target,
      time: newLap.time
    });

    // ICC 재계산 (AnalysisService 활용)
    const newICC = calculator.calcICC(windowBuffer.values());
    setIccValue(newICC);

    // ΔPair 계산 (최적화: 마지막 2개만 계산)
    if (allLaps.length >= 2) {
      const lastTwo = allLaps.slice(-2);
      const deltaPair = calculator.calcDeltaPair({
        tA: lastTwo[0].time,
        tB: lastTwo[1].time
      });
      setDeltaPairValue(deltaPair);

      // 임계값 비교 최적화
      const workTimeMean = allLaps.reduce((sum, lap) => sum + lap.time, 0) / allLaps.length;
      const threshold = workTimeMean * 0.15;
      if (deltaPair > threshold) {
        setShowRetakeModal(true);
      }
    }
  }, [calculator, windowBuffer]);

  // 상태 계산 최적화
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