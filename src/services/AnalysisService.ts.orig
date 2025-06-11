import { LapTime, GageRRAnalysis } from '../types';

export class AnalysisService {
  static calculateGageRR(lapTimes: LapTime[]): GageRRAnalysis {
    const defaultResult: GageRRAnalysis = {
      repeatability: 0, reproducibility: 0, gageRR: 0,
      partVariation: 0, totalVariation: 0, gageRRPercent: 100,
      ndc: 0, status: 'unacceptable', cpk: 0,
      anova: {
        operator: 0, part: 0, interaction: 0, error: 0, total: 0,
        operatorPercent: 0, partPercent: 0, interactionPercent: 0, errorPercent: 0
      },
      interpretation: {
        overall: '분석을 위한 데이터가 부족합니다.',
        repeatability: '반복성 분석 불가',
        reproducibility: '재현성 분석 불가',
        recommendations: ['최소 6개 이상의 측정 데이터가 필요합니다.'],
        riskLevel: 'high'
      }
    };

    if (!lapTimes || lapTimes.length < 6) return defaultResult;

    try {
      const times = lapTimes.map(lap => lap.time).filter(time => time > 0);
      if (times.length < 6) return defaultResult;

      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / Math.max(1, times.length - 1);
      const stdDev = Math.sqrt(variance);

      // 측정자별, 대상자별 그룹화
      const operatorGroups = lapTimes.reduce((groups, lap) => {
        const key = lap.operator?.trim();
        if (key && lap.time > 0) {
          if (!groups[key]) groups[key] = [];
          groups[key].push(lap.time);
        }
        return groups;
      }, {} as Record<string, number[]>);

      const targetGroups = lapTimes.reduce((groups, lap) => {
        const key = lap.target?.trim();
        if (key && lap.time > 0) {
          if (!groups[key]) groups[key] = [];
          groups[key].push(lap.time);
        }
        return groups;
      }, {} as Record<string, number[]>);

      const operatorCount = Object.keys(operatorGroups).length;
      const targetCount = Object.keys(targetGroups).length;

      if (operatorCount === 0 || targetCount === 0) return defaultResult;

      const trialsPerCondition = Math.max(1, Math.floor(times.length / (operatorCount * targetCount)));

      // 반복성 계산
      let repeatabilityVariance = 0;
      let totalWithinGroups = 0;

      Object.values(operatorGroups).forEach(group => {
        if (group.length > 1) {
          const groupMean = group.reduce((a, b) => a + b, 0) / group.length;
          repeatabilityVariance += group.reduce((acc, val) => acc + Math.pow(val - groupMean, 2), 0);
          totalWithinGroups += group.length - 1;
        }
      });

      const repeatability = totalWithinGroups > 0 
        ? Math.sqrt(repeatabilityVariance / totalWithinGroups)
        : stdDev * 0.8;

      // 재현성 계산
      const operatorMeans = Object.values(operatorGroups)
        .filter(group => group.length > 0)
        .map(group => group.reduce((a, b) => a + b, 0) / group.length);

      const operatorVariance = operatorMeans.length > 1
        ? operatorMeans.reduce((acc, opMean) => acc + Math.pow(opMean - mean, 2), 0) / Math.max(1, operatorCount - 1)
        : 0;

      const reproducibility = Math.sqrt(Math.max(0, operatorVariance - (repeatability * repeatability) / trialsPerCondition));

      // 대상자 변동 계산
      const targetMeans = Object.values(targetGroups)
        .filter(group => group.length > 0)
        .map(group => group.reduce((a, b) => a + b, 0) / group.length);

      const targetVariance = targetMeans.length > 1
        ? targetMeans.reduce((acc, targetMean) => acc + Math.pow(targetMean - mean, 2), 0) / Math.max(1, targetCount - 1)
        : variance;

      const partVariation = Math.sqrt(Math.max(0, targetVariance - (repeatability * repeatability) / trialsPerCondition));

      const gageRR = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
      const totalVariation = Math.sqrt(gageRR ** 2 + partVariation ** 2);
      const gageRRPercent = totalVariation > 0 ? Math.min(100, (gageRR / totalVariation) * 100) : 100;
      const ndc = partVariation > 0 && gageRR > 0 ? Math.max(0, Math.floor((partVariation / gageRR) * 1.41)) : 0;

      // Cpk 계산
      const cpk = partVariation > 0 && stdDev > 0 ? Math.max(0, partVariation / (6 * stdDev)) : 0;

      // ANOVA 분석
      const totalANOVAVariance = operatorVariance + targetVariance + (variance * 0.1) + (repeatability ** 2);
      const anova = {
        operator: Math.max(0, operatorVariance),
        part: Math.max(0, targetVariance),
        interaction: Math.max(0, variance * 0.1),
        error: Math.max(0, repeatability ** 2),
        total: Math.max(0, totalANOVAVariance),
        operatorPercent: totalANOVAVariance > 0 ? (operatorVariance / totalANOVAVariance) * 100 : 0,
        partPercent: totalANOVAVariance > 0 ? (targetVariance / totalANOVAVariance) * 100 : 0,
        interactionPercent: totalANOVAVariance > 0 ? ((variance * 0.1) / totalANOVAVariance) * 100 : 0,
        errorPercent: totalANOVAVariance > 0 ? ((repeatability ** 2) / totalANOVAVariance) * 100 : 0
      };

      // 상태 결정
      let status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
      if (gageRRPercent < 10) status = 'excellent';
      else if (gageRRPercent < 30) status = 'acceptable';
      else if (gageRRPercent < 50) status = 'marginal';
      else status = 'unacceptable';

      // 해석 생성
      const interpretation = this.generateInterpretation(gageRRPercent, repeatability, reproducibility, cpk, ndc, anova);

      return {
        repeatability: Math.max(0, repeatability),
        reproducibility: Math.max(0, reproducibility),
        gageRR: Math.max(0, gageRR),
        partVariation: Math.max(0, partVariation),
        totalVariation: Math.max(0, totalVariation),
        gageRRPercent: Math.max(0, gageRRPercent),
        ndc: Math.max(0, ndc),
        status,
        cpk: Math.max(0, cpk),
        anova,
        interpretation
      };
    } catch (error) {
      console.error('calculateGageRR error:', error);
      return defaultResult;
    }
  }

