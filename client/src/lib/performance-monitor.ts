// Performance monitoring and benchmarking utilities
export interface PerformanceMetrics {
  apiResponseTime: number;
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
  timestamp: number;
}

export interface BenchmarkResults {
  p50: number;
  p95: number;
  p99: number;
  average: number;
  min: number;
  max: number;
  errorRate: number;
  throughput: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 measurements

  // API call performance measurement
  async measureApiCall<T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      const result = await apiCall();
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();
      
      const metrics: PerformanceMetrics = {
        apiResponseTime: endTime - startTime,
        renderTime: 0, // Will be measured separately
        memoryUsage: endMemory - startMemory,
        networkLatency: endTime - startTime, // Simplified for now
        timestamp: Date.now()
      };

      this.addMetric(metrics);
      
      // Log slow API calls (> 300ms)
      if (metrics.apiResponseTime > 300) {
        console.warn(`Slow API call detected: ${endpoint} took ${metrics.apiResponseTime.toFixed(2)}ms`);
      }

      return { result, metrics };
    } catch (error) {
      const endTime = performance.now();
      console.error(`API call failed: ${endpoint} in ${(endTime - startTime).toFixed(2)}ms`, error);
      throw error;
    }
  }

  // Render performance measurement
  measureRenderTime(componentName: string, renderFn: () => void): number {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Log slow renders (> 16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }

    return renderTime;
  }

  // Memory usage measurement
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // Add metric to collection
  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Calculate benchmark statistics
  getBenchmarkResults(timeWindow = 300000): BenchmarkResults { // Default 5 minutes
    const cutoffTime = Date.now() - timeWindow;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    
    if (recentMetrics.length === 0) {
      return {
        p50: 0, p95: 0, p99: 0, average: 0, min: 0, max: 0,
        errorRate: 0, throughput: 0
      };
    }

    const responseTimes = recentMetrics.map(m => m.apiResponseTime).sort((a, b) => a - b);
    const count = responseTimes.length;

    return {
      p50: this.percentile(responseTimes, 50),
      p95: this.percentile(responseTimes, 95),
      p99: this.percentile(responseTimes, 99),
      average: responseTimes.reduce((sum, time) => sum + time, 0) / count,
      min: responseTimes[0] || 0,
      max: responseTimes[count - 1] || 0,
      errorRate: 0, // Would need error tracking
      throughput: count / (timeWindow / 1000) // requests per second
    };
  }

  // Calculate percentile
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  // Generate performance report
  generateReport(): string {
    const results = this.getBenchmarkResults();
    
    return `
Performance Benchmark Report
============================
Time Window: Last 5 minutes
Sample Size: ${this.metrics.length} requests

Response Times:
- P50 (Median): ${results.p50.toFixed(2)}ms
- P95: ${results.p95.toFixed(2)}ms  
- P99: ${results.p99.toFixed(2)}ms
- Average: ${results.average.toFixed(2)}ms
- Min: ${results.min.toFixed(2)}ms
- Max: ${results.max.toFixed(2)}ms

Performance Status:
- P95 < 300ms: ${results.p95 < 300 ? '✓ PASS' : '✗ FAIL'}
- Throughput: ${results.throughput.toFixed(2)} req/s

Memory Usage:
- Current: ${this.getMemoryUsage().toFixed(2)} MB
`;
  }

  // Export metrics for external analysis
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // Clear collected metrics
  clearMetrics(): void {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Enhanced API request wrapper with performance monitoring
export async function monitoredApiRequest(
  endpoint: string,
  options?: RequestInit
): Promise<any> {
  return performanceMonitor.measureApiCall(async () => {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    return response.json();
  }, endpoint);
}

// Performance measurement hook for React components
export function usePerformanceMonitor(componentName: string) {
  const measureRender = (renderFn: () => void) => {
    return performanceMonitor.measureRenderTime(componentName, renderFn);
  };

  const getBenchmarks = () => {
    return performanceMonitor.getBenchmarkResults();
  };

  const getReport = () => {
    return performanceMonitor.generateReport();
  };

  return { measureRender, getBenchmarks, getReport };
}