import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  q95: number;
  q99: number;
  q999: number;
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

  // 세션 변경 이벤트 리스너 (즉시 캐시 무효화) - 메모리 누수 방지 강화
  useEffect(() => {
    const handleSessionChange = (event: CustomEvent) => {
      console.log('🔄 세션 변경 이벤트 수신:', event.detail);
      
      // 캐시 즉시 초기화
      analysisCache.current = { 
        dataHash: '', 
        result: {
          grr: 0, repeatability: 0, reproducibility: 0, partVariation: 0, 
          totalVariation: 0, status: 'info', cv: 0, q95: 0, q99: 0, q999: 0,
          isReliableForStandard: false, 
          varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
          dataQuality: {
            originalCount: 0, validCount: 0, outliersDetected: 0,
            isNormalDistribution: true, normalityTest: null,
            outlierMethod: 'IQR', preprocessingApplied: false
          }
        } as GaugeData 
      };
      
      // 상태 초기화 (React 18+ 배치 업데이트 활용)
      setIccValue(0);
      setDeltaPairValue(0);
      setShowRetakeModal(false);
    };

    const handleBeforeUnload = () => {
      // 컴포넌트 언마운트 전 모든 타이머와 리스너 정리
      window.removeEventListener('sessionChanged', handleSessionChange as EventListener);
    };

    // 이벤트 리스너 등록
    window.addEventListener('sessionChanged', handleSessionChange as EventListener);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 정리 (완전한 정리)
    return () => {
      window.removeEventListener('sessionChanged', handleSessionChange as EventListener);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // 캐시 정리
      analysisCache.current = { 
        dataHash: '', 
        result: {
          grr: 0, repeatability: 0, reproducibility: 0, partVariation: 0, 
          totalVariation: 0, status: 'info', cv: 0, q95: 0, q99: 0, q999: 0,
          isReliableForStandard: false, 
          varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
          dataQuality: {
            originalCount: 0, validCount: 0, outliersDetected: 0,
            isNormalDistribution: true, normalityTest: null,
            outlierMethod: 'IQR', preprocessingApplied: false
          }
        } as GaugeData 
      };
    };
  }, []);

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
  const currentSessionRef = useRef<string>('');
  
  // 게이지 데이터 계산 - 실시간 업데이트 최적화 및 캐싱 개선
  const gaugeData = useMemo((): GaugeData => {
    // 컨텍스트 변경 감지 (세션, 측정자, 대상자)
    const currentOperator = lapTimes.length > 0 ? lapTimes[lapTimes.length - 1]?.operator : '';
    const currentTarget = lapTimes.length > 0 ? lapTimes[lapTimes.length - 1]?.target : '';
    const currentSession = lapTimes.length > 0 ? lapTimes[lapTimes.length - 1]?.sessionId : '';
    
    // 즉시 캐시 무효화 조건 (성능 최적화)
    const contextChanged = (
      (currentSession && currentSession !== currentSessionRef.current) ||
      (currentOperator && currentOperator !== currentOperatorRef.current) ||
      (currentTarget && currentTarget !== currentTargetRef.current)
    );
    
    // 컨텍스트 변경 시 즉시 캐시 초기화 (지연 없음)
    if (contextChanged) {
      // 참조값 즉시 업데이트
      currentSessionRef.current = currentSession;
      currentOperatorRef.current = currentOperator;
      currentTargetRef.current = currentTarget;
      
      // 캐시 강제 초기화
      analysisCache.current = { 
        dataHash: '', 
        result: {
          grr: 0, repeatability: 0, reproducibility: 0, partVariation: 0, 
          totalVariation: 0, status: 'info', cv: 0, q99: 0, 
          isReliableForStandard: false, 
          varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
          dataQuality: {
            originalCount: 0, validCount: 0, outliersDetected: 0,
            isNormalDistribution: true, normalityTest: null,
            outlierMethod: 'IQR', preprocessingApplied: false
          }
        } as GaugeData 
      };
      
      console.log(`🔄 컨텍스트 변경 감지 → 즉시 캐시 무효화 (세션: ${currentSession}, 측정자: ${currentOperator}, 대상자: ${currentTarget})`);
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

    // 실시간 해시 기반 캐싱 (변동계수 즉시 업데이트 보장) - 메모리 효율성 개선
    const latestLap = lapTimes[lapTimes.length - 1];
    const uniqueOperators = [...new Set(lapTimes.map(lap => lap.operator))].sort().join(',');
    const uniqueTargets = [...new Set(lapTimes.map(lap => lap.target))].sort().join(',');
    const uniqueSessions = [...new Set(lapTimes.map(lap => lap.sessionId))].sort().join(',');
    
    // 해시 생성 최적화 (중복 계산 방지)
    const coreDataHash = `${lapTimes.length}-${uniqueOperators}-${uniqueTargets}-${uniqueSessions}`;
    const latestDataHash = latestLap ? `${latestLap.time}-${latestLap.operator}-${latestLap.target}-${latestLap.sessionId}` : '';
    const dataHash = `${coreDataHash}-${latestDataHash}-${contextChanged ? Date.now() : ''}`;

    // 컨텍스트 변경 시 캐시 무시하고 즉시 재계산
    if (!contextChanged && analysisCache.current.dataHash === dataHash) {
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
        varianceComponents: analysis.varianceComponents,
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

      // 캐시 업데이트
      analysisCache.current = { dataHash, result };

      return result;
    } catch (error) {
      console.error('실시간 Gauge 데이터 계산 오류:', error);
      
      // 구체적인 오류 메시지 제공
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.warn(`📊 분석 실패 원인: ${errorMessage}`);
      
      // 안전한 폴백 통계 계산 (에러 상황에서도 기본 정보 제공)
      const validTimes = lapTimes
        .filter(lap => lap && typeof lap.time === 'number' && lap.time > 0)
        .map(lap => lap.time);
      
      if (validTimes.length === 0) {
        console.warn('📊 유효한 측정 데이터가 없습니다.');
        return {
          grr: 0, repeatability: 0, reproducibility: 0, partVariation: 0, 
          totalVariation: 0, status: 'error' as const, cv: 0, q95: 0, q99: 0, q999: 0,
          isReliableForStandard: false, 
          varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: 0, total: 0 },
          dataQuality: {
            originalCount: lapTimes.length, validCount: 0, outliersDetected: 0,
            isNormalDistribution: false, normalityTest: null,
            outlierMethod: 'IQR', preprocessingApplied: false
          }
        };
      }
      
      const mean = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
      const variance = validTimes.length > 1 ? 
        validTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / (validTimes.length - 1) : 0;
      const std = Math.sqrt(variance);
      const fallbackStats = { mean, std, variance };
      
      return {
        grr: 0,
        repeatability: fallbackStats.std,
        reproducibility: 0,
        partVariation: 0,
        totalVariation: fallbackStats.std,
        status: 'error' as const,
        cv: fallbackStats.mean > 0 ? (fallbackStats.std / fallbackStats.mean) * 100 : 0,
        q95: fallbackStats.mean + 1.645 * fallbackStats.std,
        q99: fallbackStats.mean + 2.576 * fallbackStats.std,
        q999: fallbackStats.mean + 3.291 * fallbackStats.std,
        isReliableForStandard: false,
        varianceComponents: { part: 0, operator: 0, interaction: 0, equipment: fallbackStats.variance, total: fallbackStats.variance },
        dataQuality: {
          originalCount: lapTimes.length,
          validCount: validTimes.length,
          outliersDetected: 0,
          isNormalDistribution: false,
          normalityTest: null,
          outlierMethod: 'IQR',
          preprocessingApplied: false
        }
      };
    }
  }, [
    lapTimes.length, 
    lapTimes[lapTimes.length - 1]?.time, 
    lapTimes[lapTimes.length - 1]?.operator, 
    lapTimes[lapTimes.length - 1]?.target,
    lapTimes[lapTimes.length - 1]?.sessionId,
    calculator
  ]);

  // 통계 업데이트 - 동기화 문제 해결 및 React 배치 업데이트 최적화
  const updateStatistics = useCallback((newLap: LapTime, allLaps: LapTime[]) => {
    try {
      // React 상태 배치 업데이트를 위한 동기화 처리
      const updateBatch = () => {
        // ICC 재계산 - AnalysisService 활용 (6개 이상일 때)
        if (allLaps.length >= 6) {
          const analysis = AnalysisService.calculateGageRR(allLaps);
          setIccValue(prevIcc => {
            console.log(`📊 ICC 업데이트: ${prevIcc.toFixed(3)} → ${analysis.icc.toFixed(3)}`);
            return analysis.icc;
          });
        } else if (allLaps.length >= 3) {
          // 3개 이상일 때 기본 ICC 계산
          setIccValue(0.5); // 기본값
        }

        // ΔPair 계산 - 즉시 반영 (마지막 2개 측정값)
        if (allLaps.length >= 2) {
          const lastTwo = allLaps.slice(-2);
          const deltaPair = Math.abs(lastTwo[1].time - lastTwo[0].time);
          
          setDeltaPairValue(prevDelta => {
            console.log(`📈 ΔPair 업데이트: ${prevDelta.toFixed(3)}s → ${deltaPair.toFixed(3)}s`);
            return deltaPair;
          });

          // 임계값 비교 최적화 - 물류작업 특성 반영
          const workTimeMean = allLaps.reduce((sum, lap) => sum + lap.time, 0) / allLaps.length;
          const threshold = workTimeMean * LOGISTICS_WORK_THRESHOLDS.DELTA_PAIR_THRESHOLD;

          // 연속 측정값 차이가 15% 초과 시 재측정 권고
          if (deltaPair > threshold && allLaps.length > 2) {
            console.log(`⚠️ ΔPair 임계값 초과: ${deltaPair.toFixed(3)}s > ${threshold.toFixed(3)}s`);
            setShowRetakeModal(true);
          }
        } else {
          setDeltaPairValue(0);
        }
      };

      // React 18+ 자동 배치 업데이트 활용
      updateBatch();
    } catch (error) {
      console.warn('📊 통계 업데이트 오류:', error);
      // 오류 시에도 기본값 설정
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