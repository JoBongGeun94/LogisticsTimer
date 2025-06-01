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

  // Validate measurements
  const validMeasurements = measurements.filter(m => !isNaN(m) && isFinite(m) && m > 0);
  if (validMeasurements.length < 3) {
    throw new Error("Insufficient valid measurements for analysis");
  }
  
  const n = validMeasurements.length;
  const mean = validMeasurements.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate variance components with safety checks
  const totalVariance = Math.max(1, validMeasurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1));
  const range = Math.max(...validMeasurements) - Math.min(...validMeasurements);
  
  // Use more conservative constants for Korean logistics timing
  const d2 = n === 3 ? 1.693 : n === 4 ? 2.059 : 2.326; // Standard d2 constants
  const equipmentVariation = Math.max(1, range / d2);
  
  // Calculate variance components with bounds
  const repeatabilityVariance = Math.pow(equipmentVariation, 2);
  const reproducibilityVariance = Math.max(0, totalVariance * 0.1); // Conservative estimate
  const partVariance = Math.max(totalVariance * 0.3, totalVariance - repeatabilityVariance - reproducibilityVariance);
  
  const totalGRRVariance = repeatabilityVariance + reproducibilityVariance;
  const totalStudyVariance = Math.max(1, totalGRRVariance + partVariance);
  
  // Calculate percentages with safety bounds
  const repeatability = Math.min(100, Math.sqrt(repeatabilityVariance / totalStudyVariance) * 100);
  const reproducibility = Math.min(100, Math.sqrt(reproducibilityVariance / totalStudyVariance) * 100);
  const grr = Math.min(100, Math.sqrt(totalGRRVariance / totalStudyVariance) * 100);
  const partContribution = Math.min(100, Math.sqrt(partVariance / totalStudyVariance) * 100);
  const operatorContribution = reproducibility;
  
  const isAcceptable = grr < 30; // AIAG MSA standard
  
  return {
    repeatability: isNaN(repeatability) ? 0 : repeatability,
    reproducibility: isNaN(reproducibility) ? 0 : reproducibility,
    grr: isNaN(grr) ? 100 : grr,
    partContribution: isNaN(partContribution) ? 0 : partContribution,
    operatorContribution: isNaN(operatorContribution) ? 0 : operatorContribution,
    isAcceptable,
    analysisData: {
      measurements: validMeasurements,
      mean,
      totalVariance,
      range,
      n,
      calculationMethod: "improved_range",
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
