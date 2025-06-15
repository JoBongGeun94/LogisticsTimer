
/**
 * 이상치 감지 서비스
 */
export class OutlierDetectionService {
  /**
   * IQR 방법을 사용한 이상치 감지
   */
  static detectOutliersIQR(data: number[]): { 
    outliers: number[]; 
    cleanData: number[]; 
    lowerBound: number; 
    upperBound: number;
    outlierIndices: number[];
    statistics: {
      q1: number;
      q3: number;
      iqr: number;
      median: number;
    };
  } {
    if (data.length < 4) {
      return { 
        outliers: [], 
        cleanData: [...data], 
        lowerBound: 0, 
        upperBound: 0,
        outlierIndices: [],
        statistics: { q1: 0, q3: 0, iqr: 0, median: 0 }
      };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    
    // 정확한 사분위수 계산 (Tukey's hinges)
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const median = this.calculatePercentile(sorted, 50);
    const iqr = q3 - q1;
    
    // 이상치 경계값 계산 (1.5 * IQR 규칙)
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    // 이상치 분류
    const outliers: number[] = [];
    const cleanData: number[] = [];
    const outlierIndices: number[] = [];
    
    data.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        outliers.push(value);
        outlierIndices.push(index);
      } else {
        cleanData.push(value);
      }
    });
    
    return { 
      outliers, 
      cleanData, 
      lowerBound, 
      upperBound,
      outlierIndices,
      statistics: { q1, q3, iqr, median }
    };
  }

  /**
   * Z-Score 방법을 사용한 이상치 감지
   */
  static detectOutliersZScore(data: number[], threshold: number = 3): {
    outliers: number[];
    cleanData: number[];
    threshold: number;
    outlierIndices: number[];
    statistics: {
      mean: number;
      stdDev: number;
      zScores: number[];
    };
  } {
    if (data.length < 3) {
      return { 
        outliers: [], 
        cleanData: [...data], 
        threshold,
        outlierIndices: [],
        statistics: { mean: 0, stdDev: 0, zScores: [] }
      };
    }

    const mean = data.reduce((sum, x) => sum + x, 0) / data.length;
    const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (data.length - 1);
    const stdDev = Math.sqrt(variance);
    
    const outliers: number[] = [];
    const cleanData: number[] = [];
    const outlierIndices: number[] = [];
    const zScores: number[] = [];
    
    data.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      zScores.push(zScore);
      
      if (zScore > threshold) {
        outliers.push(value);
        outlierIndices.push(index);
      } else {
        cleanData.push(value);
      }
    });
    
    return { 
      outliers, 
      cleanData, 
      threshold,
      outlierIndices,
      statistics: { mean, stdDev, zScores }
    };
  }

  /**
   * Modified Z-Score 방법 (MAD 기반)
   */
  static detectOutliersModifiedZScore(data: number[], threshold: number = 3.5): {
    outliers: number[];
    cleanData: number[];
    threshold: number;
    outlierIndices: number[];
    statistics: {
      median: number;
      mad: number;
      modifiedZScores: number[];
    };
  } {
    if (data.length < 3) {
      return { 
        outliers: [], 
        cleanData: [...data], 
        threshold,
        outlierIndices: [],
        statistics: { median: 0, mad: 0, modifiedZScores: [] }
      };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const median = this.calculatePercentile(sorted, 50);
    
    // MAD (Median Absolute Deviation) 계산
    const deviations = data.map(x => Math.abs(x - median));
    const sortedDeviations = [...deviations].sort((a, b) => a - b);
    const mad = this.calculatePercentile(sortedDeviations, 50);
    
    const outliers: number[] = [];
    const cleanData: number[] = [];
    const outlierIndices: number[] = [];
    const modifiedZScores: number[] = [];
    
    data.forEach((value, index) => {
      const modifiedZScore = mad === 0 ? 0 : (0.6745 * (value - median)) / mad;
      modifiedZScores.push(Math.abs(modifiedZScore));
      
      if (Math.abs(modifiedZScore) > threshold) {
        outliers.push(value);
        outlierIndices.push(index);
      } else {
        cleanData.push(value);
      }
    });
    
    return { 
      outliers, 
      cleanData, 
      threshold,
      outlierIndices,
      statistics: { median, mad, modifiedZScores }
    };
  }

  /**
   * Grubbs 검정을 사용한 이상치 감지
   */
  static detectOutliersGrubbs(data: number[], alpha: number = 0.05): {
    outliers: number[];
    cleanData: number[];
    isOutlierDetected: boolean;
    statistics: {
      testStatistic: number;
      criticalValue: number;
      mean: number;
      stdDev: number;
    };
  } {
    if (data.length < 3) {
      return { 
        outliers: [], 
        cleanData: [...data], 
        isOutlierDetected: false,
        statistics: { testStatistic: 0, criticalValue: 0, mean: 0, stdDev: 0 }
      };
    }

    const workingData = [...data];
    const outliers: number[] = [];
    let isOutlierDetected = false;

    while (workingData.length >= 3) {
      const n = workingData.length;
      const mean = workingData.reduce((sum, x) => sum + x, 0) / n;
      const variance = workingData.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
      const stdDev = Math.sqrt(variance);
      
      // Grubbs 검정 통계량 계산
      const maxDeviation = Math.max(...workingData.map(x => Math.abs(x - mean)));
      const testStatistic = maxDeviation / stdDev;
      
      // 임계값 계산 (t-분포 기반)
      const tCritical = this.getStudentTCritical(alpha / (2 * n), n - 2);
      const criticalValue = ((n - 1) / Math.sqrt(n)) * Math.sqrt(tCritical * tCritical / (n - 2 + tCritical * tCritical));
      
      if (testStatistic > criticalValue) {
        // 이상치 발견
        const outlierIndex = workingData.findIndex(x => Math.abs(x - mean) === maxDeviation);
        const outlierValue = workingData[outlierIndex];
        outliers.push(outlierValue);
        workingData.splice(outlierIndex, 1);
        isOutlierDetected = true;
      } else {
        break;
      }
    }
    
    return { 
      outliers, 
      cleanData: workingData, 
      isOutlierDetected,
      statistics: { 
        testStatistic: 0, 
        criticalValue: 0, 
        mean: workingData.reduce((sum, x) => sum + x, 0) / workingData.length,
        stdDev: Math.sqrt(workingData.reduce((sum, x) => sum + Math.pow(x - workingData.reduce((s, y) => s + y, 0) / workingData.length, 2), 0) / (workingData.length - 1))
      }
    };
  }

  /**
   * 복합 이상치 감지 (여러 방법론 결합)
   */
  static detectOutliersComposite(data: number[]): {
    iqrResult: any;
    zScoreResult: any;
    modifiedZScoreResult: any;
    consensusOutliers: number[];
    consensusOutlierIndices: number[];
    cleanData: number[];
    confidence: 'high' | 'medium' | 'low';
  } {
    const iqrResult = this.detectOutliersIQR(data);
    const zScoreResult = this.detectOutliersZScore(data, 3);
    const modifiedZScoreResult = this.detectOutliersModifiedZScore(data, 3.5);
    
    // 합의 이상치 (2개 이상 방법에서 감지된 것)
    const allOutlierIndices = new Set([
      ...iqrResult.outlierIndices,
      ...zScoreResult.outlierIndices,
      ...modifiedZScoreResult.outlierIndices
    ]);
    
    const consensusOutlierIndices: number[] = [];
    const consensusOutliers: number[] = [];
    
    for (const index of allOutlierIndices) {
      let detectionCount = 0;
      if (iqrResult.outlierIndices.includes(index)) detectionCount++;
      if (zScoreResult.outlierIndices.includes(index)) detectionCount++;
      if (modifiedZScoreResult.outlierIndices.includes(index)) detectionCount++;
      
      if (detectionCount >= 2) {
        consensusOutlierIndices.push(index);
        consensusOutliers.push(data[index]);
      }
    }
    
    const cleanData = data.filter((_, index) => !consensusOutlierIndices.includes(index));
    
    // 신뢰도 계산
    const totalDetections = iqrResult.outliers.length + zScoreResult.outliers.length + modifiedZScoreResult.outliers.length;
    const consensusRatio = totalDetections > 0 ? (consensusOutliers.length * 3) / totalDetections : 1;
    
    const confidence: 'high' | 'medium' | 'low' = 
      consensusRatio > 0.8 ? 'high' :
      consensusRatio > 0.5 ? 'medium' : 'low';
    
    return {
      iqrResult,
      zScoreResult,
      modifiedZScoreResult,
      consensusOutliers,
      consensusOutlierIndices,
      cleanData,
      confidence
    };
  }

  /**
   * 정확한 백분위수 계산
   */
  private static calculatePercentile(sortedData: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedData.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    
    if (lowerIndex === upperIndex) {
      return sortedData[lowerIndex];
    }
    
    const weight = index - lowerIndex;
    return sortedData[lowerIndex] * (1 - weight) + sortedData[upperIndex] * weight;
  }

  /**
   * Student's t-분포 임계값 (근사)
   */
  private static getStudentTCritical(alpha: number, df: number): number {
    // 간단한 t-분포 임계값 근사
    if (df >= 30) {
      // 정규분포 근사
      return this.getZCritical(alpha);
    }
    
    // t-분포 근사 공식
    const z = this.getZCritical(alpha);
    const correction = (z * z * z + z) / (4 * df);
    return z + correction;
  }

  /**
   * 표준정규분포 임계값
   */
  private static getZCritical(alpha: number): number {
    // 표준정규분포 임계값 근사
    if (alpha <= 0.001) return 3.291;
    if (alpha <= 0.005) return 2.576;
    if (alpha <= 0.01) return 2.326;
    if (alpha <= 0.025) return 1.960;
    if (alpha <= 0.05) return 1.645;
    if (alpha <= 0.1) return 1.282;
    return 1.0;
  }
}
