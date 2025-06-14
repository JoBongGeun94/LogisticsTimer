/**
 * 메모리 및 성능 최적화 서비스 (Single Responsibility Principle)
 */
export class CleanupService {
  /**
   * 브라우저 메모리 최적화
   */
  static optimizeMemory(): void {
    // 가비지 컬렉션 힌트 (브라우저 지원 시)
    if (window.gc) {
      try {
        window.gc();
      } catch (error) {
        console.debug('가비지 컬렉션 실행 불가');
      }
    }
  }

  /**
   * 성능 정보 로깅
   */
  static logPerformanceMetrics(): void {
    if (performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
      console.debug('메모리 사용량:', {
        used: `${Math.round(usedJSHeapSize / 1024 / 1024)} MB`,
        total: `${Math.round(totalJSHeapSize / 1024 / 1024)} MB`,
        limit: `${Math.round(jsHeapSizeLimit / 1024 / 1024)} MB`
      });
    }
  }
}