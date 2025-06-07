export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = Math.floor((milliseconds % 1000) / 10);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const formatElapsedTime = (startTime: number, endTime?: number): string => {
  const elapsed = (endTime || Date.now()) - startTime;
  return formatTime(elapsed);
};

export const getCurrentTimestamp = (): number => Date.now();

export const formatDateString = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('ko-KR');
};
