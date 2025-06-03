import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, BarChart3 } from "lucide-react";

interface ExportDialogProps {
  measurements: any[];
  statistics: any;
  sessionInfo: any;
  trigger?: React.ReactNode;
}

export function ExportDialog({ measurements, statistics, sessionInfo, trigger }: ExportDialogProps) {
  const [format, setFormat] = useState("excel");
  const [includeStatistics, setIncludeStatistics] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(false);

  const handleExport = () => {
    // Export functionality would be implemented here
    console.log("Exporting data:", { format, includeStatistics, includeCharts });
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-300">
      <Download className="h-4 w-4 mr-2" />
      내보내기
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            데이터 내보내기
          </DialogTitle>
          <DialogDescription>
            측정 데이터와 분석 결과를 원하는 형식으로 내보내세요.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">파일 형식</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="pdf">PDF 보고서</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="statistics" 
                checked={includeStatistics}
                onCheckedChange={(checked) => setIncludeStatistics(checked === true)}
              />
              <label htmlFor="statistics" className="text-sm">통계 분석 포함</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="charts" 
                checked={includeCharts}
                onCheckedChange={(checked) => setIncludeCharts(checked === true)}
                disabled={format === "csv"}
              />
              <label htmlFor="charts" className="text-sm">차트 및 그래프 포함</label>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded text-sm">
            <p><strong>포함될 데이터:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-600 dark:text-slate-400">
              <li>측정 데이터 ({measurements.length}건)</li>
              {includeStatistics && <li>통계 분석 결과</li>}
              {includeCharts && format !== "csv" && <li>시각화 차트</li>}
              <li>세션 정보</li>
            </ul>
          </div>

          <Button onClick={handleExport} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}