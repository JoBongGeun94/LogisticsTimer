// Production error tracking and monitoring
export interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  context?: Record<string, any>;
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private readonly maxErrors = 100;

  // Initialize error tracking
  init(userId?: string) {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        userId,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        userId,
        context: {
          type: 'unhandledrejection',
          reason: event.reason
        }
      });
    });

    // Console error interceptor
    const originalError = console.error;
    console.error = (...args) => {
      this.captureError({
        message: args.join(' '),
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        userId,
        context: {
          type: 'console.error',
          args
        }
      });
      originalError.apply(console, args);
    };
  }

  // Capture custom errors
  captureError(errorReport: ErrorReport) {
    this.errors.push(errorReport);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log critical errors immediately
    if (this.isCriticalError(errorReport)) {
      console.error('Critical Error:', errorReport);
      this.reportToServer(errorReport);
    }
  }

  // Check if error is critical
  private isCriticalError(error: ErrorReport): boolean {
    const criticalPatterns = [
      'network error',
      'database',
      'authentication',
      'security',
      'payment'
    ];
    
    return criticalPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }

  // Report error to server
  private async reportToServer(error: ErrorReport) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error),
        credentials: 'include'
      });
    } catch (e) {
      // Silent fail - don't create error loops
    }
  }

  // Get error summary for dashboard
  getErrorSummary() {
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = this.errors.filter(e => e.timestamp > last24h);
    
    const errorCounts: { [key: string]: number } = {};
    recentErrors.forEach(error => {
      const key = error.message.split('\n')[0].substring(0, 100);
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });

    return {
      totalErrors: recentErrors.length,
      uniqueErrors: Object.keys(errorCounts).length,
      topErrors: Object.entries(errorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      criticalErrors: recentErrors.filter(e => this.isCriticalError(e)).length
    };
  }

  // Export errors for analysis
  exportErrors(): ErrorReport[] {
    return [...this.errors];
  }

  // Clear error log
  clearErrors() {
    this.errors = [];
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker();

// React error boundary hook
export function useErrorHandler() {
  const reportError = (error: Error, errorInfo?: any) => {
    errorTracker.captureError({
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      context: errorInfo
    });
  };

  return { reportError };
}