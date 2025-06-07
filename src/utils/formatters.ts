/**
 * 밀리초를 MM:SS.CC 형식으로 변환
 */
export const formatTime = (ms: number): string => {
  if (ms < 0) return '00:00.00';
  
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

/**
 * 파일명 생성 (타임스탬프 포함)
 */
export const generateFileName = (prefix: string, sessionName: string): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  
  const timestamp = `${year}${month}${day}${hour}${minute}`;
  const safeName = sessionName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  
  return `${prefix}-${safeName}-(${timestamp}).csv`;
};

/**
 * 숫자를 퍼센트 형식으로 변환
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * 숫자를 소수점 형식으로 변환
 */
export const formatDecimal = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};
