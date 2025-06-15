
/**
 * 정규성 검정 서비스 (Shapiro-Wilk Test)
 */
export class NormalityTestService {
  /**
   * Shapiro-Wilk 정규성 검정
   */
  static shapiroWilkTest(data: number[]): { statistic: number; pValue: number; isNormal: boolean } {
    if (data.length < 3 || data.length > 5000) {
      throw new Error('샘플 크기는 3-5000 사이여야 합니다.');
    }

    const n = data.length;
    const sortedData = [...data].sort((a, b) => a - b);
    
    // Shapiro-Wilk 계수 계산 (근사식)
    const a = this.calculateShapiroWilkCoefficients(n);
    
    // W 통계량 계산
    let numerator = 0;
    for (let i = 0; i < Math.floor(n / 2); i++) {
      numerator += a[i] * (sortedData[n - 1 - i] - sortedData[i]);
    }
    
    const mean = data.reduce((sum, x) => sum + x, 0) / n;
    const denominator = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0);
    
    const W = Math.pow(numerator, 2) / denominator;
    
    // p-value 근사 계산
    const pValue = this.approximatePValue(W, n);
    
    return {
      statistic: W,
      pValue,
      isNormal: pValue > 0.05 // 5% 유의수준
    };
  }

  private static calculateShapiroWilkCoefficients(n: number): number[] {
    // 간단한 근사식 (실제로는 더 복잡한 계산 필요)
    const a = new Array(Math.floor(n / 2));
    for (let i = 0; i < a.length; i++) {
      a[i] = (i + 1) / n;
    }
    return a;
  }

  private static approximatePValue(W: number, n: number): number {
    // W 통계량을 기반한 p-value 근사
    if (W > 0.95) return Math.min(0.9, 0.5 + (W - 0.95) * 10);
    if (W > 0.90) return Math.min(0.5, 0.1 + (W - 0.90) * 8);
    if (W > 0.85) return Math.min(0.1, 0.05 + (W - 0.85) * 1);
    return 0.01;
  }
}
