export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((milliseconds % 1000) / 10);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

export function parseTime(timeString: string): number {
  const parts = timeString.split(':');
  if (parts.length !== 2) return 0;
  
  const minutes = parseInt(parts[0]);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0]);
  const centiseconds = secondsParts[1] ? parseInt(secondsParts[1]) : 0;
  
  return (minutes * 60 + seconds) * 1000 + centiseconds * 10;
}

export function calculateStatistics(times: number[]) {
  if (times.length === 0) {
    return {
      average: null,
      min: null,
      max: null,
      standardDeviation: null,
      variance: null,
    };
  }

  const sum = times.reduce((acc, time) => acc + time, 0);
  const average = sum / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  const variance = times.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / times.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    average,
    min,
    max,
    standardDeviation,
    variance,
  };
}

export function calculateCoeffientOfVariation(times: number[]): number {
  const stats = calculateStatistics(times);
  if (!stats.average || !stats.standardDeviation) return 0;
  
  return (stats.standardDeviation / stats.average) * 100;
}
