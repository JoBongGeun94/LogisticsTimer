import { SessionFormData } from '../types';
import { ANALYSIS_CONFIG } from '../constants';

/**
 * 세션 생성 데이터 검증
 */
export const validateSessionData = (data: SessionFormData): boolean => {
  return !!(
    data.sessionName.trim() &&
    data.workType &&
    data.operators.every(op => op.trim()) &&
    data.targets.every(tg => tg.trim()) &&
    data.operators.length >= 1 &&
    data.targets.length >= 1
  );
};

/**
 * 분석 가능 여부 검증
 */
export const canPerformAnalysis = (measurementCount: number): boolean => {
  return measurementCount >= ANALYSIS_CONFIG.MIN_SAMPLE_SIZE;
};

/**
 * 이메일 형식 검증
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 빈 문자열 또는 공백 검증
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * 숫자 범위 검증
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};
