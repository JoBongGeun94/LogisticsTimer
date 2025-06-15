
// 작업 유형 상수 (App.tsx의 WORK_TYPES와 통합)
export const WORK_TYPES = [
  '물자검수팀',
  '저장관리팀', 
  '포장관리팀'
] as const;

export type WorkType = typeof WORK_TYPES[number];

// 작업별 특성 상수
export const WORK_CHARACTERISTICS = {
  물자검수팀: {
    targetCV: 12,
    description: '물자 검수 작업'
  },
  저장관리팀: {
    targetCV: 15,
    description: '저장 관리 작업'
  },
  포장관리팀: {
    targetCV: 10,
    description: '포장 관리 작업'
  }
} as const;
