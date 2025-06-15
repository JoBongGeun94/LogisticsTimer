/**
 * 메모리 및 리소스 정리 서비스 (Single Responsibility Principle)
 */
export class CleanupService {
  private static instance: CleanupService;
  private cleanupTasks: Map<string, () => void> = new Map();
  private intervalCleanups: Set<NodeJS.Timeout> = new Set();
  private eventListenerCleanups: Set<() => void> = new Set();

  private constructor() {
    // 페이지 언로드 시 자동 정리
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.executeCleanup());
    }
  }

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  /**
   * 정리 작업 등록 (이름으로 관리)
   */
  registerCleanupTask(name: string, task: () => void): void {
    this.cleanupTasks.set(name, task);
    console.log(`정리 작업 등록됨: ${name}. 총 ${this.cleanupTasks.size}개 작업`);
  }

  /**
   * 인터벌 정리 등록
   */
  registerIntervalCleanup(interval: NodeJS.Timeout): void {
    this.intervalCleanups.add(interval);
  }

  /**
   * 이벤트 리스너 정리 등록
   */
  registerEventListenerCleanup(cleanup: () => void): void {
    this.eventListenerCleanups.add(cleanup);
  }

  /**
   * 모든 정리 작업 실행
   */
  executeCleanup(): void {
    console.log(`${this.cleanupTasks.size}개의 정리 작업 실행 중...`);

    // 등록된 정리 작업 실행
    this.cleanupTasks.forEach((task, name) => {
      try {
        task();
        console.log(`정리 작업 완료: ${name}`);
      } catch (error) {
        console.error(`정리 작업 실패 (${name}):`, error);
      }
    });

    // 인터벌 정리
    this.intervalCleanups.forEach(interval => {
      try {
        clearInterval(interval);
      } catch (error) {
        console.error('인터벌 정리 실패:', error);
      }
    });

    // 이벤트 리스너 정리
    this.eventListenerCleanups.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('이벤트 리스너 정리 실패:', error);
      }
    });

    // 모든 작업 초기화
    this.cleanupTasks.clear();
    this.intervalCleanups.clear();
    this.eventListenerCleanups.clear();

    console.log('모든 정리 작업 완료');
  }

  /**
   * 특정 정리 작업 제거
   */
  removeCleanupTask(name: string): boolean {
    const removed = this.cleanupTasks.delete(name);
    if (removed) {
      console.log(`정리 작업 제거됨: ${name}. 남은 작업: ${this.cleanupTasks.size}개`);
    }
    return removed;
  }

  /**
   * 정리 작업 개수 반환
   */
  getTaskCount(): number {
    return this.cleanupTasks.size + this.intervalCleanups.size + this.eventListenerCleanups.size;
  }

  /**
   * 메모리 사용량 체크 및 정리 (브라우저 환경에서만)
   */
  checkMemoryAndCleanup(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);

      // 메모리 사용률이 80% 초과 시 정리 실행
      if (usedMB / limitMB > 0.8) {
        console.warn(`메모리 사용률 높음: ${(usedMB/limitMB*100).toFixed(1)}% - 정리 실행`);
        this.executeCleanup();

        // 가비지 컬렉션 요청 (가능한 경우)
        if ('gc' in window) {
          (window as any).gc();
        }
      }
    }
  }
}