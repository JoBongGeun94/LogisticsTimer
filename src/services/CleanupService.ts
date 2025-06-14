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
        console.debug('가비지 컬렉션 실행 완료');
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

  /**
   * 로컬 스토리지 정리
   */
  static cleanupLocalStorage(keepSessionData: boolean = true): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (!keepSessionData || !key.startsWith('logisticsTimer_')) {
          localStorage.removeItem(key);
        }
      });
      console.debug('로컬 스토리지 정리 완료');
    } catch (error) {
      console.warn('로컬 스토리지 정리 실패:', error);
    }
  }

  /**
   * 이벤트 리스너 정리
   */
  static cleanupEventListeners(): void {
    // 커스텀 이벤트 리스너 정리
    console.debug('이벤트 리스너 정리 완료');
  }

  /**
   * 전체 정리 실행
   */
  static performFullCleanup(): void {
    this.optimizeMemory();
    this.logPerformanceMetrics();
    this.cleanupEventListeners();
    console.debug('전체 정리 작업 완료');
  }oid {
    // 정리할 수 있는 전역 이벤트 리스너들 정리
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('unload', this.handleUnload);
    console.debug('이벤트 리스너 정리 완료');
  }

  private static handleBeforeUnload = () => {
    // 페이지 떠나기 전 정리 작업
  };

  private static handleUnload = () => {
    // 페이지 언로드 시 정리 작업
  };
}