import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Timer, BarChart3, Users, CheckCircle2, Shield, Zap } from "lucide-react";
import { Link } from "wouter";
import airforceLogo from "@assets/image01.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header */}
      <header className="border-b bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={airforceLogo} 
                alt="Air Force Consolidated Depot Logo" 
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                  정밀측정시스템
                </h1>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  ROK Air Force Consolidated Depot
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
              <Shield className="w-3 h-3 mr-1" />
              SECURE
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          
          {/* Hero Section */}
          <section className="text-center mb-12 md:mb-16">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Precision Measurement
                <span className="block text-blue-600 dark:text-blue-400">
                  Timer System
                </span>
              </h2>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed px-4">
                공군 종합보급창 전용 고정밀 Gage R&R 분석 플랫폼으로
                <span className="block md:inline"> 0.01초 정밀도의 측정과 실시간 통계 분석을 제공합니다</span>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <Zap className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  실시간 분석
                </span>
                <Separator orientation="vertical" className="h-3 md:h-4" />
                <span>ISO 표준 준수</span>
                <Separator orientation="vertical" className="h-3 md:h-4" />
                <span>다중 측정자 지원</span>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="mb-12 md:mb-16">
            <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
              핵심 기능
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
                <CardHeader className="text-center pb-2 pt-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Timer className="w-6 h-6 md:w-7 md:h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-sm md:text-lg font-semibold">정밀 타이머</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0 px-3">
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    0.01초 정밀도의 고정밀 측정
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
                <CardHeader className="text-center pb-2 pt-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 mx-auto bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-6 h-6 md:w-7 md:h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-sm md:text-lg font-semibold">통계 분석</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0 px-3">
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    실시간 Gage R&R 분석
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
                <CardHeader className="text-center pb-2 pt-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6 md:w-7 md:h-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-sm md:text-lg font-semibold">다중 측정자</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0 px-3">
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    여러 측정자 동시 관리
                  </p>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
                <CardHeader className="text-center pb-2 pt-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 mx-auto bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-sm md:text-lg font-semibold">품질 보증</CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0 px-3">
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    ISO 표준 준수 측정
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Login Section */}
          <section className="max-w-sm mx-auto px-4">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  시스템 접속
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  인증된 사용자만 접근 가능한<br />보안 시스템입니다
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">조직</span>
                    <span className="text-xs md:text-sm text-gray-900 dark:text-white font-semibold">공군 종합보급창</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">사용자 ID</span>
                    <Badge variant="secondary" className="font-mono text-xs">AF-001</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">권한</span>
                    <span className="text-xs md:text-sm text-green-700 dark:text-green-400 font-medium">측정 및 분석</span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Link href="/timer">
                    <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-sm md:text-base">
                      로그인하여 시작하기
                    </Button>
                  </Link>
                </div>
                
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-1">
                  본 시스템은 공군 종합보급창 내부 사용 전용입니다
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm mt-12 md:mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
              © 2024 Republic of Korea Air Force Consolidated Depot Precision Measurement System | All Rights Reserved
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}