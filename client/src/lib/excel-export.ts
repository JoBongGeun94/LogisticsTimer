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
      ["시도 번호", "측정 시간(ms)", "측정 시간(형식)", "작업 유형", "공정세부번호", "측정자", "대상자", "측정 일시"],
      ...data.measurements.map((m, index) => [
        m.attemptNumber,
        m.timeInMs,
        formatTimeForExcel(m.timeInMs),
        m.taskType,
        m.partNumber || "",
        data.sessionInfo?.operatorName || "",
        data.sessionInfo?.targetName || "",
        new Date(m.timestamp).toLocaleString('ko-KR'),
      ]),
    ],
  };

  const summarySheet = {
    name: "Summary",
    data: [
      ["분석 항목", "값", "단위"],
      ["반복성 (Repeatability)", data.analysis?.repeatability?.toFixed(2) || "N/A", "%"],
      ["재현성 (Reproducibility)", data.analysis?.reproducibility?.toFixed(2) || "N/A", "%"],
      ["GRR", data.analysis?.grr?.toFixed(2) || "N/A", "%"],
      ["부품별 기여도", data.analysis?.partContribution?.toFixed(2) || "N/A", "%"],
      ["측정자별 기여도", data.analysis?.operatorContribution?.toFixed(2) || "N/A", "%"],
      ["수용성", data.analysis?.isAcceptable ? "합격" : "부적합", ""],
      ["", "", ""],
      ["통계 정보", "", ""],
      ["총 측정 횟수", data.measurements.length, "회"],
      ["평균 시간", calculateAverage(data.measurements.map(m => m.timeInMs)).toFixed(2), "ms"],
      ["최소 시간", Math.min(...data.measurements.map(m => m.timeInMs)).toFixed(2), "ms"],
      ["최대 시간", Math.max(...data.measurements.map(m => m.timeInMs)).toFixed(2), "ms"],
      ["표준편차", calculateStandardDeviation(data.measurements.map(m => m.timeInMs)).toFixed(2), "ms"],
    ],
  };

  return {
    sheets: [rawDataSheet, summarySheet],
    filename: `Gage_RR_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`,
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
