export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((milliseconds % 1000) / 10);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

export function parseTime(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length !== 2) return 0;
  
  const minutes = parseInt(parts[0]);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0]);
  const centiseconds = secondsParts[1] ? parseInt(secondsParts[1]) : 0;
  
  return (minutes * 60 + seconds) * 1000 + centiseconds * 10;
}

export function calculateStatistics(times: number[]) {
  if (times.length === 0) {
    return {
      average: null,
      min: null,
      max: null,
      standardDeviation: null,
      variance: null,
    };
  }

  const sum = times.reduce((acc, time) => acc + time, 0);
  const average = sum / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  const variance = times.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / times.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    average,
    min,
    max,
    standardDeviation,
    variance,
  };
}

export function calculateCoeffientOfVariation(times: number[]): number {
  const stats = calculateStatistics(times);
  if (!stats.average || !stats.standardDeviation) return 0;
  
  return (stats.standardDeviation / stats.average) * 100;
}

// High-precision timer utilities for improved accuracy
let performanceOffset = 0;
let lastCalibration = 0;
let calibrationSamples: number[] = [];

function calibratePerformance(): void {
  const now = Date.now();
  if (now - lastCalibration > 30000 || calibrationSamples.length === 0) {
    // Collect multiple samples for better calibration
    const samples: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const perfStart = performance.now();
      const dateStart = Date.now();
      
      // Use requestAnimationFrame for consistent timing
      requestAnimationFrame(() => {
        const perfEnd = performance.now();
        const dateEnd = Date.now();
        
        const perfDuration = perfEnd - perfStart;
        const dateDuration = dateEnd - dateStart;
        samples.push(dateDuration - perfDuration);
      });
    }
    
    setTimeout(() => {
      if (samples.length > 0) {
        performanceOffset = samples.reduce((sum, val) => sum + val, 0) / samples.length;
        calibrationSamples = samples;
        lastCalibration = now;
      }
    }, 100);
  }
}

export function getHighPrecisionTime(): number {
  calibratePerformance();
  
  // Use performance.now() with calibration for sub-millisecond precision
  const baseTime = performance.now();
  
  // Apply calibration offset and round to nearest 0.01ms
  const calibratedTime = baseTime + performanceOffset;
  return Math.round(calibratedTime * 100) / 100;
}

export function validateMeasurementAccuracy(measurements: number[]): {
  accuracy: 'high' | 'medium' | 'low';
  resolution: number;
  reliability: number;
  recommendations: string[];
} {
  if (measurements.length < 3) {
    return {
      accuracy: 'low',
      resolution: 10, // 0.01s
      reliability: 0.3,
      recommendations: [
        '최소 3회 이상 측정하세요',
        '측정 환경을 일정하게 유지하세요'
      ]
    };
  }
  
  const cv = calculateCoeffientOfVariation(measurements);
  const stats = calculateStatistics(measurements);
  
  // Determine accuracy based on coefficient of variation
  let accuracy: 'high' | 'medium' | 'low';
  let reliability: number;
  
  if (cv < 5) {
    accuracy = 'high';
    reliability = 0.95;
  } else if (cv < 15) {
    accuracy = 'medium';
    reliability = 0.8;
  } else {
    accuracy = 'low';
    reliability = 0.6;
  }
  
  // Adjust reliability based on sample size
  const sampleSizeBonus = Math.min(0.1, (measurements.length - 3) * 0.02);
  reliability = Math.min(1.0, reliability + sampleSizeBonus);
  
  const recommendations: string[] = [];
  
  if (cv > 15) {
    recommendations.push('측정 변동성이 높습니다. 작업 절차를 표준화하세요');
  }
  
  if (measurements.length < 10) {
    recommendations.push('통계적 신뢰성 향상을 위해 10회 이상 측정하세요');
  }
  
  if (stats.max && stats.min && (stats.max - stats.min) > stats.average! * 0.5) {
    recommendations.push('측정값 편차가 큽니다. 측정 환경을 점검하세요');
  }
  
  return {
    accuracy,
    resolution: 10, // 0.01s resolution
    reliability,
    recommendations
  };
}
