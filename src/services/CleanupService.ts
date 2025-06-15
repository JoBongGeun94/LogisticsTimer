
/**
 * 메모리 및 성능 최적화 서비스 (Single Responsibility Principle)
 */
export class CleanupService {
  private static eventListeners: Map<string, EventListener> = new Map();
  private static intervals: Set<NodeJS.Timeout> = new Set();
  private static timeouts: Set<NodeJS.Timeout> = new Set();
  private static observers: Set<MutationObserver | IntersectionObserver | ResizeObserver> = new Set();

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

    // 메모리 압축 시도
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      if (memInfo.usedJSHeapSize > memInfo.totalJSHeapSize * 0.8) {
        console.warn('메모리 사용량이 높습니다. 정리를 권장합니다.');
        this.performFullCleanup();
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
        limit: `${Math.round(jsHeapSizeLimit / 1024 / 1024)} MB`,
        usage: `${Math.round((usedJSHeapSize / totalJSHeapSize) * 100)}%`
      });
    }

    // 성능 타이밍 정보
    if (performance.timing) {
      const timing = performance.timing;
      console.debug('페이지 성능:', {
        loadTime: `${timing.loadEventEnd - timing.navigationStart}ms`,
        domReady: `${timing.domContentLoadedEventEnd - timing.navigationStart}ms`,
        renderTime: `${timing.loadEventEnd - timing.domLoading}ms`
      });
    }

    // 활성 리소스 카운트
    console.debug('활성 리소스:', {
      eventListeners: this.eventListeners.size,
      intervals: this.intervals.size,
      timeouts: this.timeouts.size,
      observers: this.observers.size
    });
  }

  /**
   * 로컬 스토리지 정리
   */
  static cleanupLocalStorage(keepSessionData: boolean = true): void {
    try {
      const keys = Object.keys(localStorage);
      let removedCount = 0;
      
      keys.forEach(key => {
        if (!keepSessionData || !key.startsWith('logisticsTimer_')) {
          localStorage.removeItem(key);
          removedCount++;
        }
      });
      
      console.debug(`로컬 스토리지 정리 완료: ${removedCount}개 항목 제거`);
    } catch (error) {
      console.warn('로컬 스토리지 정리 실패:', error);
    }
  }

  /**
   * 이벤트 리스너 정리 (완전 구현)
   */
  static cleanupEventListeners(): void {
    try {
      // 등록된 모든 이벤트 리스너 제거
      this.eventListeners.forEach((listener, eventKey) => {
        const [eventType, target] = eventKey.split('::');
        const targetElement = target === 'window' ? window : 
                             target === 'document' ? document : 
                             document.querySelector(target);
        
        if (targetElement) {
          targetElement.removeEventListener(eventType, listener);
        }
      });
      
      const removedListeners = this.eventListeners.size;
      this.eventListeners.clear();
      
      // 기본 애플리케이션 이벤트 리스너 제거
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      window.removeEventListener('unload', this.handleUnload);
      window.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('popstate', this.handlePopState);
      
      // 키보드 이벤트 리스너 정리
      document.removeEventListener('keydown', this.handleKeyDown);
      document.removeEventListener('keyup', this.handleKeyUp);
      
      // 터치/마우스 이벤트 정리
      document.removeEventListener('mousedown', this.handleMouseDown);
      document.removeEventListener('mouseup', this.handleMouseUp);
      document.removeEventListener('touchstart', this.handleTouchStart);
      document.removeEventListener('touchend', this.handleTouchEnd);
      
      console.debug(`이벤트 리스너 정리 완료: ${removedListeners}개 제거`);
    } catch (error) {
      console.warn('이벤트 리스너 정리 실패:', error);
    }
  }

  /**
   * 타이머 정리 (Intervals, Timeouts)
   */
  static cleanupTimers(): void {
    try {
      // Intervals 정리
      this.intervals.forEach(interval => {
        clearInterval(interval);
      });
      const clearedIntervals = this.intervals.size;
      this.intervals.clear();
      
      // Timeouts 정리
      this.timeouts.forEach(timeout => {
        clearTimeout(timeout);
      });
      const clearedTimeouts = this.timeouts.size;
      this.timeouts.clear();
      
      console.debug(`타이머 정리 완료: ${clearedIntervals}개 interval, ${clearedTimeouts}개 timeout 제거`);
    } catch (error) {
      console.warn('타이머 정리 실패:', error);
    }
  }

  /**
   * Observer 정리 (Mutation, Intersection, Resize)
   */
  static cleanupObservers(): void {
    try {
      this.observers.forEach(observer => {
        observer.disconnect();
      });
      const clearedObservers = this.observers.size;
      this.observers.clear();
      
      console.debug(`Observer 정리 완료: ${clearedObservers}개 제거`);
    } catch (error) {
      console.warn('Observer 정리 실패:', error);
    }
  }

  /**
   * DOM 정리 (미사용 요소 제거)
   */
  static cleanupDOM(): void {
    try {
      // 숨겨진 모달이나 오버레이 제거
      const hiddenModals = document.querySelectorAll('[style*="display: none"], .hidden');
      hiddenModals.forEach(modal => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      });
      
      // 빈 컨테이너 제거
      const emptyContainers = document.querySelectorAll('div:empty, span:empty');
      emptyContainers.forEach(container => {
        if (container.parentNode && !container.hasAttribute('data-keep')) {
          container.parentNode.removeChild(container);
        }
      });
      
      console.debug('DOM 정리 완료');
    } catch (error) {
      console.warn('DOM 정리 실패:', error);
    }
  }

  /**
   * 이벤트 리스너 등록 추적
   */
  static registerEventListener(
    target: EventTarget | string, 
    eventType: string, 
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    const targetElement = typeof target === 'string' ? 
      (target === 'window' ? window : 
       target === 'document' ? document : 
       document.querySelector(target)) : target;
    
    if (targetElement) {
      const eventKey = `${eventType}::${typeof target === 'string' ? target : 'element'}`;
      this.eventListeners.set(eventKey, listener);
      targetElement.addEventListener(eventType, listener, options);
    }
  }

  /**
   * 타이머 등록 추적
   */
  static registerInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  static registerTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      callback();
      this.timeouts.delete(timeout);
    }, delay);
    this.timeouts.add(timeout);
    return timeout;
  }

  /**
   * Observer 등록 추적
   */
  static registerObserver(observer: MutationObserver | IntersectionObserver | ResizeObserver): void {
    this.observers.add(observer);
  }

  /**
   * 전체 정리 실행
   */
  static performFullCleanup(): void {
    console.debug('전체 정리 작업 시작...');
    
    this.cleanupTimers();
    this.cleanupObservers();
    this.cleanupEventListeners();
    this.cleanupDOM();
    this.optimizeMemory();
    this.logPerformanceMetrics();
    
    console.debug('전체 정리 작업 완료');
  }

  // 이벤트 핸들러들
  private static handleBeforeUnload = (event: BeforeUnloadEvent) => {
    console.debug('페이지 언로드 준비');
    CleanupService.performFullCleanup();
  };

  private static handleUnload = () => {
    console.debug('페이지 언로드');
    CleanupService.performFullCleanup();
  };

  private static handleVisibilityChange = () => {
    if (document.hidden) {
      console.debug('페이지가 숨겨짐 - 메모리 최적화 실행');
      CleanupService.optimizeMemory();
    }
  };

  private static handleOnline = () => {
    console.debug('온라인 상태로 변경');
  };

  private static handleOffline = () => {
    console.debug('오프라인 상태로 변경 - 로컬 데이터 보존');
  };

  private static handleResize = () => {
    // 리사이즈 이벤트에서 불필요한 DOM 정리
    CleanupService.cleanupDOM();
  };

  private static handlePopState = (event: PopStateEvent) => {
    console.debug('히스토리 변경 감지');
  };

  private static handleKeyDown = (event: KeyboardEvent) => {
    // 키보드 이벤트 처리
  };

  private static handleKeyUp = (event: KeyboardEvent) => {
    // 키보드 이벤트 처리
  };

  private static handleMouseDown = (event: MouseEvent) => {
    // 마우스 이벤트 처리
  };

  private static handleMouseUp = (event: MouseEvent) => {
    // 마우스 이벤트 처리
  };

  private static handleTouchStart = (event: TouchEvent) => {
    // 터치 이벤트 처리
  };

  private static handleTouchEnd = (event: TouchEvent) => {
    // 터치 이벤트 처리
  };

  /**
   * 초기화 (애플리케이션 시작 시 호출)
   */
  static initialize(): void {
    // 기본 이벤트 리스너 등록
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('unload', this.handleUnload);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('resize', this.handleResize);
    
    console.debug('CleanupService 초기화 완료');
  }

  /**
   * 종료 (애플리케이션 종료 시 호출)
   */
  static destroy(): void {
    this.performFullCleanup();
    console.debug('CleanupService 종료 완료');
  }
}

// 타입 확장
declare global {
  interface Window {
    gc?: () => void;
  }
  
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}
