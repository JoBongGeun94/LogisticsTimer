import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { LapTime } from '../types';
import { AnalysisService } from '../services/AnalysisService';
import { ValidationService } from '../services/ValidationService';
import { WORK_TYPE_THRESHOLDS_MAP } from '../constants/analysis';

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

interface AnalysisCache {
  timestamp: number;
  result: GaugeData;
}

export const useStatisticsAnalysis = (lapTimes: LapTime[]) => {
  const [calculator] = useState<IStatisticsCalculator>(() => new StatisticsCalculator());
  const [iccValue, setIccValue] = useState(0);
  const [deltaPairValue, setDeltaPairValue] = useState(0);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [cache, setCache] = useState<Record<string, AnalysisCache>>({});
  const [lastCalculationTime, setLastCalculationTime] = useState<number>(0);

  // 캐시 정리 함수 (메모리 누수 방지)
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    setCache(prev => {
      const cleaned: Record<string, AnalysisCache> = {};
      Object.entries(prev).forEach(([key, value]) => {
        // 5분 이상 된 캐시는 삭제
        if (now - value.timestamp < 5 * 60 * 1000) {
          cleaned[key] = value;
        }
      });
      return cleaned;
    });
  }, []);

  // 주기적 캐시 정리 (컴포넌트 마운트 시)
  useEffect(() => {
    const cleanup = setInterval(cleanupCache, 60000); // 1분마다 정리
    return () => clearInterval(cleanup);
  }, [cleanupCache]);

  // 캐시 해시 생성 함수 (순환 참조 방지를 위해 독립적으로 정의)
  const generateCacheHash = useCallback((lapTimes: LapTime[]): string => {
      if (!lapTimes || lapTimes.length === 0) return 'empty';

      // 더 정확한 데이터 식별을 위한 복합 해시
      const sortedData = lapTimes
        .map(lap => ({
          op: lap.operator || '',
          tg: lap.target || '',
          tm: Math.round((lap.time || 0) * 1000) / 1000, // 소수점 3자리까지
          ts: lap.timestamp || '',
          id: lap.id || 0
        }))
        .sort((a, b) => {
          // 다중 기준 정렬로 순서 일관성 보장
          if (a.op !== b.op) return a.op.localeCompare(b.op);
          if (a.tg !== b.tg) return a.tg.localeCompare(b.tg);
          if (a.tm !== b.tm) return a.tm - b.tm;
          return a.id - b.id;
        });

      const dataStr = JSON.stringify(sortedData);

      // FNV-1a 해시 알고리즘 (충돌 확률 낮음)
      let hash = 2166136261;
      for (let i = 0; i < dataStr.length; i++) {
        hash ^= dataStr.charCodeAt(i);
        hash = (hash * 16777619) >>> 0; // 32비트 unsigned
      }

      return `${hash}_${lapTimes.length}_${Date.now() % 10000}`;
  }, []);

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
    const dataHash = generateCacheHash(lapTimes);
    const cachedAnalysis = cache[dataHash];

    if (cachedAnalysis && Date.now() - cachedAnalysis.timestamp < 30000) {
      return cachedAnalysis.result;
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
      setCache(prevCache => ({
        ...prevCache,
        [dataHash]: { timestamp: Date.now(), result }
      }));
      setLastCalculationTime(Date.now());

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
  }, [lapTimes, generateCacheHash, cache, calculator]);

    // 동적 임계값 계산 함수 (순환 참조 방지를 위해 로컬 정의)
    const getDynamicThresholdLocal = useCallback((workType: string, baseCV: number, measurementCount: number) => {
      const defaultThreshold = { icc: 0.8, cv: 15 };
      const typeThreshold = WORK_TYPE_THRESHOLDS_MAP[workType] || WORK_TYPE_THRESHOLDS_MAP['기타'] || defaultThreshold;

      // 측정 수량에 따른 동적 조정
      const adjustmentFactor = Math.max(0.8, Math.min(1.2, measurementCount / 30));

      return {
        icc: (typeThreshold.icc || 0.8) * adjustmentFactor,
        cv: (typeThreshold.cv || 15) * adjustmentFactor
      };
    }, []);

  // 통계 업데이트 - AnalysisService 기반으로 통합
  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    let deltaPairValue = 0;
    let needsRemeasurement = false;

    try {
      // ICC 재계산 - AnalysisService 활용
      if (allLaps.length >= 6) {
        const analysis = AnalysisService.calculateGageRR(allLaps);
        setIccValue(analysis.icc);
      }

      // 데이터 그룹화 (partKey -> operatorKey -> measurements[])
      const groupedData = new Map<string, Map<string, number[]>>();
      allLaps.forEach(lap => {
        const partKey = `${lap.target}-${lap.taskType}`;
        const operatorKey = lap.operator;

        if (!groupedData.has(partKey)) {
          groupedData.set(partKey, new Map<string, number[]>());
        }

        const operatorMap = groupedData.get(partKey)!;
        if (!operatorMap.has(operatorKey)) {
          operatorMap.set(operatorKey, []);
        }

        operatorMap.get(operatorKey)!.push(lap.time);
      });

      // ΔPair 계산 개선 (측정자간 평균 차이 - 정확한 공식)
      const operatorGlobalMeans = new Map<string, { sum: number, count: number }>();

      // 각 측정자의 전체 측정값 수집
      for (const [partKey, operatorMap] of groupedData) {
        for (const [operatorKey, measurements] of operatorMap) {
          if (!operatorGlobalMeans.has(operatorKey)) {
            operatorGlobalMeans.set(operatorKey, { sum: number, count: number });
          }
          const opData = operatorGlobalMeans.get(operatorKey)!;
          measurements.forEach(measurement => {
            opData.sum += measurement;
            opData.count += 1;
          });
        }
      }

      // 측정자별 전체 평균 계산
      const operatorMeans = Array.from(operatorGlobalMeans.entries()).map(([operator, data]) => ({
        operator,
        mean: data.count > 0 ? data.sum / data.count : 0
      }));

      if (operatorMeans.length >= 2) {
        // 가장 많이 측정한 두 측정자 선택
        const sortedOperators = operatorMeans
          .map(op => ({
            ...op,
            count: operatorGlobalMeans.get(op.operator)?.count || 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 2);

        if (sortedOperators.length === 2) {
          const deltaPair = Math.abs(sortedOperators[0].mean - sortedOperators[1].mean) / 1000; // 초 단위

          deltaPairValue = deltaPair;

          // 작업 유형별 임계값 적용
          const threshold = LOGISTICS_WORK_THRESHOLDS.DELTA_PAIR_THRESHOLD;
          needsRemeasurement = deltaPair > threshold;
        }
      }
    } catch (error) {
      console.warn('통계 업데이트 오류:', error);
    }

    setDeltaPairValue(deltaPairValue);
    setShowRetakeModal(needsRemeasurement);
  }, [getDynamicThresholdLocal]);

  // 상태 계산 최적화 - 순환 참조 방지
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