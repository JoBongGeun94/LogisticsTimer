export const WORK_TYPES = [
  '물자검수팀',
  '저장관리팀',
  '포장관리팀'
] as const;

export type WorkType = typeof WORK_TYPES[number];
