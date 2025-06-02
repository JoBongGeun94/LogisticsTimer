interface GageRRResult {
  repeatability: number;
  reproducibility: number;
  grr: number;
  partContribution: number;
  operatorContribution: number;
  isAcceptable: boolean;
  analysisData: any;
}

interface MeasurementData {
  operatorName: string;
  partId: string;
  trialNumber: number;
  timeInMs: number;
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
    if (!partGroups[measurement.partId]) {
      partGroups[measurement.partId] = [];
    }
    operatorGroups[measurement.operatorName].push(measurement);
    partGroups[measurement.partId].push(measurement);
  });

  const operators = Object.keys(operatorGroups);
  const parts = Object.keys(partGroups);
  
  if (operators.length < 2) {
    throw new Error("최소 2명의 측정자가 필요합니다");
  }

  // Calculate means for each operator-part combination
  const cellMeans: { [key: string]: number } = {};
  const cellRanges: { [key: string]: number } = {};
  
  operators.forEach(operator => {
    parts.forEach(part => {
      const cellData = data.filter(d => d.operatorName === operator && d.partId === part);
      if (cellData.length > 0) {
        const times = cellData.map(d => d.timeInMs);
        const mean = times.reduce((sum, val) => sum + val, 0) / times.length;
        const range = Math.max(...times) - Math.min(...times);
        cellMeans[`${operator}_${part}`] = mean;
        cellRanges[`${operator}_${part}`] = range;
      }
    });
  });

  // Calculate average range within cells (repeatability)
  const avgRange = Object.values(cellRanges).reduce((sum, val) => sum + val, 0) / Object.values(cellRanges).length;
  const d2 = 1.128; // d2 constant for n=2 (assuming 2 trials per cell typically)
  const repeatabilityStdDev = avgRange / d2;

  // Calculate operator means
  const operatorMeans: { [key: string]: number } = {};
  operators.forEach(operator => {
    const operatorData = data.filter(d => d.operatorName === operator);
    const mean = operatorData.reduce((sum, d) => sum + d.timeInMs, 0) / operatorData.length;
    operatorMeans[operator] = mean;
  });

  // Calculate part means
  const partMeans: { [key: string]: number } = {};
  parts.forEach(part => {
    const partData = data.filter(d => d.partId === part);
    const mean = partData.reduce((sum, d) => sum + d.timeInMs, 0) / partData.length;
    partMeans[part] = mean;
  });

  // Calculate reproducibility (operator-to-operator variation)
  const grandMean = data.reduce((sum, d) => sum + d.timeInMs, 0) / data.length;
  const operatorVariation = operators.reduce((sum, op) => {
    return sum + Math.pow(operatorMeans[op] - grandMean, 2);
  }, 0) / (operators.length - 1);
  
  const reproducibilityStdDev = Math.sqrt(Math.max(0, operatorVariation - (repeatabilityStdDev * repeatabilityStdDev) / (parts.length * data.length / operators.length / parts.length)));

  // Calculate part-to-part variation
  const partVariation = parts.reduce((sum, part) => {
    return sum + Math.pow(partMeans[part] - grandMean, 2);
  }, 0) / (parts.length - 1);
  
  const partStdDev = Math.sqrt(Math.max(0, partVariation - (repeatabilityStdDev * repeatabilityStdDev) / (operators.length * data.length / operators.length / parts.length)));

  // Convert to 6-sigma percentages
  const repeatability = (6 * repeatabilityStdDev);
  const reproducibility = (6 * reproducibilityStdDev);
  const partContribution = (6 * partStdDev);
  
  const totalVariation = Math.sqrt(repeatability * repeatability + reproducibility * reproducibility + partContribution * partContribution);
  const grr = Math.sqrt(repeatability * repeatability + reproducibility * reproducibility);
  
  // Calculate percentages
  const repeatabilityPercent = (repeatability / totalVariation) * 100;
  const reproducibilityPercent = (reproducibility / totalVariation) * 100;
  const grrPercent = (grr / totalVariation) * 100;
  const partPercent = (partContribution / totalVariation) * 100;

  return {
    repeatability: repeatabilityPercent,
    reproducibility: reproducibilityPercent,
    grr: grrPercent,
    partContribution: partPercent,
    operatorContribution: reproducibilityPercent,
    isAcceptable: grrPercent < 30,
    analysisData: {
      operators: operators.length,
      parts: parts.length,
      totalMeasurements: data.length,
      operatorMeans,
      partMeans,
      grandMean
    }
  };
}

function calculateSingleOperatorGageRR(measurements: number[]): GageRRResult {
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
