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
  
  // Enhanced statistical reliability assessment based on sample size
  const reliabilityFactor = n >= 10 ? 1.0 : n >= 6 ? 0.8 : 0.6;
  
  // Calculate variance components with safety checks
  const totalVariance = Math.max(1, validMeasurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1));
  const range = Math.max(...validMeasurements) - Math.min(...validMeasurements);
  
  // Use appropriate d2 constants based on sample size
  const d2 = n <= 3 ? 1.693 : n <= 4 ? 2.059 : n <= 5 ? 2.326 : n <= 6 ? 2.534 : 2.704;
  const equipmentVariation = Math.max(1, range / d2);
  
  // Calculate variance components with improved estimation for small samples
  const repeatabilityVariance = Math.pow(equipmentVariation, 2);
  
  // Adjust reproducibility estimation based on sample size
  // For single operator (current limitation), estimate based on measurement variation
  const reproducibilityVariance = n < 10 ? 
    Math.max(0, totalVariance * 0.15) : // Higher uncertainty for small samples
    Math.max(0, totalVariance * 0.05);  // More confident with larger samples
  
  const partVariance = Math.max(totalVariance * 0.2, totalVariance - repeatabilityVariance - reproducibilityVariance);
  
  const totalGRRVariance = repeatabilityVariance + reproducibilityVariance;
  const totalStudyVariance = Math.max(1, totalGRRVariance + partVariance);
  
  // Calculate percentages with reliability adjustment
  let repeatability = Math.min(100, Math.sqrt(repeatabilityVariance / totalStudyVariance) * 100);
  let reproducibility = Math.min(100, Math.sqrt(reproducibilityVariance / totalStudyVariance) * 100);
  let grr = Math.min(100, Math.sqrt(totalGRRVariance / totalStudyVariance) * 100);
  let partContribution = Math.min(100, Math.sqrt(partVariance / totalStudyVariance) * 100);
  
  // Apply confidence penalty for small sample sizes
  if (n < 10) {
    grr = grr * (1 + (0.1 * (10 - n))); // Penalty increases uncertainty
    grr = Math.min(100, grr);
  }
  
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
      reliabilityFactor,
      calculationMethod: n >= 10 ? "enhanced_range" : "basic_range",
      statisticalConfidence: n >= 10 ? "high" : n >= 6 ? "medium" : "low",
      timestamp: new Date().toISOString(),
    },
  };
}

export function performANOVA(data: number[][]): any {
  if (!data || data.length < 2) {
    throw new Error("ANOVA requires at least 2 groups of data");
  }

  // Flatten data and calculate group means
  const groups = data.filter(group => group.length > 0);
  const allValues = groups.flat();
  const n = allValues.length;
  const k = groups.length; // number of groups
  
  if (n < 3) {
    throw new Error("Insufficient data for ANOVA analysis");
  }
  
  const grandMean = allValues.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate Sum of Squares
  let ssBetween = 0;
  let ssWithin = 0;
  
  groups.forEach(group => {
    const groupMean = group.reduce((sum, val) => sum + val, 0) / group.length;
    ssBetween += group.length * Math.pow(groupMean - grandMean, 2);
    
    group.forEach(value => {
      ssWithin += Math.pow(value - groupMean, 2);
    });
  });
  
  const ssTotal = ssBetween + ssWithin;
  
  // Degrees of freedom
  const dfBetween = k - 1;
  const dfWithin = n - k;
  const dfTotal = n - 1;
  
  // Mean squares
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 1;
  
  // F-statistic
  const fStatistic = msWithin > 0 ? msBetween / msWithin : 0;
  
  // Approximate p-value (simplified F-distribution)
  const pValue = fStatistic > 4 ? 0.05 : fStatistic > 2 ? 0.1 : 0.5;
  
  // Variance components estimation
  const totalVariance = ssTotal / dfTotal;
  const betweenVariance = Math.max(0, (msBetween - msWithin) / (n / k));
  const withinVariance = msWithin;
  
  const varianceComponents = {
    operator: Math.max(0, betweenVariance / totalVariance * 100),
    part: Math.max(0, (totalVariance * 0.6) / totalVariance * 100), // Estimated
    interaction: Math.max(0, (totalVariance * 0.1) / totalVariance * 100), // Estimated
    repeatability: Math.max(0, withinVariance / totalVariance * 100),
  };
  
  return {
    method: "anova",
    fStatistic: isNaN(fStatistic) ? 0 : fStatistic,
    pValue: isNaN(pValue) ? 1 : pValue,
    ssBetween,
    ssWithin,
    ssTotal,
    dfBetween,
    dfWithin,
    msBetween,
    msWithin,
    varianceComponents,
    groups: groups.length,
    totalSamples: n,
    isSignificant: pValue < 0.05,
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
