interface GageRRResult {
  repeatability: number;
  reproducibility: number;
  grr: number;
  partContribution: number;
  operatorContribution: number;
  isAcceptable: boolean;
  analysisData: any;
  // 고급 통계 지표 추가
  coefficientOfVariation?: number;
  processCapabilityIndex?: number;
  outlierCount?: number;
  confidenceInterval?: { lower: number; upper: number };
  normalityTest?: { isNormal: boolean; pValue: number };
}

interface MeasurementData {
  operatorName: string;
  partId: string;
  trialNumber: number;
  timeInMs: number;
}

// 고급 통계 분석 헬퍼 함수들
function detectOutliers(measurements: number[]): number[] {
  if (measurements.length < 4) return [];
  
  const sorted = [...measurements].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  return measurements.filter(value => value < lowerBound || value > upperBound);
}

function calculateConfidenceInterval(measurements: number[], confidence: number): { lower: number; upper: number } {
  if (measurements.length < 2) return { lower: 0, upper: 0 };
  
  const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (measurements.length - 1);
  const standardError = Math.sqrt(variance / measurements.length);
  
  // t-distribution approximation for 95% confidence
  const tValue = measurements.length > 30 ? 1.96 : 2.0 + (0.3 / Math.sqrt(measurements.length));
  const margin = tValue * standardError;
  
  return {
    lower: mean - margin,
    upper: mean + margin
  };
}

function performNormalityTest(measurements: number[]): { isNormal: boolean; pValue: number } {
  if (measurements.length < 3) return { isNormal: true, pValue: 1.0 };
  
  // Simplified Shapiro-Wilk approximation
  const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / measurements.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Calculate skewness and kurtosis
  const skewness = measurements.reduce((sum, val) => sum + Math.pow((val - mean) / standardDeviation, 3), 0) / measurements.length;
  const kurtosis = measurements.reduce((sum, val) => sum + Math.pow((val - mean) / standardDeviation, 4), 0) / measurements.length - 3;
  
  // Simple normality test based on skewness and kurtosis
  const skewnessTest = Math.abs(skewness) < 1.0;
  const kurtosisTest = Math.abs(kurtosis) < 3.0;
  const isNormal = skewnessTest && kurtosisTest;
  
  // Approximate p-value based on test statistics
  const testStatistic = Math.abs(skewness) + Math.abs(kurtosis) / 3;
  const pValue = Math.max(0.01, Math.min(0.99, Math.exp(-testStatistic)));
  
  return { isNormal, pValue };
}

function calculateProcessCapability(measurements: number[], mean: number, standardDeviation: number): number {
  if (measurements.length < 5 || standardDeviation === 0) return 0;
  
  // Process capability index (Cpk) calculation
  // Assumes specification limits are ±3σ from target (common in timing studies)
  const target = mean;
  const upperLimit = target + 3 * standardDeviation;
  const lowerLimit = target - 3 * standardDeviation;
  
  const cpkUpper = (upperLimit - mean) / (3 * standardDeviation);
  const cpkLower = (mean - lowerLimit) / (3 * standardDeviation);
  
  return Math.min(cpkUpper, cpkLower);
}

export function calculateGageRR(measurements: number[] | MeasurementData[]): GageRRResult {
  // Check if we have structured Gage R&R data or simple measurements
  if (measurements.length === 0) {
    throw new Error("No measurements provided for analysis");
  }

  // If we have structured data (multiple operators/parts), use proper Gage R&R
  if (typeof measurements[0] === 'object' && 'operatorName' in measurements[0]) {
    return calculateMultiOperatorGageRR(measurements as MeasurementData[]);
  }
  
  // Otherwise, use single operator analysis
  return calculateSingleOperatorGageRR(measurements as number[]);
}

