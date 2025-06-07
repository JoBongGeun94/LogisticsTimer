/**
 * CSV 파일 다운로드
 */
export const downloadCSVFile = (content: string, filename: string): boolean => {
  try {
    // CSV Blob 생성
    const blob = new Blob([content], {
      type: 'text/csv;charset=utf-8;'
    });
    
    // URL 생성
    const url = URL.createObjectURL(blob);
    
    // 다운로드 링크 생성
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // DOM에 추가하고 클릭
    document.body.appendChild(link);
    link.click();
    
    // 정리
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    return true;
  } catch (error) {
    console.error('CSV download failed:', error);
    return false;
  }
};

/**
 * JSON 파일 다운로드
 */
export const downloadJSONFile = (data: any, filename: string): boolean => {
  try {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
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
    console.error('JSON download failed:', error);
    return false;
  }
};
