/**
 * CSV 컨텐츠 생성 (UTF-8 BOM 포함)
 */
export const createCSVContent = (data: (string | number)[][]): string => {
  const csvRows = data.map(row =>
    row.map(cell => {
      const cellStr = String(cell);
      // 쉼표, 줄바꿈, 따옴표가 포함된 경우 따옴표로 감싸기
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  );
  
  // UTF-8 BOM 추가
  return '\ufeff' + csvRows.join('\n');
};

/**
 * 측정 데이터를 CSV 형식으로 변환
 */
export const convertMeasurementDataToCSV = (
  sessionData: any,
  lapTimes: any[]
): (string | number)[][] => {
  return [
    ['=== 측정 기록 ==='],
    [''],
    ['세션명', sessionData.name],
    ['작업유형', sessionData.workType],
    ['측정일시', sessionData.startTime],
    ['총 측정횟수', lapTimes.length],
    [''],
    ['순번', '측정시간', '측정자', '대상자', '기록시간'],
    ...lapTimes.map((lap, index) => [
      index + 1,
      lap.formattedTime || lap.time,
      lap.operator,
      lap.target,
      lap.timestamp
    ])
  ];
};
