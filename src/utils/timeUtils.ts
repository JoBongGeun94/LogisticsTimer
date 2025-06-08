export const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

export const parseTime = (timeString: string): number => {
  const parts = timeString.split(':');
  if (parts.length !== 2) return 0;
  
  const minutes = parseInt(parts[0], 10) || 0;
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10) || 0;
  const milliseconds = parseInt(secondsParts[1]?.padEnd(3, '0').slice(0, 3), 10) || 0;
  
  return minutes * 60 + seconds + milliseconds / 1000;
};

export const addTime = (time1: number, time2: number): number => {
  return time1 + time2;
};

export const subtractTime = (time1: number, time2: number): number => {
  return Math.max(0, time1 - time2);
};
