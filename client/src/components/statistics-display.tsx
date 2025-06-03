import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Clock, BarChart3 } from "lucide-react";

interface Statistics {
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  standardDeviation: number;
  variance: number;
  coefficientOfVariation: number;
  count: number;
  total: number;
  gageRR?: {
    repeatability: number;
    reproducibility: number;
    gageRR: number;
    partVariation: number;
    totalVariation: number;
    gageRRPercent: number;
    ndc: number;
  };
}

interface StatisticsDisplayProps {
  statistics: Statistics;
}

export function StatisticsDisplay({ statistics }: StatisticsDisplayProps) {
  const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(2);
    return minutes > 0 ? `${minutes}:${seconds.padStart(5, '0')}` : `${seconds}s`;
  };

  const getGageRRStatus = (percent: number) => {
    if (percent < 10) return { label: "우수", color: "bg-green-500", variant: "default" as const };
    if (percent < 30) return { label: "양호", color: "bg-yellow-500", variant: "secondary" as const };
    return { label: "개선필요", color: "bg-red-500", variant: "destructive" as const };
  };

  const gageRRStatus = statistics.gageRR ? getGageRRStatus(statistics.gageRR.gageRRPercent) : null;

  return (
    <div className="space-y-4">
      {/* Basic Statistics */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">평균</span>
            <span className="font-mono font-medium">{formatTime(statistics.mean)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">중앙값</span>
            <span className="font-mono font-medium">{formatTime(statistics.median)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">최소값</span>
            <span className="font-mono font-medium text-green-600">{formatTime(statistics.min)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">최대값</span>
            <span className="font-mono font-medium text-red-600">{formatTime(statistics.max)}</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">범위</span>
            <span className="font-mono font-medium">{formatTime(statistics.range)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">표준편차</span>
            <span className="font-mono font-medium">{formatTime(statistics.standardDeviation)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">변동계수</span>
            <span className="font-mono font-medium">{(statistics.coefficientOfVariation * 100).toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">측정수</span>
            <span className="font-mono font-medium">{statistics.count}회</span>
          </div>
        </div>
      </div>

      {/* Gage R&R Analysis */}
      {statistics.gageRR && (
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900 dark:text-white flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Gage R&R 분석
            </h4>
            <Badge variant={gageRRStatus?.variant}>
              {gageRRStatus?.label}
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>반복성 (Repeatability)</span>
                <span className="font-mono">{statistics.gageRR.repeatability.toFixed(1)}%</span>
              </div>
              <Progress value={statistics.gageRR.repeatability} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>재현성 (Reproducibility)</span>
                <span className="font-mono">{statistics.gageRR.reproducibility.toFixed(1)}%</span>
              </div>
              <Progress value={statistics.gageRR.reproducibility} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold">총 Gage R&R</span>
                <span className="font-mono font-semibold">{statistics.gageRR.gageRRPercent.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.min(statistics.gageRR.gageRRPercent, 100)} 
                className={`h-3 ${gageRRStatus?.color}`}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 mt-3">
              <div>NDC: {statistics.gageRR.ndc}</div>
              <div>부품 변동: {statistics.gageRR.partVariation.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Indicators */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {(statistics.coefficientOfVariation * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">변동계수</div>
        </div>
        <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {statistics.count}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">총 측정</div>
        </div>
      </div>
    </div>
  );
}