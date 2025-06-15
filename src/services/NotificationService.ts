export class NotificationService {
  private static instance: NotificationService;
  private callbacks: ((notification: { message: string; type: 'success' | 'error' | 'warning' | 'info' }) => void)[] = [];

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  subscribe(callback: (notification: { message: string; type: 'success' | 'error' | 'warning' | 'info' }) => void): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.callbacks.forEach(callback => {
      try {
        callback({ message, type });
      } catch (error) {
        console.error('NotificationService callback error:', error);
      }
    });
  }

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.notify(message, type);
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

// Singleton 인스턴스를 기본 export로 제공
export default NotificationService.getInstance();
