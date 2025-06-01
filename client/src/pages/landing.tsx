import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Watch, Timer, BarChart3, FileSpreadsheet } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Watch className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            스마트 인시수 타이머
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            물류 작업 측정 및 분석 시스템
          </p>
        </div>

        {/* Features Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-center">주요 기능</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Timer className="h-5 w-5 text-blue-600" />
                <span className="text-sm">정밀한 작업 시간 측정</span>
              </div>
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <span className="text-sm">Gage R&R 통계 분석</span>
              </div>
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                <span className="text-sm">Excel 리포트 생성</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login Button */}
        <Button 
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
        >
          로그인하여 시작하기
        </Button>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>물류 현장 작업자 및 관리자를 위한</p>
          <p>스마트 측정 솔루션</p>
        </div>
      </div>
    </div>
  );
}