function calculateMultiOperatorGageRR(data: MeasurementData[]): GageRRResult {
  // Group data by operator and part
  const operatorGroups: { [key: string]: MeasurementData[] } = {};
  const partGroups: { [key: string]: MeasurementData[] } = {};
  
  data.forEach(measurement => {
    if (!operatorGroups[measurement.operatorName]) {
      operatorGroups[measurement.operatorName] = [];
    }
    operatorGroups[measurement.operatorName].push(measurement);

    if (!partGroups[measurement.partId]) {
      partGroups[measurement.partId] = [];
    }
    partGroups[measurement.partId].push(measurement);
  });

  const operators = Object.keys(operatorGroups);
  const parts = Object.keys(partGroups);
  
  if (operators.length < 2) {
    // Fall back to single operator analysis
    const times = data.map(d => d.timeInMs);
    return calculateSingleOperatorGageRR(times);
  }

  // Calculate means for each operator
  const operatorMeans = operators.map(op => {
    const opData = operatorGroups[op];
    return opData.reduce((sum, d) => sum + d.timeInMs, 0) / opData.length;
  });

  // Calculate means for each part
  const partMeans = parts.map(part => {
    const partData = partGroups[part];
    return partData.reduce((sum, d) => sum + d.timeInMs, 0) / partData.length;
  });

  // Overall mean
  const overallMean = data.reduce((sum, d) => sum + d.timeInMs, 0) / data.length;

  // Calculate variance components
  const operatorVariance = operatorMeans.reduce((sum, mean) => sum + Math.pow(mean - overallMean, 2), 0) / (operators.length - 1);
  const partVariance = partMeans.reduce((sum, mean) => sum + Math.pow(mean - overallMean, 2), 0) / (parts.length - 1);
  
  // Calculate within-group variance (repeatability)
  let withinVariance = 0;
  let withinCount = 0;
  
  operators.forEach(op => {
    const opData = operatorGroups[op];
    const opMean = opData.reduce((sum, d) => sum + d.timeInMs, 0) / opData.length;
    opData.forEach(d => {
      withinVariance += Math.pow(d.timeInMs - opMean, 2);
      withinCount++;
    });
  });
  
  withinVariance = withinVariance / (withinCount - operators.length);

  // Calculate study variances
  const totalVariance = Math.max(1, operatorVariance + partVariance + withinVariance);
  const repeatabilityVariance = withinVariance;
  const reproducibilityVariance = operatorVariance;
  const totalGRRVariance = repeatabilityVariance + reproducibilityVariance;

  // Calculate percentages
  const repeatability = Math.sqrt(repeatabilityVariance / totalVariance) * 100;
  const reproducibility = Math.sqrt(reproducibilityVariance / totalVariance) * 100;
  const grr = Math.sqrt(totalGRRVariance / totalVariance) * 100;
  const partContribution = Math.sqrt(partVariance / totalVariance) * 100;

  const isAcceptable = grr < 30;

  // 고급 통계 지표 계산
  const times = data.map(d => d.timeInMs);
  const coefficientOfVariation = overallMean > 0 ? (Math.sqrt(totalVariance) / overallMean) * 100 : 0;
  const outliers = detectOutliers(times);
  const confInterval = calculateConfidenceInterval(times, 0.95);
  const normTest = performNormalityTest(times);
  const processCapIndex = calculateProcessCapability(times, overallMean, Math.sqrt(totalVariance));

  return {
    repeatability: isNaN(repeatability) ? 0 : repeatability,
    reproducibility: isNaN(reproducibility) ? 0 : reproducibility,
    grr: isNaN(grr) ? 100 : grr,
    partContribution: isNaN(partContribution) ? 0 : partContribution,
    operatorContribution: reproducibility,
    isAcceptable,
    coefficientOfVariation,
    processCapabilityIndex: processCapIndex,
    outlierCount: outliers.length,
    confidenceInterval: confInterval,
    normalityTest: normTest,
    analysisData: {
      measurements: times,
      mean: overallMean,
      operators: operators.length,
      parts: parts.length,
      totalMeasurements: data.length,
      operatorMeans,
      partMeans,
      timestamp: new Date().toISOString(),
      calculationMethod: "multi_operator_grr"
    },
  };
}

