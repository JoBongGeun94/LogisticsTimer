interface GageRRResult {
  repeatability: number;
  reproducibility: number;
  grr: number;
  partContribution: number;
  operatorContribution: number;
  isAcceptable: boolean;
  analysisData: any;
}

export function calculateGageRR(measurements: number[]): GageRRResult {
  if (measurements.length < 3) {
    throw new Error("Minimum 3 measurements required for Gage R&R analysis");
  }

  // Simplified Gage R&R calculation for demonstration
  // In a real implementation, this would be more sophisticated with proper ANOVA
  
  const n = measurements.length;
  const mean = measurements.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate variance components
  const totalVariance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
  const range = Math.max(...measurements) - Math.min(...measurements);
  
  // Simplified calculations based on range method
  // Real implementation would use ANOVA method
  const d2 = 1.128; // d2 constant for n=3 (simplified)
  const equipmentVariation = range / d2;
  
  // Estimate variance components (simplified)
  const repeatabilityVariance = Math.pow(equipmentVariation, 2);
  const reproducibilityVariance = Math.max(0, totalVariance - repeatabilityVariance) * 0.3; // Simplified
  const partVariance = totalVariance * 0.6; // Simplified assumption
  
  const totalGRRVariance = repeatabilityVariance + reproducibilityVariance;
  const totalStudyVariance = totalGRRVariance + partVariance;
  
  // Calculate percentages
  const repeatability = Math.sqrt(repeatabilityVariance / totalStudyVariance) * 100;
  const reproducibility = Math.sqrt(reproducibilityVariance / totalStudyVariance) * 100;
  const grr = Math.sqrt(totalGRRVariance / totalStudyVariance) * 100;
  const partContribution = Math.sqrt(partVariance / totalStudyVariance) * 100;
  const operatorContribution = reproducibility; // Simplified
  
  const isAcceptable = grr < 30; // AIAG MSA standard
  
  return {
    repeatability,
    reproducibility,
    grr,
    partContribution,
    operatorContribution,
    isAcceptable,
    analysisData: {
      measurements,
      mean,
      totalVariance,
      range,
      n,
      calculationMethod: "simplified_range",
      timestamp: new Date().toISOString(),
    },
  };
}

export function performANOVA(data: number[][]): any {
  // Placeholder for ANOVA implementation
  // Real implementation would perform proper two-way ANOVA
  return {
    fStatistic: 0,
    pValue: 0,
    varianceComponents: {
      part: 0,
      operator: 0,
      interaction: 0,
      repeatability: 0,
    },
  };
}

export function calculateVarianceComponents(measurements: number[]): any {
  // Simplified variance component calculation
  const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (measurements.length - 1);
  
  return {
    total: variance,
    within: variance * 0.4, // Simplified
    between: variance * 0.6, // Simplified
  };
}

export function interpretGageRR(grr: number): {
  status: string;
  recommendation: string;
  color: string;
} {
  if (grr < 10) {
    return {
      status: "우수 (Excellent)",
      recommendation: "측정 시스템이 매우 우수합니다. 현재 상태를 유지하세요.",
      color: "green",
    };
  } else if (grr < 30) {
    return {
      status: "양호 (Acceptable)",
      recommendation: "측정 시스템이 허용 가능한 수준입니다. 지속적인 모니터링을 권장합니다.",
      color: "blue",
    };
  } else {
    return {
      status: "부적합 (Unacceptable)",
      recommendation: "측정 시스템 개선이 필요합니다. 측정 방법이나 장비를 재검토하세요.",
      color: "red",
    };
  }
}
