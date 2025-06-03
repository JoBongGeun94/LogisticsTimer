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

export function calculateStatistics(measurements: any[]) {
  const times = measurements.map(m => m.timeInMs || 0);
  
  if (times.length === 0) {
    return null;
  }

  const sum = times.reduce((acc, time) => acc + time, 0);
  const average = sum / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const range = max - min;
  
  const variance = times.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / times.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = average > 0 ? standardDeviation / average : 0;
  
  // Calculate median
  const sortedTimes = [...times].sort((a, b) => a - b);
  const median = sortedTimes.length % 2 === 0
    ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
    : sortedTimes[Math.floor(sortedTimes.length / 2)];

  return {
    mean: average,
    median,
    min,
    max,
    range,
    standardDeviation,
    variance,
    coefficientOfVariation,
    count: times.length,
    total: sum
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
  outliers: number[];
  qualityScore: number;
  statisticalTests: {
    normalityTest: boolean;
    stabilityTest: boolean;
    trendTest: boolean;
  };
} {
  if (measurements.length < 3) {
    return {
      accuracy: 'low',
      resolution: 10,
      reliability: 0.3,
      recommendations: [
        '최소 3회 이상 측정하세요',
        '측정 환경을 일정하게 유지하세요'
      ],
      outliers: [],
      qualityScore: 0.3,
      statisticalTests: {
        normalityTest: false,
        stabilityTest: false,
        trendTest: false
      }
    };
  }
  
  const cv = calculateCoeffientOfVariation(measurements);
  const stats = calculateStatistics(measurements);
  
  // 이상치 탐지 (IQR 방법)
  const outliers = detectOutliersIQR(measurements);
  
  // 통계적 테스트 수행
  const statisticalTests = performStatisticalTests(measurements);
  
  // 품질 점수 계산 (0-1)
  const qualityScore = calculateQualityScore(cv, outliers.length / measurements.length, statisticalTests);
  
  // 정확도 및 신뢰도 결정
  let accuracy: 'high' | 'medium' | 'low';
  let reliability: number;
  
  if (cv < 3 && outliers.length === 0 && qualityScore > 0.9) {
    accuracy = 'high';
    reliability = 0.98;
  } else if (cv < 8 && outliers.length <= 1 && qualityScore > 0.7) {
    accuracy = 'medium';
    reliability = 0.85;
  } else {
    accuracy = 'low';
    reliability = 0.6;
  }
  
  // 샘플 크기 조정
  const sampleSizeBonus = Math.min(0.15, (measurements.length - 3) * 0.03);
  reliability = Math.min(1.0, reliability + sampleSizeBonus);
  
  // 상세 권장사항 생성
  const recommendations = generateAccuracyRecommendations(cv, outliers, measurements.length, statisticalTests);
  
  return {
    accuracy,
    resolution: 10,
    reliability,
    recommendations,
    outliers,
    qualityScore,
    statisticalTests
  };
}

// 헬퍼 함수들
function detectOutliersIQR(measurements: number[]): number[] {
  const sorted = [...measurements].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return measurements.filter(val => val < lowerBound || val > upperBound);
}

function performStatisticalTests(measurements: number[]): {
  normalityTest: boolean;
  stabilityTest: boolean;
  trendTest: boolean;
} {
  // 정규성 테스트 (Shapiro-Wilk 근사)
  const normalityTest = testNormality(measurements);
  
  // 안정성 테스트 (연속 변동 점검)
  const stabilityTest = testStability(measurements);
  
  // 추세 테스트 (Mann-Kendall 근사)
  const trendTest = testTrend(measurements);
  
  return { normalityTest, stabilityTest, trendTest };
}

function testNormality(measurements: number[]): boolean {
  if (measurements.length < 5) return false;
  
  const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / measurements.length;
  const standardDeviation = Math.sqrt(variance);
  
  if (standardDeviation === 0) return true; // 모든 값이 동일
  
  // 왜도와 첨도 계산
  const skewness = measurements.reduce((sum, val) => sum + Math.pow((val - mean) / standardDeviation, 3), 0) / measurements.length;
  const kurtosis = measurements.reduce((sum, val) => sum + Math.pow((val - mean) / standardDeviation, 4), 0) / measurements.length - 3;
  
  // 정규성 기준 (보수적)
  return Math.abs(skewness) < 1.0 && Math.abs(kurtosis) < 3.0;
}

function testStability(measurements: number[]): boolean {
  if (measurements.length < 6) return true;
  
  // 이동 범위 안정성 테스트
  const movingRanges = [];
  for (let i = 1; i < measurements.length; i++) {
    movingRanges.push(Math.abs(measurements[i] - measurements[i - 1]));
  }
  
  const avgMovingRange = movingRanges.reduce((sum, val) => sum + val, 0) / movingRanges.length;
  const maxMovingRange = Math.max(...movingRanges);
  
  // 안정성 기준: 최대 이동 범위가 평균의 3배 이하
  return maxMovingRange <= avgMovingRange * 3;
}

function testTrend(measurements: number[]): boolean {
  if (measurements.length < 5) return true;
  
  // Mann-Kendall 추세 테스트 근사
  let s = 0;
  for (let i = 0; i < measurements.length - 1; i++) {
    for (let j = i + 1; j < measurements.length; j++) {
      if (measurements[j] > measurements[i]) s++;
      else if (measurements[j] < measurements[i]) s--;
    }
  }
  
  const n = measurements.length;
  const variance = n * (n - 1) * (2 * n + 5) / 18;
  const z = Math.abs(s) / Math.sqrt(variance);
  
  // 유의수준 0.05에서 추세 없음 판정
  return z < 1.96;
}

function calculateQualityScore(cv: number, outlierRatio: number, tests: any): number {
  const cvScore = Math.max(0, 1 - cv / 20); // CV 20% 이상에서 0점
  const outlierScore = Math.max(0, 1 - outlierRatio * 5); // 이상치 20% 이상에서 0점
  const testScore = (Number(tests.normalityTest) + Number(tests.stabilityTest) + Number(tests.trendTest)) / 3;
  
  return (cvScore + outlierScore + testScore) / 3;
}

function generateAccuracyRecommendations(cv: number, outliers: number[], sampleSize: number, tests: any): string[] {
  const recommendations: string[] = [];
  
  if (outliers.length > 0) {
    recommendations.push(`${outliers.length}개 이상치 탐지 - 측정 조건 재검토 필요`);
  }
  
  if (cv > 15) {
    recommendations.push(`높은 변동성 (CV: ${cv.toFixed(1)}%) - 작업 표준화 필요`);
  } else if (cv > 8) {
    recommendations.push(`보통 변동성 - 측정 기법 개선 고려`);
  }
  
  if (!tests.normalityTest) {
    recommendations.push('비정규 분포 - 측정 시스템 점검 권장');
  }
  
  if (!tests.stabilityTest) {
    recommendations.push('측정 불안정성 감지 - 환경 요인 통제 필요');
  }
  
  if (!tests.trendTest) {
    recommendations.push('측정 추세 발견 - 시스템적 편향 가능성');
  }
  
  if (sampleSize < 10) {
    recommendations.push(`충분한 샘플 확보 권장 (현재: ${sampleSize}개, 권장: 10개 이상)`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('측정 품질 우수 - 현재 방법 유지');
  }
  
  return recommendations;
}
