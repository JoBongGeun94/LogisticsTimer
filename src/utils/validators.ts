import { SessionFormData } from '../types';
import { ANALYSIS_CONFIG } from '../constants';

export const validateSessionForm = (data: SessionFormData): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!data.name.trim()) {
    errors.push('세션명을 입력해주세요.');
  }

  if (!data.workType.trim()) {
    errors.push('작업 유형을 입력해주세요.');
  }

  if (data.operators.length < ANALYSIS_CONFIG.MIN_OPERATORS ||
      !data.operators.every((op: string) => op.trim())) {
    errors.push(`최소 ${ANALYSIS_CONFIG.MIN_OPERATORS}명의 측정자가 필요합니다.`);
  }

  if (data.targets.length < ANALYSIS_CONFIG.MIN_PARTS ||
      !data.targets.every((tg: string) => tg.trim())) {
    errors.push(`최소 ${ANALYSIS_CONFIG.MIN_PARTS}개의 대상자가 필요합니다.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateMeasurement = (value: number): boolean => {
  return !isNaN(value) && value > 0 && value < 3600; // 1시간 미만
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
