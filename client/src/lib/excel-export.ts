interface ExcelData {
  measurements: any[];
  analysis: any;
  sessionInfo: any;
}

export function generateExcelData(data: ExcelData): any {
  // Simplified Excel data structure
  // In a real implementation, this would use libraries like xlsx or exceljs
  
  const rawDataSheet = {
    name: "Raw Data",
    data: [
      ["시도 번호", "측정 시간(ms)", "측정 시간(형식)", "작업 유형", "공정세부번호", "측정자", "대상자", "측정 일시", "비고"],
      ...(data.measurements || []).map((m, index) => [
        m.attemptNumber || (index + 1),
        m.timeInMs || 0,
        formatTimeForExcel(m.timeInMs || 0),
        data.sessionInfo?.taskType || m.taskType || "",
        data.sessionInfo?.partNumber || m.partNumber || "",
        data.sessionInfo?.operatorName || "",
        data.sessionInfo?.targetName || "",
        new Date(m.timestamp || new Date()).toLocaleString('ko-KR'),
        m.timeInMs < 1000 ? "매우 빠름" : m.timeInMs > 10000 ? "느림" : "정상"
      ]),
    ],
  };

  const summarySheet = {
    name: "Summary",
    data: [
      ["작업 정보", "", ""],
      ["작업 유형", data.sessionInfo?.taskType || "", ""],
      ["공정세부번호", data.sessionInfo?.partNumber || "", ""],
      ["측정자", data.sessionInfo?.operatorName || "", ""],
      ["대상자", data.sessionInfo?.targetName || "", ""],
      ["시작 시간", data.sessionInfo?.createdAt ? new Date(data.sessionInfo.createdAt).toLocaleString('ko-KR') : "", ""],
      ["", "", ""],
      ["분석 항목", "값", "단위"],
      ["반복성 (Repeatability)", data.analysis?.repeatability?.toFixed(2) || "N/A", "%"],
      ["재현성 (Reproducibility)", data.analysis?.reproducibility?.toFixed(2) || "N/A", "%"],
      ["GRR", data.analysis?.grr?.toFixed(2) || "N/A", "%"],
      ["부품별 기여도", data.analysis?.partContribution?.toFixed(2) || "N/A", "%"],
      ["측정자별 기여도", data.analysis?.operatorContribution?.toFixed(2) || "N/A", "%"],
      ["수용성", data.analysis?.isAcceptable ? "합격" : "부적합", ""],
      ["", "", ""],
      ["통계 정보", "", ""],
      ["총 측정 횟수", data.measurements?.length || 0, "회"],
      ...(data.measurements?.length > 0 ? [
        ["평균 시간", calculateAverage(data.measurements.map(m => m.timeInMs)).toFixed(2), "ms"],
        ["최소 시간", Math.min(...data.measurements.map(m => m.timeInMs)).toFixed(2), "ms"],
        ["최대 시간", Math.max(...data.measurements.map(m => m.timeInMs)).toFixed(2), "ms"],
        ["표준편차", calculateStandardDeviation(data.measurements.map(m => m.timeInMs)).toFixed(2), "ms"],
      ] : [
        ["평균 시간", "데이터 없음", "ms"],
        ["최소 시간", "데이터 없음", "ms"],
        ["최대 시간", "데이터 없음", "ms"],
        ["표준편차", "데이터 없음", "ms"],
      ]),
    ],
  };

  // Generate filename with work type and part number
  const now = new Date();
  const dateTimeStr = now.getFullYear().toString() + 
                     (now.getMonth() + 1).toString().padStart(2, '0') + 
                     now.getDate().toString().padStart(2, '0') + 
                     now.getHours().toString().padStart(2, '0') + 
                     now.getMinutes().toString().padStart(2, '0');
  
  const taskTypeMap: { [key: string]: string } = {
    'picking': '피킹작업',
    'sorting': '분류작업',
    'packing': '포장작업',
    'loading': '적재작업'
  };
  
  const taskTypeName = taskTypeMap[data.sessionInfo?.taskType || ''] || data.sessionInfo?.taskType || '작업';
  const partNumber = data.sessionInfo?.partNumber || '';
  const filename = `${taskTypeName} ${partNumber} 측정 결과(${dateTimeStr}).xlsx`;

  return {
    sheets: [rawDataSheet, summarySheet],
    filename: filename,
    metadata: {
      title: "Gage R&R 분석 리포트",
      subject: "물류 작업 인시수 측정 분석",
      creator: "스마트 인시수 타이머",
      created: new Date().toISOString(),
    },
  };
}

function formatTimeForExcel(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((milliseconds % 1000) / 10);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

function calculateAverage(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

function calculateStandardDeviation(numbers: number[]): number {
  const avg = calculateAverage(numbers);
  const variance = numbers.reduce((sum, num) => sum + Math.pow(num - avg, 2), 0) / numbers.length;
  return Math.sqrt(variance);
}

export function downloadExcelFile(data: any): void {
  console.log("Downloading Excel file:", data);
  
  // Import xlsx library dynamically
  import('xlsx').then((XLSX) => {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Add each sheet to the workbook
    data.sheets.forEach((sheet: any) => {
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });
    
    // Generate and download the file
    XLSX.writeFile(workbook, data.filename);
  }).catch((error) => {
    console.error("Failed to load xlsx library:", error);
    // Fallback to JSON download
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename.replace('.xlsx', '.json');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

export function emailExcelFile(data: any, recipientEmail: string): Promise<void> {
  // Placeholder for email functionality
  // In a real implementation, this would send the Excel file via email
  return new Promise((resolve) => {
    console.log("Emailing Excel file to:", recipientEmail, data);
    setTimeout(resolve, 1000); // Simulate API call
  });
}
