import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { calculateGageRR } from "@/lib/statistics";
import { Link } from "wouter";
import { ArrowLeft, FileText, Share2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function Analysis() {
  const { user, isLoading } = useAuth();
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
  const { data: activeSession } = useQuery({
    queryKey: ["/api/work-sessions/active"],
    enabled: !!user,
    retry: false,
  });

  // Fetch measurements for active session
  const { data: measurements = [] } = useQuery({
    queryKey: [`/api/measurements/session/${activeSession?.id}`],
    enabled: !!activeSession?.id,
    retry: false,
  });

  // Fetch existing analysis result
  const { data: existingAnalysis } = useQuery({
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
    onSuccess: () => {
      toast({
        title: "분석 완료",
        description: "Gage R&R 분석이 완료되었습니다.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        description: "Gage R&R 분석을 수행할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  // Calculate Gage R&R if we have measurements but no existing analysis
  const analysis = existingAnalysis || (measurements.length >= 3 ? calculateGageRR(measurements.map(m => m.timeInMs)) : null);

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
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Gage R&R 분석을 위해 최소 3회 이상의 측정이 필요합니다.
                  현재 측정 횟수: {measurements.length}회
                </p>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">분석 중...</p>
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
                  <div className="text-3xl font-bold text-blue-600">
                    {analysis.grr.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">% GRR</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">
                    {resultStatus.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">수용성</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>상세 지표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-medium">반복성 (Repeatability)</span>
                  <span className="text-blue-600 font-semibold">
                    {analysis.repeatability.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-medium">재현성 (Reproducibility)</span>
                  <span className="text-blue-600 font-semibold">
                    {analysis.reproducibility.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-medium">부품별 기여도</span>
                  <span className="text-green-500 font-semibold">
                    {analysis.partContribution.toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">측정자별 기여도</span>
                  <span className="text-purple-500 font-semibold">
                    {analysis.operatorContribution.toFixed(1)}%
                  </span>
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
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2"
              onClick={() => {
                toast({
                  title: "리포트 생성",
                  description: "분석 리포트가 생성되었습니다.",
                });
              }}
            >
              <FileText className="h-4 w-4" />
              <span>리포트 생성</span>
            </Button>
            
            <Button 
              variant="outline"
              className="flex items-center justify-center space-x-2"
              onClick={() => {
                toast({
                  title: "결과 공유",
                  description: "분석 결과가 관리자에게 전송되었습니다.",
                });
              }}
            >
              <Share2 className="h-4 w-4" />
              <span>결과 공유</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
