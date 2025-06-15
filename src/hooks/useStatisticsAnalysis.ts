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

// 🔧 간단한 해시 함수 (데이터 무결성 검증용)
const simpleHash = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer 변환
  }
  return Math.abs(hash).toString(36);
};

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

  // 🔧 통합 데이터 동기화 시스템 - 실시간과 상세분석 완전 동기화
  const gaugeData = useMemo((): GaugeData => {
    // 🔧 유효한 측정값 필터링 (null, undefined, 0 이하 값 제거)
    const validLapTimes = lapTimes.filter(lap => 
      lap && 
      typeof lap.time === 'number' && 
      lap.time > 0 && 
      lap.operator && 
      lap.target
    );

    // 측정자 및 대상자 변경 감지
    const currentOperator = validLapTimes.length > 0 ? validLapTimes[validLapTimes.length - 1]?.operator : '';
    const currentTarget = validLapTimes.length > 0 ? validLapTimes[validLapTimes.length - 1]?.target : '';

    // 측정자 또는 대상자 변경 감지
    const operatorChanged = currentOperator && currentOperator !== currentOperatorRef.current;
    const targetChanged = currentTarget && currentTarget !== currentTargetRef.current;

    if (operatorChanged || targetChanged) {
      // 🔧 StorageService를 통한 전역 캐시 무효화
      StorageService.invalidateCache();

      analysisCache.current = { dataHash: '', result: {
        grr: 0, repeatability: 0, reproducibility: 0, partVariation: 0, 
        totalVariation: 0, status: 'info', cv: 0, q99: 0, 
        isReliableForStandard: false, 
        varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
        dataQuality: {
          originalCount: 0, validCount: 0, outliersDetected: 0,
          isNormalDistribution: true, normalityTest: null,
          outlierMethod: 'IQR', preprocessingApplied: false
        }
      } as GaugeData };

      if (operatorChanged) {
        currentOperatorRef.current = currentOperator;
        console.log(`🔄 측정자 변경 감지: ${currentOperatorRef.current} → 전역 캐시 초기화`);
      }

      if (targetChanged) {
        currentTargetRef.current = currentTarget;
        console.log(`🎯 대상자 변경 감지: ${currentTargetRef.current} → 전역 캐시 초기화`);
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

    // 🔧 완전한 데이터 해시 계산 - 모든 변경사항 감지
    const latestLap = validLapTimes[validLapTimes.length - 1];
    const uniqueOperators = [...new Set(validLapTimes.map(lap => lap.operator))].sort().join(',');
    const uniqueTargets = [...new Set(validLapTimes.map(lap => lap.target))].sort().join(',');

    // 🔧 정교한 해시 계산 - 순서와 내용 모두 반영
    const dataElements = validLapTimes.map(lap => 
      `${lap.time}_${lap.operator}_${lap.target}_${lap.timestamp}`
    ).join('|');

    const timestamp = latestLap ? new Date(latestLap.timestamp).getTime() : 0;
    const structuralInfo = `${validLapTimes.length}-${uniqueOperators}-${uniqueTargets}`;
    const contentHash = this.simpleHash(dataElements);
    const dataHash = `${structuralInfo}-${contentHash}-${timestamp}`;

    // 🔧 캐시 검증 및 동기화 상태 확인
    if (analysisCache.current.dataHash === dataHash) {
      console.log(`📋 캐시 히트: ${dataHash.substring(0, 20)}...`);
      return analysisCache.current.result;
    }

    console.log(`🔄 캐시 미스: ${analysisCache.current.dataHash.substring(0, 20)}... → ${dataHash.substring(0, 20)}...`);

    try {
      // 🔧 통합 분석 실행 - 실시간과 상세분석 완전 동기화
      const analysisStartTime = performance.now();

      // 🔧 동일한 AnalysisService 메서드 사용으로 완전 동기화 보장
      const analysis = AnalysisService.calculateGageRR(validLapTimes);
      const analysisEndTime = performance.now();

      console.log(`📊 통합분석 완료: ${(analysisEndTime - analysisStartTime).toFixed(1)}ms`);

      // 🔧 원자적 결과 생성 - 모든 속성을 트랜잭션으로 처리
      const atomicResult: GaugeData = Object.freeze({
        grr: Math.min(100, Math.max(0, analysis.gageRRPercent || 0)),
        repeatability: analysis.repeatability || 0,
        reproducibility: analysis.reproducibility || 0,
        partVariation: analysis.partVariation || 0,
        totalVariation: analysis.totalVariation || 0,
        status: calculator.statusFromGRR(analysis.gageRRPercent || 0),
        cv: Math.max(0, analysis.cv || 0),
        q99: Math.max(0, analysis.q99 || 0),
        isReliableForStandard: analysis.isReliableForStandard || false,
        varianceComponents: Object.freeze({
          part: analysis.varianceComponents?.part || 0,
          operator: analysis.varianceComponents?.operator || 0,
          interaction: analysis.varianceComponents?.interaction || 0,
          equipment: analysis.varianceComponents?.equipment || 0,
          total: analysis.varianceComponents?.total || 0
        }),
        dataQuality: Object.freeze({
          originalCount: analysis.dataQuality?.originalCount || lapTimes.length,
          validCount: analysis.dataQuality?.validCount || validLapTimes.length,
          outliersDetected: analysis.dataQuality?.outliersDetected || 0,
          isNormalDistribution: analysis.dataQuality?.isNormalDistribution ?? true,
          normalityTest: analysis.dataQuality?.normalityTest || null,
          outlierMethod: analysis.dataQuality?.outlierMethod || 'IQR',
          preprocessingApplied: analysis.dataQuality?.preprocessingApplied || false
        })
      });

      // 🔧 원자적 캐시 업데이트 및 동기화 보장
      const atomicCacheEntry = Object.freeze({ dataHash, result: atomicResult });
      analysisCache.current = atomicCacheEntry;

      // 🔧 전역 캐시에도 동기화 저장
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('analysisCache', JSON.stringify({
            timestamp: Date.now(),
            dataHash,
            result: atomicResult
          }));
        }
      } catch (error) {
        console.warn('전역 캐시 저장 실패:', error);
      }

      console.log(`✅ 동기화 완료: GRR=${atomicResult.grr.toFixed(1)}%, CV=${atomicResult.cv.toFixed(1)}%, ICC=${analysis.icc?.toFixed(3) || 'N/A'}`);

      return atomicResult;
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
  }, [
    // 🔧 정교한 의존성 배열 - 모든 변경사항 감지
    lapTimes.length,
    lapTimes.map(lap => lap.time).join(','),
    lapTimes.map(lap => lap.operator).join(','),
    lapTimes.map(lap => lap.target).join(','),
    lapTimes.map(lap => lap.timestamp).join(','),
    calculator
  ]);

  // 🔧 원자적 상태 업데이트 시스템 - 배치 처리로 동기화 보장
  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    try {
      // 🔧 상태 변경을 배치로 처리하여 원자성 보장
      const batchUpdate = () => {
        let iccUpdate = iccValue;
        let deltaPairUpdate = deltaPairValue;
        let showRetakeUpdate = showRetakeModal;

        // 🔧 ICC 계산 - 단일 분석으로 통합
        if (allLaps.length >= 6) {
          try {
            const analysis = AnalysisService.calculateGageRR(allLaps);
            iccUpdate = analysis.icc || 0;
            console.log(`🔄 ICC 업데이트: ${iccUpdate.toFixed(3)}`);
          } catch (error) {
            console.warn('ICC 계산 실패:', error);
            iccUpdate = 0;
          }
        }

        // 🔧 ΔPair 계산 (최적화: 마지막 2개만 계산)
        if (allLaps.length >= 2) {
          const lastTwo = allLaps.slice(-2);
          deltaPairUpdate = Math.abs(lastTwo[1].time - lastTwo[0].time);

          // 임계값 비교 최적화 - 물류작업 특성 반영
          const workTimeMean = allLaps.reduce((sum, lap) => sum + lap.time, 0) / allLaps.length;
          const threshold = workTimeMean * LOGISTICS_WORK_THRESHOLDS.DELTA_PAIR_THRESHOLD;

          // 연속 측정값 차이가 15% 초과 시 재측정 권고
          if (deltaPairUpdate > threshold && allLaps.length > 2) {
            showRetakeUpdate = true;
            console.log(`🚨 재측정 임계값 초과: ${(deltaPairUpdate/1000).toFixed(1)}초 > ${(threshold/1000).toFixed(1)}초`);
          }
        }

        // 🔧 원자적 상태 업데이트 - 모든 상태를 동시에 변경
        const updatePromises = [];

        if (iccUpdate !== iccValue) {
          updatePromises.push(() => setIccValue(iccUpdate));
        }

        if (deltaPairUpdate !== deltaPairValue) {
          updatePromises.push(() => setDeltaPairValue(deltaPairUpdate));
        }

        if (showRetakeUpdate !== showRetakeModal) {
          updatePromises.push(() => setShowRetakeModal(showRetakeUpdate));
        }

        // 배치 실행
        if (updatePromises.length > 0) {
          updatePromises.forEach(update => update());
          console.log(`✅ 배치 상태 업데이트 완료: ${updatePromises.length}개 상태 동기화`);
        }
      };

      // React의 상태 업데이트 배치 처리 활용
      batchUpdate();

    } catch (error) {
      console.error('🚨 원자적 상태 업데이트 실패:', error);
    }
  }, [iccValue, deltaPairValue, showRetakeModal]);

    // 🔧 재측정 모달 트리거 (강화된 임계값 기반)
  const checkRetakeCriteria = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    if (allLaps.length < 2) return false;

    const currentTime = newLap.time;
    const previousTime = allLaps[allLaps.length - 2].time;
    const timeDifference = Math.abs(currentTime - previousTime);

    // 🔧 세션별 측정 기록 분리
    const sessionId = newLap.sessionId;
    const sessionLaps = allLaps.filter(lap => lap.sessionId === sessionId);
    const sameOperatorLaps = sessionLaps.filter(lap => 
      lap.operator === newLap.operator && lap.target === newLap.target
    );

    // 🔧 다단계 임계값 시스템
    let shouldRetake = false;
    const reasons: string[] = [];

    // 1. 초기 측정 단계 (데이터 부족)
    if (sessionLaps.length < 3) {
      const percentageThreshold = Math.max(currentTime, previousTime) * 0.6; // 60% 차이
      const absoluteThreshold = 45000; // 45초
      const dynamicThreshold = Math.min(percentageThreshold, absoluteThreshold);

      if (timeDifference > dynamicThreshold) {
        shouldRetake = true;
        reasons.push(`초기측정 임계값 초과: ${(timeDifference/1000).toFixed(1)}초 > ${(dynamicThreshold/1000).toFixed(1)}초`);
      }
    } else {
      // 2. 통계적 임계값 (전체 세션 기준)
      const sessionTimes = sessionLaps.map(lap => lap.time);
      const sessionMean = sessionTimes.reduce((sum, time) => sum + time, 0) / sessionTimes.length;
      const sessionVariance = sessionTimes.reduce((sum, time) => sum + Math.pow(time - sessionMean, 2), 0) / (sessionTimes.length - 1);
      const sessionStdDev = Math.sqrt(sessionVariance);

      // 3시그마 규칙 (99.7% 신뢰구간)
      const statisticalThreshold = 3 * sessionStdDev;

      if (timeDifference > statisticalThreshold) {
        shouldRetake = true;
        reasons.push(`통계적 임계값 초과: ${(timeDifference/1000).toFixed(1)}초 > ${(statisticalThreshold/1000).toFixed(1)}초`);
      }

      // 3. 개인별 일관성 검사 (동일 측정자-대상자 조합)
      if (sameOperatorLaps.length >= 2) {
        const personalTimes = sameOperatorLaps.map(lap => lap.time);
        const personalMean = personalTimes.reduce((sum, time) => sum + time, 0) / personalTimes.length;
        const personalVariance = personalTimes.reduce((sum, time) => sum + Math.pow(time - personalMean, 2), 0) / Math.max(personalTimes.length - 1, 1);
        const personalStdDev = Math.sqrt(personalVariance);

        // 개인별 2.5시그마 규칙
        const personalThreshold = 2.5 * personalStdDev;
        const personalDeviation = Math.abs(currentTime - personalMean);

        if (personalDeviation > personalThreshold && personalThreshold > 0) {
          shouldRetake = true;
          reasons.push(`개인 일관성 임계값 초과: ${(personalDeviation/1000).toFixed(1)}초 > ${(personalThreshold/1000).toFixed(1)}초`);
        }
      }

      // 4. 작업유형별 특수 규칙
      const workTypeMultiplier = getWorkTypeMultiplier(newLap.workType);
      const workTypeAdjustedThreshold = statisticalThreshold * workTypeMultiplier;

      if (timeDifference > workTypeAdjustedThreshold && workTypeMultiplier !== 1) {
        shouldRetake = true;
        reasons.push(`작업유형별 임계값 초과: ${newLap.workType} (배수: ${workTypeMultiplier})`);
      }

      // 5. 연속 이상치 감지
      if (sessionLaps.length >= 3) {
        const recentLaps = sessionLaps.slice(-3);
        const recentTimes = recentLaps.map(lap => lap.time);
        const isConsecutiveOutlier = recentTimes.every(time => 
          Math.abs(time - sessionMean) > sessionStdDev * 2
        );

        if (isConsecutiveOutlier) {
          shouldRetake = true;
          reasons.push('연속 이상치 패턴 감지');
        }
      }

      // 6. 극값 감지 (최솟값/최댓값 대비)
      const minTime = Math.min(...sessionTimes);
      const maxTime = Math.max(...sessionTimes);
      const range = maxTime - minTime;

      if (range > 0) {
        const extremeThreshold = range * 0.8; // 전체 범위의 80%
        if (timeDifference > extremeThreshold) {
          shouldRetake = true;
          reasons.push(`극값 범위 초과: ${(timeDifference/1000).toFixed(1)}초 > ${(extremeThreshold/1000).toFixed(1)}초`);
        }
      }
    }

    // 디버깅 정보 출력
    if (shouldRetake) {
      console.warn(`🚨 재측정 권장: ${reasons.join(', ')}`);
      console.debug('측정 상세 정보:', {
        currentTime: (currentTime/1000).toFixed(2) + '초',
        previousTime: (previousTime/1000).toFixed(2) + '초',
        difference: (timeDifference/1000).toFixed(2) + '초',
        sessionCount: sessionLaps.length,
        operator: newLap.operator,
        target: newLap.target,
        workType: newLap.workType
      });
    }

    return shouldRetake;
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