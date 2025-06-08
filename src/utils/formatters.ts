export const formatNumber = (value: number, precision: number = 2): string => {
  return value.toFixed(precision);
};

export const formatPercentage = (value: number, precision: number = 1): string => {
  return `${(value * 100).toFixed(precision)}%`;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('ko-KR');
};

export const formatDateTime = (date: Date): string => {
  return date.toLocaleString('ko-KR');
};
