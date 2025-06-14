
import { useState, useMemo, useCallback, useRef } from 'react';
import { LapTime } from '../types';
import { LOGISTICS_WORK_THRESHOLDS } from '../constants/analysis';
import { AnalysisService } from '../services/AnalysisService';

// 통계 계산 인터페이스 (Interface Segregation Principle)
interface IStatisticsCalculator {
  calcDeltaPair(ev: { tA: number; tB: number }): number;
  statusFromGRR(grr: number): 'success' | 'warning' | 'error' | 'info';
  statusFromICC(icc: number): 'success' | 'warning' | 'error' | 'info';
  statusFromDP(dp: number): 'success' | 'warning' | 'error' | 'info';
}

// 캐시된 분석 결과 인터페이스
interface CachedAnalysisResult {
  dataHash: string;
  analysis: any;
  timestamp: number;
}

// 게이지 데이터 인터페이스
interface GaugeData {
  grr: number;
  repeatability: number;
  reproducibility: number;
  partVariation: number;
  totalVariation: number;
  status: 'success' | 'warning' | 'error' | 'info';
  varianceComponents: any;
  cv: number;
  icc: number;
  q99: number;
  isReliableForStandard: boolean;
}

// 통계 계산 구현체 (AnalysisService 위임)
class StatisticsCalculator implements IStatisticsCalculator {
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

// 데이터 해시 생성 함수 (성능 최적화)
function generateDataHash(lapTimes: LapTime[]): string {
  return lapTimes
    .map(lap => `${lap.operator}-${lap.target}-${lap.time}`)
    .sort()
    .join('|');
}

// 윈도우 버퍼
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

  // 성능 최적화: 분석 결과 캐시
  const analysisCache = useRef<CachedAnalysisResult | null>(null);
  const CACHE_EXPIRY = 5000; // 5초

  // 메모이제이션된 분석 계산 (AnalysisService 활용)
  const analysisResult = useMemo(() => {
    if (lapTimes.length < 6) {
      return null;
    }

    try {
      const currentHash = generateDataHash(lapTimes);
      const now = Date.now();

      // 캐시 확인
      if (analysisCache.current && 
          analysisCache.current.dataHash === currentHash &&
          (now - analysisCache.current.timestamp) < CACHE_EXPIRY) {
        return analysisCache.current.analysis;
      }

      // 새로운 분석 계산 (AnalysisService 위임)
      const analysis = AnalysisService.calculateGageRR(lapTimes, 'none');

      // 캐시 업데이트
      analysisCache.current = {
        dataHash: currentHash,
        analysis,
        timestamp: now
      };

      return analysis;
    } catch (error) {
      console.warn('분석 계산 오류:', error);
      return null;
    }
  }, [lapTimes]);

  // 게이지 데이터 (AnalysisService 결과 활용)
  const gaugeData = useMemo((): GaugeData => {
    if (!analysisResult) {
      return {
        grr: 0,
        repeatability: 0,
        reproducibility: 0,
        partVariation: 0,
        totalVariation: 0,
        status: 'info',
        varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
        cv: 0,
        icc: 0,
        q99: 0,
        isReliableForStandard: false
      };
    }

    // AnalysisService 결과를 GaugeData 형식으로 변환
    const thresholds = LOGISTICS_WORK_THRESHOLDS.BY_WORK_TYPE['기타'];
    const isReliableForStandard = (analysisResult.cv <= thresholds.cv) && (analysisResult.icc >= thresholds.icc);

    return {
      grr: analysisResult.gageRRPercent,
      repeatability: analysisResult.repeatability,
      reproducibility: analysisResult.reproducibility,
      partVariation: analysisResult.partVariation,
      totalVariation: analysisResult.totalVariation,
      status: calculator.statusFromGRR(analysisResult.gageRRPercent),
      varianceComponents: analysisResult.varianceComponents,
      cv: analysisResult.cv,
      icc: analysisResult.icc,
      q99: analysisResult.q99,
      isReliableForStandard
    };
  }, [analysisResult, calculator]);

  // ICC 값 동기화
  useMemo(() => {
    if (analysisResult?.icc !== undefined) {
      setIccValue(analysisResult.icc);
    }
  }, [analysisResult]);

  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    // 윈도우 버퍼에 데이터 추가
    windowBuffer.push({
      worker: newLap.operator,
      observer: newLap.target,
      time: newLap.time
    });

    // ΔPair 계산 (가벼운 계산만 실시간으로)
    if (allLaps.length >= 2) {
      const lastTwo = allLaps.slice(-2);
      const deltaPair = calculator.calcDeltaPair({
        tA: lastTwo[0].time,
        tB: lastTwo[1].time
      });
      setDeltaPairValue(deltaPair);

      // 임계값 비교
      const workTimeMean = allLaps.reduce((sum, lap) => sum + lap.time, 0) / allLaps.length;
      const threshold = workTimeMean * 0.15;
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
    gaugeData,
    // 상세 분석 결과 노출 (App.tsx에서 직접 사용 가능)
    detailedAnalysis: analysisResult
  };
};
