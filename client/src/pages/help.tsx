import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Clock, BarChart3, FileSpreadsheet, Users, Target, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export default function Help() {
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
            <h1 className="font-semibold text-lg">사용 가이드</h1>
            <p className="text-blue-200 text-sm">물류 작업 측정 시스템</p>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Quick Start */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-600" />
                빠른 시작
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-medium">작업 세션 시작</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">작업 유형, 공정세부번호, 측정자/대상자 이름을 입력합니다.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-medium">시간 측정</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">시작 버튼으로 타이머를 시작하고 작업 완료 시 기록 버튼을 누릅니다.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-medium">분석 및 리포트</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">3회 이상 측정 후 Gage R&R 분석을 수행하고 Excel로 내보냅니다.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timer Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                타이머 기능
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">측정 정확도</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  0.01초 정밀도로 측정하며, 브라우저 성능 보정을 통해 정확도를 향상시킵니다.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    <span className="font-medium text-green-800 dark:text-green-200">권장 측정 횟수</span>
                    <p className="text-green-600 dark:text-green-400">최소 10회</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    <span className="font-medium text-blue-800 dark:text-blue-200">측정 간격</span>
                    <p className="text-blue-600 dark:text-blue-400">충분한 휴식</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">버튼 기능</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>시작 (Start)</span>
                    <span className="text-gray-600 dark:text-gray-400">타이머 시작</span>
                  </div>
                  <div className="flex justify-between">
                    <span>일시정지 (Pause)</span>
                    <span className="text-gray-600 dark:text-gray-400">일시 중단</span>
                  </div>
                  <div className="flex justify-between">
                    <span>정지 (Stop)</span>
                    <span className="text-gray-600 dark:text-gray-400">측정 중단</span>
                  </div>
                  <div className="flex justify-between">
                    <span>기록 (Record)</span>
                    <span className="text-gray-600 dark:text-gray-400">시간 저장 후 자동 리셋</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gage R&R Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                Gage R&R 분석
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">분석 방법</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">Range Method</Badge>
                    <span className="text-sm">기본 범위법 (3-9회 측정)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">Enhanced Range</Badge>
                    <span className="text-sm">향상된 범위법 (10회 이상 측정)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">ANOVA</Badge>
                    <span className="text-sm">분산분석법 (다중 측정자)</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">평가 기준</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>GRR &lt; 10%: 우수 (측정시스템 수용가능)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span>GRR 10-30%: 양호 (조건부 수용가능)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>GRR ≥ 30%: 부적합 (측정시스템 개선필요)</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">신뢰성 지표</h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <span className="font-medium">통계적 신뢰도:</span>
                    <p>10회 이상: 높음 | 6-9회: 보통 | 3-5회: 낮음</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Multi-Operator Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-orange-600" />
                다중 측정자 가이드
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">권장 구성</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• 측정자 2-3명 (서로 다른 작업자)</li>
                  <li>• 각 측정자당 10회 반복 측정</li>
                  <li>• 동일한 작업 조건 유지</li>
                  <li>• 측정자 간 독립적 측정</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">재현성 향상 방법</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• 작업 시작/종료 기준 명확화</li>
                  <li>• 측정 순서 랜덤화</li>
                  <li>• 환경 조건 통제 (온도, 조명 등)</li>
                  <li>• 충분한 휴식 시간 확보</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Excel Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />
                Excel 리포트
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">포함 내용</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Raw Data: 전체 측정 데이터</li>
                  <li>• Summary: 작업 정보 및 분석 결과</li>
                  <li>• Analysis Details: 상세 분석 및 개선방향</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">파일명 형식</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  (작업명) (공정세부번호) 측정 결과(년월일시분).xlsx
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  예: 분류작업 분류-001-001 측정 결과(202506020130).xlsx
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-red-600" />
                측정 모범 사례
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">측정 전 준비</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• 측정 목적과 범위 명확화</li>
                  <li>• 작업 표준 절차 확립</li>
                  <li>• 측정자 교육 및 연습</li>
                  <li>• 환경 조건 점검</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">측정 중 주의사항</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• 일관된 시작/종료 기준 적용</li>
                  <li>• 측정 간 충분한 휴식</li>
                  <li>• 외부 방해 요소 차단</li>
                  <li>• 정확한 데이터 입력</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">결과 활용</h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• 정기적 재평가 수행</li>
                  <li>• 개선 계획 수립 및 실행</li>
                  <li>• 결과 공유 및 피드백</li>
                  <li>• 지속적 모니터링</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}