export class NotificationService {
  private static instance: NotificationService;
  private callbacks: ((message: string, type: string) => void)[] = [];
  private messageQueue: Array<{ message: string; type: string; timestamp: number }> = [];
  private isProcessing = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  subscribe(callback: (message: string, type: string) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const now = Date.now();
      // 중복 메시지 제거 (1초 이내 동일 메시지)
      const uniqueMessages = this.messageQueue.filter((msg, index, arr) => {
        return !arr.some((other, otherIndex) => 
          otherIndex < index && 
          other.message === msg.message && 
          other.type === msg.type && 
          now - other.timestamp < 1000
        );
      });

      if (uniqueMessages.length > 0) {
        const { message, type } = uniqueMessages[0];
        this.callbacks.forEach(callback => {
          try {
            callback(message, type);
          } catch (error) {
            console.warn('Toast callback error:', error);
          }
        });
      }

      this.messageQueue = [];
    } catch (error) {
      console.error('Toast processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private notify(message: string, type: string): void {
    this.messageQueue.push({ message, type, timestamp: Date.now() });
    
    // 즉시 처리하되 다음 틱에서 실행
    setTimeout(() => this.processQueue(), 0);
  }

  success(message: string): void {
    this.notify(message, 'success');
  }

  error(message: string): void {
    this.notify(message, 'error');
  }

  warning(message: string): void {
    this.notify(message, 'warning');
  }

  info(message: string): void {
    this.notify(message, 'info');
  }
}
