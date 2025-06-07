import { LapTime } from './Timer';

export interface SessionData {
  id: string;
  name: string;
  workType: string;
  operators: string[];
  targets: string[];
  usl?: number;
  lsl?: number;
  startTime: string;
  lapTimes: LapTime[];
}

export interface SessionFormData {
  name: string;
  workType: string;
  operators: string[];
  targets: string[];
  usl?: number;
  lsl?: number;
}

export type WorkType = 'packaging' | 'sorting' | 'loading' | 'custom';
export const WORK_TYPES: { value: WorkType; label: string }[] = [
  { value: 'packaging', label: '포장 작업' },
  { value: 'sorting', label: '분류 작업' },
  { value: 'loading', label: '적재 작업' },
  { value: 'custom', label: '기타' },
];
