import React from 'react';
import { Play, BarChart3, Clock, Users, Target, CheckCircle, Home } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const features = [
    {
      icon: <Clock className="w-8 h-8" />,
      title: "정밀 타이머",
      description: "소수점 단위 정확한 시간 측정, 키보드 단축키 지원"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Gage R&R 분석",
      description: "MSA 규격 완전 준수, 로그 변환 옵션 지원"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "다중 측정자",
      description: "최소 2명 측정자, 최대 20명까지 동시 관리"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "대상자 관리",
      description: "최소 5개 대상자, 체계적인 측정 계획 수립"
    }
  ];

  const statistics = [
    { number: "95%", label: "MSA 규격 준수도" },
    { number: "100%", label: "타입 안전성" },
    { number: "10+", label: "측정 분석 지표" },
    { number: "4가지", label: "로그 변환 옵션" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">LogisticsTimer</h1>
              <p className="text-xs text-gray-600">공군 종합보급창</p>
            </div>
          </div>
          <button
            onClick={onGetStarted}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            메인으로
          </button>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            물류 작업현장
            <span className="block text-blue-600">인시수 측정 시스템</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            MSA 규격을 완전 준수하는 정밀한 Gage R&R 분석 도구로 
            작업 효율성을 과학적으로 측정하고 개선하세요.
          </p>
          
          <button
            onClick={onGetStarted}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <Play className="w-5 h-5" />
            지금 시작하기
          </button>

          {/* 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-16">
            {statistics.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 주요 기능 */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              주요 기능
            </h3>
            <p className="text-xl text-gray-600">
              전문적인 측정시스템 분석을 위한 모든 도구를 제공합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="p-6 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all">
                <div className="text-blue-600 mb-4">{feature.icon}</div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MSA 규격 준수 */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-8">
            MSA 규격 완전 준수
          </h3>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">최소 10회 측정</h4>
              <p>MSA-4 규격에 따른 통계적 유의성 확보</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">P/T 비율 분석</h4>
              <p>측정시스템 정밀도 평가 및 권장사항 제공</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" />
              <h4 className="text-xl font-semibold mb-2">로그 변환 지원</h4>
              <p>자연로그, 상용로그, 제곱근 변환 옵션</p>
            </div>
          </div>
          
          <button
            onClick={onGetStarted}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            지금 시작하기
          </button>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">LogisticsTimer</span>
            </div>
            <p className="text-gray-400">
              공군 종합보급창 디지털혁신팀 개발
            </p>
          </div>
          
          <div className="text-sm text-gray-400">
            © 2024 공군 종합보급창. 모든 권리 보유.
          </div>
        </div>
      </footer>
    </div>
  );
};
