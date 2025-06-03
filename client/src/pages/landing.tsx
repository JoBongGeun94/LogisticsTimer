import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, BarChart3, Users, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              정밀 측정 타이머
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              공군 종합보급창 전용 Gage R&R 분석 시스템
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="text-center">
              <CardHeader>
                <Timer className="w-8 h-8 mx-auto text-blue-600" />
                <CardTitle className="text-lg">정밀 타이머</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  0.01초 정밀도의 고정밀 측정
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <BarChart3 className="w-8 h-8 mx-auto text-green-600" />
                <CardTitle className="text-lg">통계 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  실시간 Gage R&R 분석
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="w-8 h-8 mx-auto text-purple-600" />
                <CardTitle className="text-lg">다중 측정자</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  여러 측정자 동시 관리
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <CheckCircle2 className="w-8 h-8 mx-auto text-orange-600" />
                <CardTitle className="text-lg">품질 보증</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ISO 표준 준수 측정
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Login Section */}
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">시스템 접속</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-left space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>조직:</strong> 공군 종합보급창
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>사용자 ID:</strong> AF-001
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>권한:</strong> 측정 및 분석
                </p>
              </div>
              
              <Link href="/timer">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  로그인하여 시작하기
                </Button>
              </Link>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                본 시스템은 공군 종합보급창 내부 사용 전용입니다
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-16 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">
              © 2024 공군 종합보급창 정밀측정시스템 | 모든 권리 보유
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}