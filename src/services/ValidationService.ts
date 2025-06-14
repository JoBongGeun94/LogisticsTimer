
import { LapTime, SessionData } from '../types';

// 검증 결과 인터페이스
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  canAnalyze?: boolean;
  analysisMessage?: string;
}

// 세션 생성 데이터 인터페이스
interface SessionCreationData {
  sessionName: string;
  workType: string;
  operators: string[];
  targets: string[];
}

// 측정 데이터 인터페이스
interface MeasurementData {
  currentSession: SessionData | null;
  currentOperator: string;
  currentTarget: string;
  currentTime: number;
}

// 검증기 인터페이스들 (Interface Segregation Principle)
interface ISessionValidator {
  validate(data: SessionCreationData): ValidationResult;
}

interface IMeasurementValidator {
  validate(data: MeasurementData): ValidationResult;
}

interface IGageRRValidator {
  validate(lapTimes: LapTime[]): ValidationResult;
}

/**
 * 세션 검증기 (Single Responsibility Principle)
 */
class SessionValidator implements ISessionValidator {
  validate(data: SessionCreationData): ValidationResult {
    if (!data.sessionName?.trim()) {
      return {
        isValid: false,
        message: '세션명을 입력해주세요.',
        canAnalyze: false
      };
    }

    if (!data.workType?.trim()) {
      return {
        isValid: false,
        message: '작업 유형을 선택해주세요.',
        canAnalyze: false
      };
    }

    const validOperators = data.operators.filter(op => op?.trim());
    const validTargets = data.targets.filter(tg => tg?.trim());

    if (validOperators.length === 0) {
      return {
        isValid: false,
        message: '최소 1명의 측정자를 입력해주세요.',
        canAnalyze: false
      };
    }

    if (validTargets.length === 0) {
      return {
        isValid: false,
        message: '최소 1개의 대상자를 입력해주세요.',
        canAnalyze: false
      };
    }

    // Gage R&R 분석 가능 여부 체크
    let canAnalyze = true;
    let analysisMessage = '';

    if (validOperators.length < 2 || validTargets.length < 5) {
      canAnalyze = false;
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
}

/**
 * Gage R&R 검증기 (Single Responsibility Principle)
 */
class GageRRValidator implements IGageRRValidator {
  private static readonly MIN_MEASUREMENTS = 6;
  private static readonly MIN_OPERATORS = 2;
  private static readonly MIN_TARGETS = 2;

  validate(lapTimes: LapTime[]): ValidationResult {
    if (lapTimes.length < GageRRValidator.MIN_MEASUREMENTS) {
      return {
        isValid: false,
        message: 'Gage R&R 분석을 위해서는 최소 6개의 측정 기록이 필요합니다.',
        canAnalyze: false,
        analysisMessage: '더 많은 측정을 수행한 후 분석해주세요.'
      };
    }

    const operators = [...new Set(lapTimes.map(lap => lap.operator))];
    const targets = [...new Set(lapTimes.map(lap => lap.target))];

    if (operators.length < GageRRValidator.MIN_OPERATORS || targets.length < GageRRValidator.MIN_TARGETS) {
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

/**
 * 측정 검증기 (Single Responsibility Principle)
 */
class MeasurementValidator implements IMeasurementValidator {
  validate(data: MeasurementData): ValidationResult {
    if (!data.currentSession) {
      return {
        isValid: false,
        message: '먼저 작업 세션을 생성해주세요.',
        canAnalyze: false
      };
    }

    if (!data.currentOperator || !data.currentTarget) {
      return {
        isValid: false,
        message: '측정자와 대상자를 선택해주세요.',
        canAnalyze: false
      };
    }

    if (data.currentTime === 0) {
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
}

/**
 * 검증 팩토리 (Dependency Inversion Principle)
 */
class ValidationFactory {
  static createSessionValidator(): ISessionValidator {
    return new SessionValidator();
  }

  static createMeasurementValidator(): IMeasurementValidator {
    return new MeasurementValidator();
  }

  static createGageRRValidator(): IGageRRValidator {
    return new GageRRValidator();
  }
}

/**
 * 통합 검증 서비스 (Facade Pattern + Open/Closed Principle)
 */
export class ValidationService {
  private static sessionValidator = ValidationFactory.createSessionValidator();
  private static measurementValidator = ValidationFactory.createMeasurementValidator();
  private static gageRRValidator = ValidationFactory.createGageRRValidator();

  static validateSessionCreation(
    sessionName: string, 
    workType: string, 
    operators: string[], 
    targets: string[]
  ): ValidationResult {
    return this.sessionValidator.validate({
      sessionName,
      workType,
      operators,
      targets
    });
  }

  static validateMeasurement(
    currentSession: SessionData | null,
    currentOperator: string,
    currentTarget: string,
    currentTime: number
  ): ValidationResult {
    return this.measurementValidator.validate({
      currentSession,
      currentOperator,
      currentTarget,
      currentTime
    });
  }

  static validateGageRRAnalysis(lapTimes: LapTime[]): ValidationResult {
    return this.gageRRValidator.validate(lapTimes);
  }
}
