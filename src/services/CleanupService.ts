
/**
 * 코드 정리 및 최적화 서비스 (Single Responsibility Principle)
 */
export class CleanupService {
  /**
   * 로컬 스토리지 정리
   */
  static clearExpiredData(): void {
    const keys = Object.keys(localStorage);
    const expiredKeys = keys.filter(key => 
      key.startsWith('temp_') || key.includes('_expired_')
    );
    
    expiredKeys.forEach(key => localStorage.removeItem(key));
  }

  /**
   * 메모리 정리
   */
  static forceGarbageCollection(): void {
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * 콘솔 정리
   */
  static clearConsole(): void {
    console.clear();
  }

  /**
   * 종합 정리 실행
   */
  static performCleanup(): void {
    this.clearExpiredData();
    this.forceGarbageCollection();
    this.clearConsole();
    console.log('🧹 시스템 정리 완료');
  }
}
