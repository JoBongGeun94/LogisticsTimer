import { useState, useMemo, useCallback, useRef } from 'react';
import { LapTime } from '../types';
import { LOGISTICS_WORK_THRESHOLDS } from '../constants/analysis';
import { AnalysisService } from '../services/AnalysisService';

// 통계 계산 인터페이스 (Interface Segregation Principle)
interface IStatisticsCalculator {
  statusFromGRR(grr: number): 'success' | 'warning' | 'error' | 'info';
  statusFromICC(icc: number): 'success' | 'warning' | 'error' | 'info';
  statusFromDP(dp: number): 'success' | 'warning' | 'error' | 'info';
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
  varianceComponents: {
    part: number;
    operator: number;
    interaction: number;
    equipment: number;
    total: number;
  };
}

// 통계 계산 구현체 (Single Responsibility Principle)
class StatisticsCalculator implements IStatisticsCalculator {
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

export const useStatisticsAnalysis = (lapTimes: LapTime[]) => {
  const [calculator] = useState<IStatisticsCalculator>(() => new StatisticsCalculator());
  const [iccValue, setIccValue] = useState(0);
  const [deltaPairValue, setDeltaPairValue] = useState(0);
  const [showRetakeModal, setShowRetakeModal] = useState(false);

  // 성능 최적화: 메모이제이션 개선 및 해시 기반 캐싱
  const analysisCache = useRef<{
    dataHash: string;
    result: GaugeData;
  }>({ dataHash: '', result: {
    grr: 0, repeatability: 0, reproducibility: 0, partVariation: 0, 
    totalVariation: 0, status: 'info', cv: 0, q99: 0, 
    isReliableForStandard: false, 
    varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 }
  }});

  // 게이지 데이터 계산 - AnalysisService만 사용 (중복 제거 및 성능 최적화)
  const gaugeData = useMemo((): GaugeData => {
    if (lapTimes.length < 6) {
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

    // 성능 최적화: 해시 기반 캐시 활용
    const dataHash = `${lapTimes.length}-${lapTimes[lapTimes.length - 1]?.time}-${lapTimes[lapTimes.length - 1]?.operator}-${lapTimes[lapTimes.length - 1]?.target}`;

    if (analysisCache.current.dataHash === dataHash) {
      return analysisCache.current.result;
    }

    try {
      // AnalysisService를 통한 통합 계산 (중복 제거)
      const analysis = AnalysisService.calculateGageRR(lapTimes);

      const result: GaugeData = {
        grr: Math.min(100, Math.max(0, analysis.gageRRPercent)),
        repeatability: analysis.repeatability,
        reproducibility: analysis.reproducibility,
        partVariation: analysis.partVariation,
        totalVariation: analysis.totalVariation,
        status: calculator.statusFromGRR(analysis.gageRRPercent),
        cv: Math.max(0, analysis.cv),
        q99: Math.max(0, analysis.q99),
        isReliableForStandard: analysis.isReliableForStandard,
        varianceComponents: analysis.varianceComponents
      };

      // 캐시 업데이트
      analysisCache.current = { dataHash, result };

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
  }, [lapTimes.length, lapTimes[lapTimes.length - 1]?.time, calculator]);

  // 통계 업데이트 - AnalysisService 기반으로 통합
  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    try {
      // ICC 재계산 - AnalysisService 활용
      if (allLaps.length >= 6) {
        const analysis = AnalysisService.calculateGageRR(allLaps);
        setIccValue(analysis.icc);
      }

      // ΔPair 계산 (최적화: 마지막 2개만 계산)
      if (allLaps.length >= 2) {
        const lastTwo = allLaps.slice(-2);
        const deltaPair = Math.abs(lastTwo[0].time - lastTwo[1].time);
        setDeltaPairValue(deltaPair);

        // 임계값 비교 최적화
        const workTimeMean = allLaps.reduce((sum, lap) => sum + lap.time, 0) / allLaps.length;
        const threshold = workTimeMean * 0.15;
        if (deltaPair > threshold) {
          setShowRetakeModal(true);
        }
      }
    } catch (error) {
      console.warn('통계 업데이트 오류:', error);
    }
  }, []);

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