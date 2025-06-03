import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Timer, BarChart3, Users, CheckCircle2, Shield, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  정밀측정시스템
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Republic of Korea Air Force
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Shield className="w-3 h-3 mr-1" />
              SECURE
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          
          {/* Hero Section */}
          <section className="text-center mb-20">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Precision Measurement
                <span className="block text-blue-600 dark:text-blue-400">
                  Timer System
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                공군 종합보급창 전용 고정밀 Gage R&R 분석 플랫폼으로<br />
                0.01초 정밀도의 측정과 실시간 통계 분석을 제공합니다
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <Zap className="w-4 h-4 mr-1" />
                  실시간 분석
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span>ISO 표준 준수</span>
                <Separator orientation="vertical" className="h-4" />
                <span>다중 측정자 지원</span>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="mb-20">
            <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              핵심 기능
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Timer className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl font-semibold">정밀 타이머</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    0.01초 정밀도의 고정밀 측정으로 정확한 작업시간 분석
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-xl font-semibold">통계 분석</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    실시간 Gage R&R 분석과 측정 시스템 평가
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-xl font-semibold">다중 측정자</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    여러 측정자 동시 관리 및 측정자간 변동성 분석
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <CheckCircle2 className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-xl font-semibold">품질 보증</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    ISO 표준 준수 측정 및 품질관리 체계 지원
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Login Section */}
          <section className="max-w-md mx-auto">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  시스템 접속
                </CardTitle>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  인증된 사용자만 접근 가능한 보안 시스템입니다
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">조직</span>
                    <span className="text-sm text-gray-900 dark:text-white font-semibold">공군 종합보급창</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">사용자 ID</span>
                    <Badge variant="secondary" className="font-mono">AF-001</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">권한</span>
                    <span className="text-sm text-green-700 dark:text-green-400 font-medium">측정 및 분석</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Link href="/timer">
                    <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3">
                      로그인하여 시작하기
                    </Button>
                  </Link>
                </div>
                
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
                  본 시스템은 공군 종합보급창 내부 사용 전용입니다
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2024 Republic of Korea Air Force General Supply Depot Precision Measurement System | All Rights Reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}