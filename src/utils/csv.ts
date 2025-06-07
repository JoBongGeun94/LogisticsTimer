export const createCSVContent = (data: (string | number)[][]): string => {
  const csvRows = data.map((row) =>
    row
      .map((cell) => {
        const cellStr = String(cell);
        if (
          cellStr.includes(',') ||
          cellStr.includes('\n') ||
          cellStr.includes('"')
        ) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      })
      .join(',')
  );
  return '\ufeff' + csvRows.join('\n');
};

export const downloadCSVFile = (content: string, filename: string): boolean => {
  try {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    return false;
  }
};
