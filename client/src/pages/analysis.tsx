import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { calculateGageRR, performANOVA } from "@/lib/statistics";
import { validateMeasurementAccuracy } from "@/lib/timer-utils";
import { generateExcelData, downloadExcelFile } from "@/lib/excel-export";
import { Link } from "wouter";
import { ArrowLeft, FileText, Share2, CheckCircle, XCircle, AlertTriangle, Download, FileSpreadsheet } from "lucide-react";

// Type definitions
interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  workerId?: string;
}

interface Operator {
  id: string;
  name: string;
}

interface Part {
  id: string;
  name: string;
}

interface WorkSession {
  id: number;
  taskType: string;
  partNumber?: string;
  operatorName?: string;
  targetName?: string;
  operators?: Operator[];
  parts?: Part[];
}

interface Measurement {
  id: number;
  timeInMs: number;
  timestamp: string;
  operatorName?: string;
  partName?: string;
}

interface GageRRResult {
  grr: number;
  repeatability: number;
  reproducibility: number;
  partContribution: number;
  operatorContribution: number;
  isAcceptable: boolean;
}

export default function Analysis() {
  const { user, isLoading } = useAuth() as { user: User | null; isLoading: boolean };
  const { toast } = useToast();
  const [hasCreatedAnalysis, setHasCreatedAnalysis] = useState(false);

  // Redirect to login if unauthorized
  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "인증 필요",
        description: "로그인이 필요합니다. 로그인 페이지로 이동합니다...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, isLoading, toast]);

  // Fetch active work session
  const { data: activeSession } = useQuery<WorkSession>({
    queryKey: ["/api/work-sessions/active"],
    enabled: !!user,
    retry: false,
  });

  // Fetch measurements for active session
  const { data: measurements = [] } = useQuery<Measurement[]>({
    queryKey: [`/api/measurements/session/${activeSession?.id}`],
    enabled: !!activeSession?.id,
    retry: false,
  });

  // Fetch existing analysis result
  const { data: existingAnalysis } = useQuery<GageRRResult>({
    queryKey: ["/api/analysis/session", activeSession?.id],
    enabled: !!activeSession?.id,
    retry: false,
  });

  // Create analysis mutation
  const createAnalysisMutation = useMutation({
    mutationFn: async (analysisData: any) => {
      const response = await apiRequest("POST", "/api/analysis", {
        sessionId: activeSession?.id,
        ...analysisData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Refetch existing analysis
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/session", activeSession?.id] });
      
      const grr = data?.grr || 0;
      const status = grr < 10 ? "우수" : grr < 30 ? "양호" : "부적합";
      
      toast({
        title: "Gage R&R 분석 완료",
        description: `리포트가 생성되었습니다. 측정 시스템 상태: ${status} (GRR: ${grr.toFixed(1)}%)`,
        duration: 5000,
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Gage R&R 분석을 수행할 수 없습니다.";
      
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: "인증 오류",
          description: "다시 로그인해주세요.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "분석 오류",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Calculate comprehensive analysis
  const times = measurements.map((m: Measurement) => m.timeInMs);
  let analysis = existingAnalysis;
  let accuracyValidation = null;
  let anovaAnalysis = null;
  
  if (!existingAnalysis && times.length >= 3) {
    analysis = calculateGageRR(times);
  }
  
  if (times.length >= 3) {
    accuracyValidation = validateMeasurementAccuracy(times);
    
    // Perform ANOVA if we have sufficient data (simulate multiple groups from single operator data)
    if (times.length >= 6) {
      const groups = [];
      const groupSize = Math.ceil(times.length / 2);
      for (let i = 0; i < times.length; i += groupSize) {
        const group = times.slice(i, i + groupSize);
        if (group.length > 0) groups.push(group);
      }
      if (groups.length >= 2) {
        try {
          anovaAnalysis = performANOVA(groups);
        } catch (err) {
          console.log("ANOVA calculation error:", err);
        }
      }
    }
  }

  // Reset creation flag when session changes
  useEffect(() => {
    setHasCreatedAnalysis(false);
  }, [activeSession?.id]);

  // Save analysis if calculated but not saved
  useEffect(() => {
    if (!existingAnalysis && !hasCreatedAnalysis && measurements.length >= 3 && !createAnalysisMutation.isPending) {
      const calculatedAnalysis = calculateGageRR(measurements.map(m => m.timeInMs));
      createAnalysisMutation.mutate(calculatedAnalysis);
      setHasCreatedAnalysis(true);
    }
  }, [existingAnalysis, hasCreatedAnalysis, measurements.length, createAnalysisMutation]);

  const getResultStatus = (grr: number) => {
    if (grr < 10) return { status: "excellent", label: "우수", color: "green", icon: CheckCircle };
    if (grr < 30) return { status: "acceptable", label: "양호", color: "blue", icon: CheckCircle };
    return { status: "unacceptable", label: "부적합", color: "red", icon: XCircle };
  };

  const getRecommendations = (analysis: any) => {
    const recommendations = [];
    
    if (analysis.grr < 10) {
      recommendations.push({
        type: "success",
        message: "측정 시스템이 우수한 상태입니다. 현재 방법을 유지하세요."
      });
    } else if (analysis.grr < 30) {
      recommendations.push({
        type: "info",
        message: "측정 시스템이 양호합니다. 지속적인 모니터링을 권장합니다."
      });
    } else {
      recommendations.push({
        type: "warning",
        message: "측정 시스템 개선이 필요합니다. 측정 방법을 재검토하세요."
      });
    }

    if (analysis.repeatability > 20) {
      recommendations.push({
        type: "warning",
        message: "반복성이 높습니다. 측정 장비나 방법을 점검하세요."
      });
    }

    if (analysis.reproducibility > 20) {
      recommendations.push({
        type: "warning",
        message: "재현성이 높습니다. 작업자 간 측정 방법을 표준화하세요."
      });
    }

    return recommendations;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 min-h-screen">
          <header className="bg-blue-600 text-white px-4 py-4 flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-3 text-white hover:bg-blue-700">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-lg">Gage R&R 분석</h1>
              <p className="text-blue-200 text-sm">측정 시스템 분석</p>
            </div>
          </header>
          
          <div className="p-4">
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">활성 세션 없음</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  분석할 측정 세션이 없습니다. 먼저 타이머에서 측정을 시작하세요.
                </p>
                <Link href="/">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    타이머로 이동
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (measurements.length < 3) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 min-h-screen">
          <header className="bg-blue-600 text-white px-4 py-4 flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-3 text-white hover:bg-blue-700">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-lg">Gage R&R 분석</h1>
              <p className="text-blue-200 text-sm">측정 시스템 분석</p>
            </div>
          </header>
          
          <div className="p-4">
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">측정 데이터 부족</h3>
                <div className="text-gray-600 dark:text-gray-400 mb-4 space-y-2">
                  <p>통계적으로 신뢰할 수 있는 Gage R&R 분석을 위해서는:</p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm">
                    <p><strong>권장 측정 횟수:</strong> 최소 10회 (현재: {measurements.length}회)</p>
                    <p><strong>권장 측정자 수:</strong> 2-3명 (서로 다른 작업자)</p>
                  </div>
                  <p className="text-sm">현재는 기본 분석만 가능합니다.</p>
                </div>
                <Link href="/">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    측정 계속하기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 dark:border-emerald-800"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Gage R&R 분석 중</p>
            <div className="flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const resultStatus = getResultStatus(analysis.grr);
  const recommendations = getRecommendations(analysis);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 min-h-screen">
        {/* Header */}
        <header className="bg-blue-600 text-white px-4 py-4 flex items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-3 text-white hover:bg-blue-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-lg">Gage R&R 분석</h1>
            <p className="text-blue-200 text-sm">측정 시스템 분석 결과</p>
          </div>
        </header>

        {/* Analysis Content */}
        <div className="p-4 space-y-4">
          
          {/* Statistical Reliability Warning */}
          {measurements.length < 10 && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                      통계적 신뢰성 주의
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 mb-2">
                      현재 {measurements.length}회 측정으로 기본 분석만 제공됩니다.
                    </p>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">
                      <p>• 권장 측정 횟수: 최소 10회 (신뢰도 향상을 위해)</p>
                      <p>• 권장 측정자 수: 2-3명 (재현성 평가를 위해)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Overall Result */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                종합 결과
                <Badge 
                  className={`${
                    resultStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                    resultStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  <resultStatus.icon className="h-3 w-3 mr-1" />
                  {resultStatus.label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    resultStatus.color === 'green' ? 'text-emerald-600' :
                    resultStatus.color === 'blue' ? 'text-blue-600' :
                    'text-red-600'
                  }`}>
                    {analysis.grr.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">% GRR</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    resultStatus.color === 'green' ? 'text-emerald-600' :
                    resultStatus.color === 'blue' ? 'text-blue-600' :
                    'text-red-600'
                  }`}>
                    {resultStatus.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">수용성</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Measurement Accuracy Validation */}
          {accuracyValidation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  측정 정확도 검증
                  <Badge 
                    className={`ml-2 ${
                      accuracyValidation.accuracy === 'high' ? 'bg-green-100 text-green-800' :
                      accuracyValidation.accuracy === 'medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {accuracyValidation.accuracy === 'high' ? '높음' : 
                     accuracyValidation.accuracy === 'medium' ? '보통' : '낮음'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(accuracyValidation.reliability * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">신뢰성</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      0.{accuracyValidation.resolution.toString().padStart(2, '0')}s
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">해상도</div>
                  </div>
                </div>
                {accuracyValidation.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">개선 권장사항:</h4>
                    {accuracyValidation.recommendations.map((rec, index) => (
                      <p key={index} className="text-xs text-gray-600 dark:text-gray-400">• {rec}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ANOVA Analysis */}
          {anovaAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  ANOVA 분석
                  <Badge 
                    className={`ml-2 ${
                      anovaAnalysis.isSignificant ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {anovaAnalysis.isSignificant ? '유의함' : '비유의함'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {anovaAnalysis.fStatistic.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">F-통계량</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {anovaAnalysis.pValue.toFixed(3)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">p-값</div>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <p>• 그룹 수: {anovaAnalysis.groups}개</p>
                  <p>• 총 샘플: {anovaAnalysis.totalSamples}개</p>
                  <p>• 측정자 간 변동: {anovaAnalysis.varianceComponents.operator.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>상세 지표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Repeatability Analysis */}
                <div className="border-l-4 border-indigo-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">반복성 (Repeatability)</h4>
                    <span className="text-2xl font-bold text-indigo-600">
                      {analysis.repeatability.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    동일 측정자가 동일 조건에서 반복 측정할 때의 변동성
                  </div>
                  <div className="text-xs">
                    {analysis.repeatability < 10 ? (
                      <span className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        ✓ 우수: 측정 장비가 매우 안정적입니다
                      </span>
                    ) : analysis.repeatability < 20 ? (
                      <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                        ● 양호: 측정 장비의 정밀도가 적절합니다
                      </span>
                    ) : (
                      <span className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                        ⚠ 주의: 측정 장비 점검 및 보정이 필요합니다
                      </span>
                    )}
                  </div>
                </div>

                {/* Reproducibility Analysis */}
                <div className="border-l-4 border-cyan-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">재현성 (Reproducibility)</h4>
                    <span className="text-2xl font-bold text-cyan-600">
                      {analysis.reproducibility.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    서로 다른 측정자 간의 측정 결과 변동성
                  </div>
                  <div className="text-xs">
                    {analysis.reproducibility < 10 ? (
                      <span className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        ✓ 우수: 측정자 간 일관성이 매우 높습니다
                      </span>
                    ) : analysis.reproducibility < 20 ? (
                      <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                        ● 양호: 측정자 간 편차가 적절한 수준입니다
                      </span>
                    ) : (
                      <span className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                        ⚠ 주의: 측정자 교육 및 작업 표준화가 필요합니다
                      </span>
                    )}
                  </div>
                </div>

                {/* Part Contribution Analysis */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">부품 기여도 (Part-to-Part)</h4>
                    <span className="text-2xl font-bold text-purple-600">
                      {analysis.partContribution.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    실제 부품(작업) 간 차이가 전체 변동에서 차지하는 비율
                  </div>
                  <div className="text-xs">
                    {analysis.partContribution > 50 ? (
                      <span className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        ✓ 이상적: 실제 작업 차이가 변동의 주요 원인입니다
                      </span>
                    ) : analysis.partContribution > 20 ? (
                      <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                        ● 보통: 작업 간 차이를 적절히 구별할 수 있습니다
                      </span>
                    ) : (
                      <span className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                        ⚠ 낮음: 측정시스템 오차가 실제 차이보다 큽니다
                      </span>
                    )}
                  </div>
                </div>

                {/* Operator Contribution Analysis */}
                <div className="border-l-4 border-amber-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">측정자 기여도 (Operator Effect)</h4>
                    <span className="text-2xl font-bold text-amber-600">
                      {analysis.operatorContribution.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    측정자별 편향(bias) 차이가 전체 변동에 미치는 영향
                  </div>
                  <div className="text-xs">
                    {analysis.operatorContribution < 10 ? (
                      <span className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        ✓ 우수: 측정자 간 편향 차이가 미미합니다
                      </span>
                    ) : analysis.operatorContribution < 20 ? (
                      <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                        ● 주의: 일부 측정자 간 차이가 있습니다
                      </span>
                    ) : (
                      <span className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                        ⚠ 개선필요: 측정자별 교육과 표준화가 시급합니다
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visual Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>분산 분석 차트</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">분산 분석 차트</p>
                  <p className="text-xs mt-1">실제 구현 시 통계 차트 표시</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                권장사항
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div 
                    key={index}
                    className={`flex items-start space-x-3 p-3 rounded-lg ${
                      rec.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                      rec.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/20' :
                      'bg-yellow-50 dark:bg-yellow-900/20'
                    }`}
                  >
                    <CheckCircle className={`h-4 w-4 mt-0.5 ${
                      rec.type === 'success' ? 'text-green-500' :
                      rec.type === 'info' ? 'text-blue-500' :
                      'text-yellow-500'
                    }`} />
                    <p className={`text-sm ${
                      rec.type === 'success' ? 'text-green-800 dark:text-green-200' :
                      rec.type === 'info' ? 'text-blue-800 dark:text-blue-200' :
                      'text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {rec.message}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center space-x-2"
              onClick={async () => {
                try {
                  // Check if we're on mobile
                  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                  
                  if (isMobile) {
                    // For mobile, use window.location to force download
                    const downloadUrl = `/api/export/excel/${activeSession?.id}/download`;
                    
                    // Try multiple methods for mobile compatibility
                    try {
                      // Method 1: Direct window.location assignment
                      window.location.href = downloadUrl;
                      
                      toast({
                        title: "Excel 파일 다운로드 시작",
                        description: "파일 다운로드가 시작됩니다. 브라우저의 다운로드 알림을 확인해주세요.",
                      });
                    } catch (error) {
                      // Method 2: Open in new window as fallback
                      const newWindow = window.open(downloadUrl, '_blank');
                      if (newWindow) {
                        toast({
                          title: "Excel 파일 다운로드",
                          description: "새 창에서 파일이 다운로드됩니다.",
                        });
                      } else {
                        toast({
                          title: "다운로드 차단됨",
                          description: "팝업 차단을 해제하고 다시 시도해주세요.",
                          variant: "destructive",
                        });
                      }
                    }
                  } else {
                    // Desktop: Try to use File System Access API for save location choice
                    if ('showSaveFilePicker' in window) {
                      try {
                        // Generate filename
                        const now = new Date();
                        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
                        
                        const teamNames: { [key: string]: string } = {
                          'material_inspection': '물자검수팀',
                          'storage_management': '저장관리팀',
                          'packaging_management': '포장관리팀',
                        };
                        
                        const taskTypeName = teamNames[activeSession?.taskType] || activeSession?.taskType;
                        const suggestedName = `${taskTypeName} ${activeSession?.partNumber || '측정'} 결과(${timestamp}).xlsx`;
                        
                        // Show save dialog
                        const fileHandle = await (window as any).showSaveFilePicker({
                          suggestedName: suggestedName,
                          types: [
                            {
                              description: 'Excel 파일',
                              accept: {
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                              },
                            },
                          ],
                        });
                        
                        // Get file data from server
                        const downloadUrl = `/api/export/excel/${activeSession?.id}/download`;
                        const response = await fetch(downloadUrl);
                        const excelBuffer = await response.arrayBuffer();
                        
                        // Write file to chosen location
                        const writable = await fileHandle.createWritable();
                        await writable.write(excelBuffer);
                        await writable.close();
                        
                        toast({
                          title: "Excel 파일 저장 완료",
                          description: `파일이 "${fileHandle.name}"로 저장되었습니다.`,
                        });
                        
                      } catch (error: any) {
                        if (error.name === 'AbortError') {
                          toast({
                            title: "저장 취소",
                            description: "파일 저장이 취소되었습니다.",
                          });
                        } else {
                          // Fallback to regular download
                          const downloadUrl = `/api/export/excel/${activeSession?.id}/download`;
                          window.open(downloadUrl, '_blank');
                          
                          toast({
                            title: "Excel 파일 다운로드",
                            description: "Excel 파일이 기본 다운로드 폴더에 저장됩니다.",
                          });
                        }
                      }
                    } else {
                      // Fallback for older browsers
                      const downloadUrl = `/api/export/excel/${activeSession?.id}/download`;
                      window.open(downloadUrl, '_blank');
                      
                      toast({
                        title: "Excel 파일 다운로드",
                        description: "Excel 파일이 기본 다운로드 폴더에 저장됩니다.",
                      });
                    }
                  }
                } catch (error) {
                  console.error('Download error:', error);
                  toast({
                    title: "다운로드 오류",
                    description: "리포트 다운로드에 실패했습니다. 네트워크 연결을 확인해주세요.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Download className="h-4 w-4" />
              <span>리포트 다운로드</span>
            </Button>
            
            <Button 
              variant="outline"
              className="flex items-center justify-center space-x-2"
              onClick={async () => {
                try {
                  // Check if we're on mobile
                  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                  
                  if (isMobile) {
                    // For mobile, use window.location to force download
                    const downloadUrl = `/api/export/excel/${activeSession?.id}/download`;
                    
                    // Try multiple methods for mobile compatibility
                    try {
                      // Method 1: Direct window.location assignment
                      window.location.href = downloadUrl;
                      
                      toast({
                        title: "Excel 파일 다운로드 시작",
                        description: "파일 다운로드가 시작됩니다. 브라우저의 다운로드 알림을 확인해주세요.",
                      });
                    } catch (error) {
                      // Method 2: Open in new window as fallback
                      const newWindow = window.open(downloadUrl, '_blank');
                      if (newWindow) {
                        toast({
                          title: "Excel 파일 다운로드",
                          description: "새 창에서 파일이 다운로드됩니다.",
                        });
                      } else {
                        toast({
                          title: "다운로드 차단됨",
                          description: "팝업 차단을 해제하고 다시 시도해주세요.",
                          variant: "destructive",
                        });
                      }
                    }
                  } else {
                    // Desktop: Try to use File System Access API for save location choice
                    if ('showSaveFilePicker' in window) {
                      try {
                        // Generate filename
                        const now = new Date();
                        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
                        
                        const teamNames: { [key: string]: string } = {
                          'material_inspection': '물자검수팀',
                          'storage_management': '저장관리팀',
                          'packaging_management': '포장관리팀',
                        };
                        
                        const taskTypeName = teamNames[activeSession?.taskType] || activeSession?.taskType;
                        const suggestedName = `${taskTypeName} ${activeSession?.partNumber || '측정'} 결과(${timestamp}).xlsx`;
                        
                        // Show save dialog
                        const fileHandle = await (window as any).showSaveFilePicker({
                          suggestedName: suggestedName,
                          types: [
                            {
                              description: 'Excel 파일',
                              accept: {
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                              },
                            },
                          ],
                        });
                        
                        // Get file data from server
                        const downloadUrl = `/api/export/excel/${activeSession?.id}/download`;
                        const response = await fetch(downloadUrl);
                        const excelBuffer = await response.arrayBuffer();
                        
                        // Write file to chosen location
                        const writable = await fileHandle.createWritable();
                        await writable.write(excelBuffer);
                        await writable.close();
                        
                        toast({
                          title: "Excel 파일 저장 완료",
                          description: `파일이 "${fileHandle.name}"로 저장되었습니다.`,
                        });
                        
                      } catch (error: any) {
                        if (error.name === 'AbortError') {
                          toast({
                            title: "저장 취소",
                            description: "파일 저장이 취소되었습니다.",
                          });
                        } else {
                          // Fallback to regular download
                          const downloadUrl = `/api/export/excel/${activeSession?.id}/download`;
                          window.open(downloadUrl, '_blank');
                          
                          toast({
                            title: "Excel 파일 다운로드",
                            description: "Excel 파일이 기본 다운로드 폴더에 저장됩니다.",
                          });
                        }
                      }
                    } else {
                      // Fallback for older browsers
                      const downloadUrl = `/api/export/excel/${activeSession?.id}/download`;
                      window.open(downloadUrl, '_blank');
                      
                      toast({
                        title: "Excel 파일 다운로드",
                        description: "Excel 파일이 기본 다운로드 폴더에 저장됩니다.",
                      });
                    }
                  }
                } catch (error) {
                  console.error('Download error:', error);
                  toast({
                    title: "다운로드 오류",
                    description: "리포트 다운로드에 실패했습니다. 네트워크 연결을 확인해주세요.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel 내보내기</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