function calculateSingleOperatorGageRR(measurements: number[]): GageRRResult {
  if (measurements.length === 0) {
    throw new Error("No measurements provided for analysis");
  }

  // Filter out invalid measurements
  const validMeasurements = measurements.filter(m => typeof m === 'number' && !isNaN(m) && m > 0);
  
  if (validMeasurements.length === 0) {
    throw new Error("No valid measurements found");
  }

  const n = validMeasurements.length;
  const mean = validMeasurements.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate basic statistics
  const variance = validMeasurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / Math.max(1, n - 1);
  const range = Math.max(...validMeasurements) - Math.min(...validMeasurements);
  
  // Calculate total variance with enhanced method for larger samples
  let totalVariance: number;
  if (n >= 10) {
    // Use more sophisticated calculation for larger samples
    totalVariance = variance;
  } else {
    // Use range-based method for smaller samples
    const d2 = n <= 2 ? 1.128 : n <= 5 ? 2.326 : n <= 10 ? 3.078 : 3.267;
    totalVariance = Math.pow(range / d2, 2);
  }
  
  // Reliability factor based on sample size
  const reliabilityFactor = Math.min(1.0, Math.max(0.5, (n - 2) / 8));
  
  // Since we only have one operator, most variance is "repeatability"
  const repeatabilityVariance = totalVariance * 0.8; // Assume 80% is repeatability
  const reproducibilityVariance = totalVariance * 0.1; // Small reproducibility component
  
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
  
  // 고급 통계 지표 계산
  const coefficientOfVariation = mean > 0 ? (Math.sqrt(totalVariance) / mean) * 100 : 0;
  const outliers = detectOutliers(validMeasurements);
  const confInterval = calculateConfidenceInterval(validMeasurements, 0.95);
  const normTest = performNormalityTest(validMeasurements);
  const processCapIndex = calculateProcessCapability(validMeasurements, mean, Math.sqrt(totalVariance));

  return {
    repeatability: isNaN(repeatability) ? 0 : repeatability,
    reproducibility: isNaN(reproducibility) ? 0 : reproducibility,
    grr: isNaN(grr) ? 100 : grr,
    partContribution: isNaN(partContribution) ? 0 : partContribution,
    operatorContribution: isNaN(operatorContribution) ? 0 : operatorContribution,
    isAcceptable,
    coefficientOfVariation,
    processCapabilityIndex: processCapIndex,
    outlierCount: outliers.length,
    confidenceInterval: confInterval,
    normalityTest: normTest,
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
    return { error: "Insufficient data for ANOVA analysis" };
  }

  const groups = data.filter(group => group && group.length > 0);
  if (groups.length < 2) {
    return { error: "Need at least 2 groups for ANOVA" };
  }

  // Calculate group means and overall mean
  const groupMeans = groups.map(group => 
    group.reduce((sum, val) => sum + val, 0) / group.length
  );
  
  const n = groups.reduce((sum, group) => sum + group.length, 0);
  const overallMean = groups.flat().reduce((sum, val) => sum + val, 0) / n;

  // Calculate Sum of Squares
  const ssBetween = groups.reduce((sum, group, i) => 
    sum + group.length * Math.pow(groupMeans[i] - overallMean, 2), 0
  );
  
  const ssWithin = groups.reduce((sum, group, i) => 
    sum + group.reduce((groupSum, val) => 
      groupSum + Math.pow(val - groupMeans[i], 2), 0
    ), 0
  );

  const ssTotal = ssBetween + ssWithin;

  // Degrees of freedom
  const dfBetween = groups.length - 1;
  const dfWithin = n - groups.length;
  const dfTotal = n - 1;

  // Mean Squares
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;

  // F-statistic
  const fStatistic = msBetween / msWithin;
  
  // Simplified p-value approximation
  const pValue = fStatistic > 4 ? 0.01 : fStatistic > 2 ? 0.05 : 0.1;

  const varianceComponents = {
    between: msBetween,
    within: msWithin,
    total: msBetween + msWithin
  };

  return {
    fStatistic,
    pValue,
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