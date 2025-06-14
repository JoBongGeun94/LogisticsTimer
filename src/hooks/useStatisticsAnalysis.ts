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

  // 성능 최적화: 메모이제이션 개선 및 해시 기반 캐싱 (타입 안전성 강화)
  const analysisCache = useRef<{
    dataHash: string;
    result: GaugeData;
    timestamp?: number;
  }>({ 
    dataHash: '', 
    result: {
      grr: 0, 
      repeatability: 0, 
      reproducibility: 0, 
      partVariation: 0, 
      totalVariation: 0, 
      status: 'info', 
      cv: 0, 
      q99: 0, 
      isReliableForStandard: false, 
      varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 }
    },
    timestamp: 0
  });

  // 게이지 데이터 계산 - AnalysisService만 사용 (캐시 로직 개선)
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

    // 개선된 해시 계산 (측정자, 대상자 변화 감지)
    const uniqueOperators = [...new Set(lapTimes.map(lap => lap.operator))].sort();
    const uniqueTargets = [...new Set(lapTimes.map(lap => lap.target))].sort();
    const dataHash = `${lapTimes.length}-${uniqueOperators.join(',')}-${uniqueTargets.join(',')}-${lapTimes.slice(-3).map(lap => lap.time).join(',')}`;

    if (analysisCache.current.dataHash === dataHash) {
      return analysisCache.current.result;
    }

    try {
      // AnalysisService를 통한 통합 계산 (오류 처리 강화)
      const analysis = AnalysisService.calculateGageRR(lapTimes);

      const result: GaugeData = {
        grr: Math.min(100, Math.max(0, analysis.gageRRPercent || 0)),
        repeatability: Math.max(0, analysis.repeatability || 0),
        reproducibility: Math.max(0, analysis.reproducibility || 0),
        partVariation: Math.max(0, analysis.partVariation || 0),
        totalVariation: Math.max(0, analysis.totalVariation || 0),
        status: calculator.statusFromGRR(analysis.gageRRPercent || 0),
        cv: Math.max(0, analysis.cv || 0),
        q99: Math.max(0, analysis.q99 || 0),
        isReliableForStandard: analysis.isReliableForStandard || false,
        varianceComponents: analysis.varianceComponents || { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 }
      };

      // 캐시 업데이트 (타임스탬프 추가)
      analysisCache.current = { 
        dataHash, 
        result,
        timestamp: Date.now()
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
  }, [lapTimes, calculator]);

  // 통계 업데이트 - AnalysisService 기반으로 통합 (오류 처리 강화)
  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    try {
      // ICC 재계산 - AnalysisService 활용 (안전성 검증 추가)
      if (allLaps.length >= 6) {
        try {
          const analysis = AnalysisService.calculateGageRR(allLaps);
          const iccValue = Math.max(0, Math.min(1, analysis.icc || 0));
          setIccValue(iccValue);
        } catch (analysisError) {
          console.warn('ICC 계산 오류:', analysisError);
          setIccValue(0);
        }
      }

      // ΔPair 계산 (동일 측정자, 동일 대상자인 경우만)
      if (allLaps.length >= 2) {
        const lastTwo = allLaps.slice(-2);
        
        // 동일 조건에서의 측정만 비교
        if (lastTwo[0].operator === lastTwo[1].operator && 
            lastTwo[0].target === lastTwo[1].target) {
          
          const deltaPair = Math.abs(lastTwo[1].time - lastTwo[0].time);
          setDeltaPairValue(deltaPair);

          // 동적 임계값 계산 - 작업 특성 및 측정 횟수 반영
          const workTimeMean = allLaps
            .filter(lap => lap.operator === newLap.operator && lap.target === newLap.target)
            .reduce((sum, lap) => sum + lap.time, 0) / Math.max(1, allLaps.filter(lap => lap.operator === newLap.operator && lap.target === newLap.target).length);
          
          const dynamicThreshold = LOGISTICS_WORK_THRESHOLDS.getDynamicThreshold('기타', 0.12, allLaps.length);
          const threshold = workTimeMean * (dynamicThreshold.cv / 100);
          
          // 연속 측정값 차이가 동적 임계값 초과 시 재측정 권고
          if (deltaPair > threshold && allLaps.length > 6) {
            setShowRetakeModal(true);
          }
        }
      }
    } catch (error) {
      console.warn('통계 업데이트 오류:', error);
      // 오류 발생 시 기본값으로 초기화
      setIccValue(0);
      setDeltaPairValue(0);
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