/**
 * 현재 시간을 한국어 형식으로 변환
 */
export const getCurrentKoreanTime = (): string => {
  return new Date().toLocaleString('ko-KR');
};

/**
 * 시간 차이 계산 (밀리초)
 */
export const getTimeDifference = (startTime: number, endTime?: number): number => {
  return (endTime || Date.now()) - startTime;
};

/**
 * 타임스탬프를 읽기 쉬운 형식으로 변환
 */
export const formatTimestamp = (timestamp: string | number | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('ko-KR');
};

/**
 * 밀리초를 초 단위로 변환
 */
export const millisecondsToSeconds = (ms: number): number => {
  return Math.round(ms / 1000 * 100) / 100;
};
