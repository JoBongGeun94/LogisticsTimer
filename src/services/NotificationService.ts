export class NotificationService {
  private static instance: NotificationService;
  private callbacks: ((message: string, type: string) => void)[] = [];

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

  private notify(message: string, type: string): void {
    this.callbacks.forEach(callback => callback(message, type));
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
