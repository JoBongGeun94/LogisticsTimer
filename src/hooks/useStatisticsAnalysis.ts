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
  dataQuality: {
    originalCount: number;
    validCount: number;
    outliersDetected: number;
    isNormalDistribution: boolean;
    normalityTest: {
      statistic: number;
      pValue: number;
      method: string;
    } | null;
    outlierMethod: string;
    preprocessingApplied: boolean;
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

  // 측정자 및 대상자 변경 감지를 위한 현재 상태 추적
  const currentOperatorRef = useRef<string>('');
  const currentTargetRef = useRef<string>('');
  
  // 게이지 데이터 계산 - AnalysisService만 사용 (중복 제거 및 성능 최적화)
  const gaugeData = useMemo((): GaugeData => {
    // 측정자 및 대상자 변경 시 캐시 초기화
    const currentOperator = lapTimes.length > 0 ? lapTimes[lapTimes.length - 1]?.operator : '';
    const currentTarget = lapTimes.length > 0 ? lapTimes[lapTimes.length - 1]?.target : '';
    
    // 측정자 또는 대상자 변경 감지
    const operatorChanged = currentOperator && currentOperator !== currentOperatorRef.current;
    const targetChanged = currentTarget && currentTarget !== currentTargetRef.current;
    
    if (operatorChanged || targetChanged) {
      analysisCache.current = { dataHash: '', result: {
        grr: 0, repeatability: 0, reproducibility: 0, partVariation: 0, 
        totalVariation: 0, status: 'info', cv: 0, q99: 0, 
        isReliableForStandard: false, 
        varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 }
      } as GaugeData };
      
      if (operatorChanged) {
        currentOperatorRef.current = currentOperator;
        console.log(`🔄 측정자 변경 감지: ${currentOperatorRef.current} → 분석 캐시 초기화`);
      }
      
      if (targetChanged) {
        currentTargetRef.current = currentTarget;
        console.log(`🎯 대상자 변경 감지: ${currentTargetRef.current} → 분석 캐시 초기화`);
      }
    }
    if (lapTimes.length < 3) {
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
        dataQuality: {
          originalCount: lapTimes.length,
          validCount: 0,
          outliersDetected: 0,
          isNormalDistribution: true,
          normalityTest: null,
          outlierMethod: 'IQR',
          preprocessingApplied: false
        }
      };
    }

    // 기본 통계 계산 (3개 이상 데이터)
    if (lapTimes.length < 6) {
      const times = lapTimes.map(lap => lap.time);
      const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / (times.length - 1);
      const std = Math.sqrt(variance);
      const cv = mean > 0 ? (std / mean) * 100 : 0;

      return {
        grr: 0,
        repeatability: 0,
        reproducibility: 0,
        partVariation: 0,
        totalVariation: std,
        status: 'info',
        cv: Math.max(0, cv),
        q99: mean + 2.576 * std, // 99% 분위수 근사
        isReliableForStandard: false,
        varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: variance, total: variance },
        dataQuality: {
          originalCount: lapTimes.length,
          validCount: lapTimes.length,
          outliersDetected: 0,
          isNormalDistribution: true,
          normalityTest: null,
          outlierMethod: 'IQR',
          preprocessingApplied: false
        }
      };
    }

    // 🔧 개선된 해시 기반 캐싱 - 완전한 데이터 무결성 보장
    const latestLap = lapTimes[lapTimes.length - 1];
    const uniqueOperators = [...new Set(lapTimes.map(lap => lap.operator))].sort().join(',');
    const uniqueTargets = [...new Set(lapTimes.map(lap => lap.target))].sort().join(',');
    
    // 완전한 데이터 해시 계산 (모든 측정값 포함)
    const timeValues = lapTimes.map(lap => lap.time).join(',');
    const operatorSequence = lapTimes.map(lap => lap.operator).join(',');
    const targetSequence = lapTimes.map(lap => lap.target).join(',');
    const dataHash = `${lapTimes.length}-${timeValues}-${operatorSequence}-${targetSequence}-${uniqueOperators}-${uniqueTargets}`;

    if (analysisCache.current.dataHash === dataHash) {
      return analysisCache.current.result;
    }

    try {
      // 🔧 AnalysisService를 통한 통합 계산 (실시간-상세분석 동기화)
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
        varianceComponents: analysis.varianceComponents || {
          part: 0, operator: 0, interaction: 0, equipment: 0, total: 0
        },
        dataQuality: analysis.dataQuality || {
          originalCount: lapTimes.length,
          validCount: lapTimes.length,
          outliersDetected: 0,
          isNormalDistribution: true,
          normalityTest: null,
          outlierMethod: 'IQR',
          preprocessingApplied: false
        }
      };

      // 🔧 원자적 캐시 업데이트 (레이스 컨디션 방지)
      analysisCache.current = { dataHash, result };

      return result;
    } catch (error) {
      console.error('실시간 Gauge 데이터 계산 오류:', error);
      
      // 구체적인 오류 메시지 제공
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.warn(`📊 분석 실패 원인: ${errorMessage}`);
      
      // 오류 정보를 포함한 기본 통계 반환 (폴백 매커니즘)
      const times = lapTimes.map(lap => lap.time).filter(time => typeof time === 'number' && time > 0);
      const fallbackStats = times.length > 0 ? {
        mean: times.reduce((sum, time) => sum + time, 0) / times.length,
        std: Math.sqrt(times.reduce((sum, time) => sum + Math.pow(time - (times.reduce((s, t) => s + t, 0) / times.length), 2), 0) / Math.max(1, times.length - 1))
      } : { mean: 0, std: 0 };
      
      return {
        grr: 0,
        repeatability: fallbackStats.std,
        reproducibility: 0,
        partVariation: 0,
        totalVariation: fallbackStats.std,
        status: 'error' as const,
        cv: fallbackStats.mean > 0 ? (fallbackStats.std / fallbackStats.mean) * 100 : 0,
        q99: fallbackStats.mean + 2.576 * fallbackStats.std,
        isReliableForStandard: false,
        varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: fallbackStats.std * fallbackStats.std, total: fallbackStats.std * fallbackStats.std },
        dataQuality: {
          originalCount: lapTimes.length,
          validCount: times.length,
          outliersDetected: 0,
          isNormalDistribution: false,
          normalityTest: null,
          outlierMethod: 'IQR',
          preprocessingApplied: false
        }
      };
    }
  }, [lapTimes.length, lapTimes[lapTimes.length - 1]?.time, lapTimes[lapTimes.length - 1]?.operator, lapTimes[lapTimes.length - 1]?.target, calculator]);

  // 🔧 동기화된 통계 업데이트 - 원자적 상태 변경
  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    try {
      // 🔧 단일 분석으로 모든 지표 동시 계산 (동기화 보장)
      if (allLaps.length >= 6) {
        const analysis = AnalysisService.calculateGageRR(allLaps);
        // 원자적 상태 업데이트
        setIccValue(analysis.icc);
      }

      // ΔPair 계산 (최적화: 마지막 2개만 계산)
      if (allLaps.length >= 2) {
        const lastTwo = allLaps.slice(-2);
        const deltaPair = Math.abs(lastTwo[1].time - lastTwo[0].time);
        setDeltaPairValue(deltaPair);

        // 임계값 비교 최적화 - 물류작업 특성 반영
        const workTimeMean = allLaps.reduce((sum, lap) => sum + lap.time, 0) / allLaps.length;
        const threshold = workTimeMean * LOGISTICS_WORK_THRESHOLDS.DELTA_PAIR_THRESHOLD;

        // 연속 측정값 차이가 15% 초과 시 재측정 권고
        if (deltaPair > threshold && allLaps.length > 2) {
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