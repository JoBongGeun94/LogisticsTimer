/**
 * Single Responsibility Principle (SRP)
 * 세션 검증만을 담당하는 서비스 클래스
 */

export interface ISessionValidator {
  canStartMeasurement(): boolean;
  getValidationMessage(): string;
}

export interface SessionData {
  taskType?: string;
  operatorName?: string;
  targetName?: string;
  operators?: Array<{ id: string; name: string }>;
  parts?: Array<{ id: string; name: string }>;
  selectedOperator?: string;
  selectedPart?: string;
}

/**
 * Interface Segregation Principle (ISP)
 * 기본 모드와 GRR 모드별로 독립적인 검증 인터페이스
 */
export class BasicModeValidator implements ISessionValidator {
  constructor(private session: SessionData) {}

  canStartMeasurement(): boolean {
    return !!(
      this.session.taskType &&
      this.session.operatorName &&
      this.session.targetName
    );
  }

  getValidationMessage(): string {
    if (!this.session.taskType) return "작업 유형을 선택해주세요.";
    if (!this.session.operatorName) return "측정자를 입력해주세요.";
    if (!this.session.targetName) return "대상자를 입력해주세요.";
    return "";
  }
}

export class GageRRModeValidator implements ISessionValidator {
  constructor(private session: SessionData) {}

  canStartMeasurement(): boolean {
    return !!(
      this.session.taskType === 'gage-rr' &&
      this.session.operators?.length &&
      this.session.parts?.length &&
      this.session.selectedOperator &&
      this.session.selectedPart
    );
  }

  getValidationMessage(): string {
    if (!this.session.operators?.length) return "측정자를 추가해주세요.";
    if (!this.session.parts?.length) return "대상자를 추가해주세요.";
    if (!this.session.selectedOperator) return "현재 측정자를 선택해주세요.";
    if (!this.session.selectedPart) return "현재 대상자를 선택해주세요.";
    return "";
  }
}

/**
 * Dependency Inversion Principle (DIP)
 * 구체적인 구현이 아닌 추상화에 의존
 */
export class SessionValidationService {
  private validator: ISessionValidator;

  constructor(session: SessionData) {
    // Open/Closed Principle (OCP): 새로운 모드 추가 시 확장 가능
    if (session.taskType === 'gage-rr') {
      this.validator = new GageRRModeValidator(session);
    } else {
      this.validator = new BasicModeValidator(session);
    }
  }

  canStartMeasurement(): boolean {
    return this.validator.canStartMeasurement();
  }

  getValidationMessage(): string {
    return this.validator.getValidationMessage();
  }

  // 측정 가능 여부와 메시지를 함께 반환
  validate(): { canStart: boolean; message: string } {
    return {
      canStart: this.canStartMeasurement(),
      message: this.getValidationMessage()
    };
  }
}