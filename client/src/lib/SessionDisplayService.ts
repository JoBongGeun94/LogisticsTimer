/**
 * Open/Closed Principle (OCP)
 * 세션 정보 표시 로직을 확장 가능하게 구현
 */

import { WorkSession } from "@shared/schema";

export interface SessionDisplayStrategy {
  formatSessionInfo(session: WorkSession): string;
  shouldShowOperatorSelector(session: WorkSession): boolean;
  shouldShowPartSelector(session: WorkSession): boolean;
}

export class BasicSessionDisplay implements SessionDisplayStrategy {
  formatSessionInfo(session: WorkSession): string {
    const taskTypeMap: { [key: string]: string } = {
      'basic_timing': '기본 작업시간 측정',
      'material_inspection': '물자검수팀',
      'assembly_line': '조립라인 작업',
      'quality_control': '품질관리',
      'maintenance': '정비작업',
      'packaging': '포장작업'
    };
    
    const taskName = taskTypeMap[session.taskType] || session.taskType;
    return `${taskName}\n공정세부번호: ${session.partNumber}`;
  }
  
  shouldShowOperatorSelector(session: WorkSession): boolean {
    return false; // 기본 모드에서는 측정자 선택기 숨김
  }
  
  shouldShowPartSelector(session: WorkSession): boolean {
    return false; // 기본 모드에서는 부품 선택기 숨김
  }
}

export class GageRRSessionDisplay implements SessionDisplayStrategy {
  formatSessionInfo(session: WorkSession): string {
    const operatorCount = session.operators?.length || 0;
    const partCount = session.parts?.length || 0;
    const trialsPerOperator = session.trialsPerOperator || 3;
    
    return `Gage R&R 분석\n측정자: ${operatorCount}명, 부품: ${partCount}개\n회차: ${trialsPerOperator}회/조합`;
  }
  
  shouldShowOperatorSelector(session: WorkSession): boolean {
    return true; // GRR 모드에서는 측정자 선택 필요
  }
  
  shouldShowPartSelector(session: WorkSession): boolean {
    return true; // GRR 모드에서는 부품 선택 필요
  }
}

export class SessionDisplayService {
  private strategy: SessionDisplayStrategy;
  
  constructor(session: WorkSession) {
    this.strategy = session.taskType === 'gage-rr' 
      ? new GageRRSessionDisplay() 
      : new BasicSessionDisplay();
  }
  
  getSessionInfo(session: WorkSession): string {
    return this.strategy.formatSessionInfo(session);
  }
  
  shouldShowOperatorSelector(session: WorkSession): boolean {
    return this.strategy.shouldShowOperatorSelector(session);
  }
  
  shouldShowPartSelector(session: WorkSession): boolean {
    return this.strategy.shouldShowPartSelector(session);
  }
}