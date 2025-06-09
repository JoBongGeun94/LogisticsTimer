import { SessionData, LapTime } from '../types';

interface ValidationResult {
  isValid: boolean;
  message?: string;
  canAnalyze?: boolean;
  analysisMessage?: string;
}

interface MSAValidationResult {
  isValid: boolean;
  message?: string;
  analysisMessage?: string;
  canAnalyze: boolean;
  strictMode?: boolean;
}

export class ValidationService {
  /**
   * 세션 생성 시 유효성 검증
   */
  static validateSessionCreation(
    sessionName: string,
    workType: string,
    operators: string[],
    targets: string[]
  ): ValidationResult {
    if (!sessionName.trim()) {
      return { isValid: false, message: '세션명을 입력해주세요.' };
    }

    if (!workType) {
      return { isValid: false, message: '작업 유형을 선택해주세요.' };
    }

    const validOperators = operators.filter(op => op.trim());
    if (validOperators.length === 0) {
      return { isValid: false, message: '최소 1명의 측정자를 입력해주세요.' };
    }

    const validTargets = targets.filter(tg => tg.trim());
    if (validTargets.length === 0) {
      return { isValid: false, message: '최소 1개의 대상자를 입력해주세요.' };
    }

    // 분석 가능 여부 확인
    const canAnalyze = validOperators.length >= 2 && validTargets.length >= 5;
    
    return {
      isValid: true,
      canAnalyze,
      analysisMessage: canAnalyze 
        ? undefined 
        : 'Gage R&R 분석을 위해서는 측정자 2명 이상, 대상자 5개 이상이 필요합니다.'
    };
  }

  /**
   * 측정 시 유효성 검증
   */
  static validateMeasurement(
    session: SessionData | null,
    operator: string,
    target: string,
    time: number
  ): ValidationResult {
    if (!session) {
      return { isValid: false, message: '활성 세션이 없습니다.' };
    }

    if (!operator || !target) {
      return { isValid: false, message: '측정자와 대상자를 선택해주세요.' };
    }

    if (time <= 0) {
      return { isValid: false, message: '측정 시간이 유효하지 않습니다.' };
    }

    return { isValid: true };
  }

  /**
   * Gage R&R 분석 가능 여부 검증
   */
  static validateGageRRAnalysis(lapTimes: LapTime[]): ValidationResult {
    if (lapTimes.length < 6) {
      return { 
        isValid: false, 
        message: 'Gage R&R 분석을 위해서는 최소 6회 측정이 필요합니다.' 
      };
    }

    const operators = [...new Set(lapTimes.map(lap => lap.operator))];
    const targets = [...new Set(lapTimes.map(lap => lap.target))];

    if (operators.length < 2) {
      return { 
        isValid: false, 
        message: 'Gage R&R 분석을 위해서는 최소 2명의 측정자가 필요합니다.' 
      };
    }

    if (targets.length < 2) {
      return { 
        isValid: false, 
        message: 'Gage R&R 분석을 위해서는 최소 2개의 대상자가 필요합니다.' 
      };
    }

    return { isValid: true };
  }

  /**
   * 엄격한 MSA 검증 (AIAG MSA 4th Edition 기준)
   */
  static validateStrictMSA(lapTimes: LapTime[]): MSAValidationResult {
    const operators = [...new Set(lapTimes.map(l => l.operator))];
    const targets = [...new Set(lapTimes.map(l => l.target))];
    
    if (operators.length < 2) {
      return { 
        isValid: false, 
        canAnalyze: false,
        message: 'MSA 분석을 위해서는 측정자 2명 이상이 필요합니다.',
        analysisMessage: '엄격한 MSA 기준을 충족하지 않습니다. 기본 측정은 가능합니다.'
      };
    }
    
    if (targets.length < 5) {
      return { 
        isValid: false, 
        canAnalyze: false,
        message: 'MSA 분석을 위해서는 대상자 5개 이상이 필요합니다.',
        analysisMessage: '엄격한 MSA 기준을 충족하지 않습니다. 기본 측정은 가능합니다.'
      };
    }
    
    if (lapTimes.length < 10) {
      return { 
        isValid: false, 
        canAnalyze: false,
        message: '엄격한 MSA 분석을 위해서는 최소 10회 측정이 필요합니다.',
        analysisMessage: '기본 측정은 가능하나 엄격한 MSA 분석은 10회 이상 측정 후 가능합니다.'
      };
    }
    
    const combinationCount = operators.length * targets.length;
    const minPerCombination = Math.floor(lapTimes.length / combinationCount);
    
    if (minPerCombination < 2) {
      return { 
        isValid: false, 
        canAnalyze: false,
        message: `각 조건별 최소 2회 측정이 필요합니다. (현재: 조건당 ${minPerCombination}회)`,
        analysisMessage: '더 많은 측정 데이터를 수집한 후 분석을 진행하세요.'
      };
    }
    
    return { 
      isValid: true, 
      canAnalyze: true,
      message: 'MSA 분석 조건을 모두 충족합니다.',
      strictMode: true
    };
  }

  /**
   * 데이터 품질 검증
   */
  static validateDataQuality(lapTimes: LapTime[]): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (lapTimes.length >= 3) {
      const times = lapTimes.map(l => l.time);
      const mean = times.reduce((sum, t) => sum + t, 0) / times.length;
      const stdDev = Math.sqrt(times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length);
      const outliers = lapTimes.filter(lap => Math.abs(lap.time - mean) > 3 * stdDev);
      
      if (outliers.length > 0) {
        issues.push(`${outliers.length}개의 이상치가 발견되었습니다.`);
        recommendations.push('이상치를 검토하고 필요시 제거하거나 재측정을 고려하세요.');
      }
    }
    
    if (lapTimes.length >= 5) {
      const times = lapTimes.map(l => l.time);
      const mean = times.reduce((sum, t) => sum + t, 0) / times.length;
      const stdDev = Math.sqrt(times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length);
      const cv = (stdDev / mean) * 100;
      
      if (cv > 30) {
        issues.push(`변동계수가 ${cv.toFixed(1)}%로 높습니다.`);
        recommendations.push('측정 조건을 표준화하고 일관성을 개선하세요.');
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }
}