  private static generateInterpretation(
    gageRRPercent: number, 
    repeatability: number, 
    reproducibility: number, 
    cpk: number, 
    ndc: number,
    anova: any
  ) {
    const overall = gageRRPercent < 10 
      ? '측정 시스템이 우수합니다. 제품 변동을 정확하게 구별할 수 있으며, 측정 오차가 매우 낮습니다.'
      : gageRRPercent < 30
      ? '측정 시스템이 양호합니다. 대부분의 상황에서 사용 가능하나 지속적인 모니터링이 필요합니다.'
      : gageRRPercent < 50
      ? '측정 시스템이 보통 수준입니다. 제한적으로 사용 가능하나 개선이 권장됩니다.'
      : '측정 시스템에 심각한 문제가 있습니다. 즉시 개선이 필요하며, 현재 상태로는 신뢰할 수 없습니다.';

    const repeatabilityInterpretation = repeatability < reproducibility
      ? '반복성이 우수합니다. 동일한 측정자가 동일한 조건에서 측정할 때 일관된 결과를 얻을 수 있습니다.'
      : '반복성에 문제가 있습니다. 장비의 정밀도나 측정 환경을 점검해야 합니다.';

    const reproducibilityInterpretation = reproducibility < repeatability
      ? '재현성이 우수합니다. 서로 다른 측정자가 측정해도 일관된 결과를 얻을 수 있습니다.'
      : '재현성에 문제가 있습니다. 측정자 간 교육이나 표준 절차 개선이 필요합니다.';

    const recommendations: string[] = [];
    
    if (gageRRPercent >= 30) {
      recommendations.push('측정 시스템 전반적인 재검토 필요');
      recommendations.push('측정 장비의 교정 및 정밀도 점검');
    }
    
    if (repeatability > reproducibility) {
      recommendations.push('측정 장비의 안정성 및 정밀도 개선');
      recommendations.push('측정 환경 조건 표준화');
    } else {
      recommendations.push('측정자 교육 프로그램 강화');
      recommendations.push('표준 작업 절차서 개선');
    }

    if (cpk < 1.33) {
      recommendations.push('공정 능력 개선 필요');
    }

    if (ndc < 5) {
      recommendations.push('측정 시스템의 구별 능력 향상 필요');
    }

    if (anova.operatorPercent > 30) {
      recommendations.push('측정자 간 변동 감소를 위한 교육 강화');
    }

    const riskLevel: 'low' | 'medium' | 'high' = 
      gageRRPercent < 10 ? 'low' : 
      gageRRPercent < 30 ? 'medium' : 'high';

    return {
      overall,
      repeatability: repeatabilityInterpretation,
      reproducibility: reproducibilityInterpretation,
      recommendations,
      riskLevel
    };
  }
}
