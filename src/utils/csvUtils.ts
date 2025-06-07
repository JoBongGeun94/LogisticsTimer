/**
 * CSV 생성 및 다운로드 유틸리티
 * SRP: CSV 관련 기능만 담당
 * OCP: 새로운 CSV 형식 추가 가능
 */

export const createCSVContent = (data: (string | number)[][]): string => {
  const csvRows = data.map(row => 
    row.map(cell => {
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  );
  
  return '\ufeff' + csvRows.join('\n');
};

export const downloadCSVFile = (content: string, filename: string): boolean => {
  try {
    const blob = new Blob([content], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
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
    console.error('CSV download failed:', error);
    return false;
  }
};

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
