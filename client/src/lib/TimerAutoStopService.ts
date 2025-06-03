/**
 * Single Responsibility Principle (SRP)
 * 타이머 자동 정지 기능만을 담당하는 서비스
 */

export class TimerAutoStopService {
  private static instance: TimerAutoStopService;
  
  private constructor() {}
  
  static getInstance(): TimerAutoStopService {
    if (!TimerAutoStopService.instance) {
      TimerAutoStopService.instance = new TimerAutoStopService();
    }
    return TimerAutoStopService.instance;
  }
  
  /**
   * 측정 기록 후 타이머를 자동으로 정지시키는 메서드
   */
  stopTimerAfterMeasurement(
    stopTimer: () => void,
    isRunning: boolean,
    onSuccess?: () => void
  ): void {
    if (isRunning) {
      stopTimer();
      console.log('Timer auto-stopped after measurement recording');
      onSuccess?.();
    }
  }
  
  /**
   * 타이머 정지 시각적 피드백 제공
   */
  provideVisualFeedback(): void {
    document.body.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    setTimeout(() => {
      document.body.style.background = '';
    }, 200);
  }
}