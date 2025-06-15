
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
    upperBound: number 
  } {
    if (data.length < 4) {
      return { outliers: [], cleanData: [...data], lowerBound: 0, upperBound: 0 };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    
    // 사분위수 계산
    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    // 이상치 경계값 계산 (1.5 * IQR 규칙)
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    // 이상치 분류
    const outliers: number[] = [];
    const cleanData: number[] = [];
    
    data.forEach(value => {
      if (value < lowerBound || value > upperBound) {
        outliers.push(value);
      } else {
        cleanData.push(value);
      }
    });
    
    return { outliers, cleanData, lowerBound, upperBound };
  }

  /**
   * Z-Score 방법을 사용한 이상치 감지
   */
  static detectOutliersZScore(data: number[], threshold: number = 3): {
    outliers: number[];
    cleanData: number[];
    threshold: number;
  } {
    if (data.length < 3) {
      return { outliers: [], cleanData: [...data], threshold };
    }

    const mean = data.reduce((sum, x) => sum + x, 0) / data.length;
    const std = Math.sqrt(
      data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (data.length - 1)
    );
    
    const outliers: number[] = [];
    const cleanData: number[] = [];
    
    data.forEach(value => {
      const zScore = Math.abs((value - mean) / std);
      if (zScore > threshold) {
        outliers.push(value);
      } else {
        cleanData.push(value);
      }
    });
    
    return { outliers, cleanData, threshold };
  }
}
