import { SessionData, LapTime, ValidationResult } from '../types';

export class ValidationService {
  static validateSessionCreation(
    sessionName: string, 
    workType: string, 
    operators: string[], 
    targets: string[]
  ): ValidationResult {
    const validOperators = operators.filter(op => op.trim());
    const validTargets = targets.filter(tg => tg.trim());

    if (!sessionName.trim() || !workType || validOperators.length === 0 || validTargets.length === 0) {
      return {
        isValid: false,
        message: '모든 필드를 입력해주세요.',
        canAnalyze: false
      };
    }

    // Gage R&R 분석 가능 여부 확인
    const canAnalyze = validOperators.length >= 2 && validTargets.length >= 5;
    let analysisMessage = '';

    if (!canAnalyze) {
      if (validOperators.length < 2 && validTargets.length < 5) {
        analysisMessage = 'Gage R&R 분석을 위해서는 측정자 2명 이상, 대상자 5개 이상이 필요합니다.';
      } else if (validOperators.length < 2) {
        analysisMessage = 'Gage R&R 분석을 위해서는 측정자 2명 이상이 필요합니다.';
      } else {
        analysisMessage = 'Gage R&R 분석을 위해서는 대상자 5개 이상이 필요합니다.';
      }
    }

    return {
      isValid: true,
      canAnalyze,
      analysisMessage
    };
  }

  static validateMeasurement(
    currentSession: SessionData | null,
    currentOperator: string,
    currentTarget: string,
    currentTime: number
  ): ValidationResult {
    if (!currentSession) {
      return {
        isValid: false,
        message: '먼저 작업 세션을 생성해주세요.',
        canAnalyze: false
      };
    }

    if (!currentOperator || !currentTarget) {
      return {
        isValid: false,
        message: '측정자와 대상자를 선택해주세요.',
        canAnalyze: false
      };
    }

    if (currentTime === 0) {
      return {
        isValid: false,
        message: '측정 시간이 0입니다. 타이머를 시작해주세요.',
        canAnalyze: false
      };
    }

    return {
      isValid: true,
      canAnalyze: true
    };
  }

  static validateGageRRAnalysis(lapTimes: LapTime[]): ValidationResult {
    if (lapTimes.length < 6) {
      return {
        isValid: false,
        message: 'Gage R&R 분석을 위해서는 최소 6개의 측정 기록이 필요합니다.',
        canAnalyze: false,
        analysisMessage: '더 많은 측정을 수행한 후 분석해주세요.'
      };
    }

    const operators = [...new Set(lapTimes.map(lap => lap.operator))];
    const targets = [...new Set(lapTimes.map(lap => lap.target))];

    if (operators.length < 2 || targets.length < 2) {
      return {
        isValid: false,
        message: 'Gage R&R 분석을 위해서는 최소 2명의 측정자와 2개의 대상자가 필요합니다.',
        canAnalyze: false,
        analysisMessage: '다양한 측정자와 대상자로 측정을 수행해주세요.'
      };
    }

    return {
      isValid: true,
      canAnalyze: true
    };
  }
}
