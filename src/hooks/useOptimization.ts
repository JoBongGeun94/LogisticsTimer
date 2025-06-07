import { useCallback, useRef } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderDuration: number;
  averageRenderDuration: number;
}

export const useOptimization = () => {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  const startMeasurement = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const endMeasurement = useCallback(() => {
    const duration = performance.now() - startTimeRef.current;
    renderCountRef.current += 1;
    renderTimesRef.current.push(duration);
    
    // 최근 10개 렌더링 시간만 유지
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current.shift();
    }
  }, []);

  const getMetrics = useCallback((): PerformanceMetrics => {
    const times = renderTimesRef.current;
    const averageRenderDuration = times.length > 0 
      ? times.reduce((sum, time) => sum + time, 0) / times.length 
      : 0;

    return {
      renderCount: renderCountRef.current,
      lastRenderDuration: times[times.length - 1] || 0,
      averageRenderDuration
    };
  }, []);

  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    renderTimesRef.current = [];
  }, []);

  return {
    startMeasurement,
    endMeasurement,
    getMetrics,
    resetMetrics
  };
};
