
import React, { useState } from 'react';
import { X, Book, Keyboard, BarChart3, Timer, Download, Home } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('usage');

  // 다크모드 감지
  const isDark = document.documentElement.classList.contains('dark');

  if (!isOpen) return null;

  const tabs = [
    { id: 'usage', label: '사용법', icon: <Book className="w-4 h-4" /> },
    { id: 'shortcuts', label: '단축키', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'analysis', label: 'Gage R&R', icon: <BarChart3 className="w-4 h-4" /> }
  ];

  const bgClass = isDark ? 'bg-gray-800' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textSecondaryClass = isDark ? 'text-gray-300' : 'text-gray-600';
  const textMutedClass = isDark ? 'text-gray-400' : 'text-gray-700';
  const borderClass = isDark ? 'border-gray-600' : 'border-gray-200';
  const surfaceClass = isDark ? 'bg-gray-700' : 'bg-gray-50';
  const hoverClass = isDark ? 'hover:text-gray-100' : 'hover:text-gray-900';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${bgClass} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden`}>
        {/* 헤더 */}
        <div className={`flex justify-between items-center p-6 border-b ${borderClass}`}>
          <h2 className={`text-xl font-bold ${textClass}`}>도움말 💡</h2>
          <button
            onClick={onClose}
            className={`${textMutedClass} ${hoverClass} transition-colors`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* 탭 네비게이션 */}
        <div className={`flex border-b ${borderClass}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? `text-blue-600 border-b-2 border-blue-600 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'}`
                  : `${textSecondaryClass} ${hoverClass}`
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* 컨텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${textClass}`}>🚀 기본 사용법</h3>
                <ol className={`list-decimal list-inside space-y-3 ${textMutedClass}`}>
                  <li><strong className={textClass}>세션 생성:</strong> "새 세션" 버튼을 클릭하여 측정 세션을 생성합니다.</li>
                  <li><strong className={textClass}>측정자/대상자 설정:</strong> MSA 규격에 따라 최소 2명의 측정자와 5개의 대상자를 설정합니다.</li>
                  <li><strong className={textClass}>측정 진행:</strong> 측정자와 대상자를 선택한 후 타이머를 사용하여 작업 시간을 측정합니다.</li>
                  <li><strong className={textClass}>실시간 분석:</strong> 3회 이상 측정 시 기본 통계가 표시되며, 6회 이상 시 완전한 Gage R&R 분석이 가능합니다.</li>
                  <li><strong className={textClass}>결과 내보내기:</strong> CSV 형식으로 측정 데이터와 상세 분석 결과를 다운로드할 수 있습니다.</li>
                </ol>
              </div>
              
              <div className={`${surfaceClass} p-4 rounded-lg`}>
                <h4 className={`font-semibold ${textClass} mb-2 flex items-center gap-2`}>
                  <Timer className="w-4 h-4 text-blue-500" />
                  💡 측정 팁
                </h4>
                <ul className={`${textMutedClass} space-y-1 text-sm`}>
                  <li>• 정확한 분석을 위해 각 조건별로 최소 3-5회씩 측정하세요</li>
                  <li>• 측정 중 일관된 환경과 절차를 유지하세요</li>
                  <li>• 이상치가 감지되면 재측정을 고려하세요</li>
                  <li>• 정기적으로 측정 시스템을 교정하세요</li>
                </ul>
              </div>
            </div>
          )}
          
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <h3 className={`text-lg font-semibold mb-3 ${textClass}`}>⌨️ 키보드 단축키</h3>
              <div className="grid gap-3">
                <div className={`flex justify-between items-center p-3 ${surfaceClass} rounded-lg`}>
                  <span className={textClass}>타이머 시작/정지</span>
                  <kbd className={`${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'} px-2 py-1 rounded text-sm`}>스페이스바</kbd>
                </div>
                <div className={`flex justify-between items-center p-3 ${surfaceClass} rounded-lg`}>
                  <span className={textClass}>측정 완료 (랩타임)</span>
                  <kbd className={`${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'} px-2 py-1 rounded text-sm`}>Enter</kbd>
                </div>
                <div className={`flex justify-between items-center p-3 ${surfaceClass} rounded-lg`}>
                  <span className={textClass}>타이머 중지</span>
                  <kbd className={`${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'} px-2 py-1 rounded text-sm`}>Escape</kbd>
                </div>
                <div className={`flex justify-between items-center p-3 ${surfaceClass} rounded-lg`}>
                  <span className={textClass}>타이머 리셋</span>
                  <kbd className={`${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'} px-2 py-1 rounded text-sm`}>R</kbd>
                </div>
                <div className={`flex justify-between items-center p-3 ${surfaceClass} rounded-lg`}>
                  <span className={textClass}>소개 페이지</span>
                  <kbd className={`${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'} px-2 py-1 rounded text-sm`}>Ctrl + H</kbd>
                </div>
                <div className={`flex justify-between items-center p-3 ${surfaceClass} rounded-lg`}>
                  <span className={textClass}>데이터 내보내기</span>
                  <kbd className={`${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'} px-2 py-1 rounded text-sm`}>Ctrl + E</kbd>
                </div>
                <div className={`flex justify-between items-center p-3 ${surfaceClass} rounded-lg`}>
                  <span className={textClass}>도움말 열기</span>
                  <kbd className={`${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'} px-2 py-1 rounded text-sm`}>F1</kbd>
                </div>
              </div>
              
              <div className={`${surfaceClass} p-4 rounded-lg`}>
                <p className={`text-sm ${textMutedClass}`}>
                  💡 단축키는 입력창이나 모달창이 열려있지 않을 때 사용할 수 있습니다.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${textClass}`}>📊 Gage R&R 분석</h3>
                <p className={`${textMutedClass} mb-4`}>
                  Gage R&R는 측정시스템의 변동을 평가하는 통계적 방법입니다. 
                  측정 오차를 반복성(Repeatability)과 재현성(Reproducibility)으로 분해하여 분석합니다.
                </p>
              </div>
              
              <div>
                <h4 className={`font-semibold ${textClass} mb-2`}>🎯 평가 기준</h4>
                <div className="overflow-x-auto">
                  <table className={`w-full text-sm border ${borderClass} rounded-lg`}>
                    <thead className={surfaceClass}>
                      <tr>
                        <th className={`px-3 py-2 text-left ${textClass} border-b ${borderClass}`}>R&R 비율</th>
                        <th className={`px-3 py-2 text-left ${textClass} border-b ${borderClass}`}>평가</th>
                        <th className={`px-3 py-2 text-left ${textClass} border-b ${borderClass}`}>상태</th>
                        <th className={`px-3 py-2 text-left ${textClass} border-b ${borderClass}`}>권장사항</th>
                      </tr>
                    </thead>
                    <tbody className={textMutedClass}>
                      <tr className={`border-b ${borderClass}`}>
                        <td className="px-3 py-2">&lt; 10%</td>
                        <td className="px-3 py-2">우수</td>
                        <td className="px-3 py-2 text-green-600">✅ 사용 권장</td>
                        <td className="px-3 py-2">현재 시스템 유지</td>
                      </tr>
                      <tr className={`border-b ${borderClass}`}>
                        <td className="px-3 py-2">10-30%</td>
                        <td className="px-3 py-2">허용 가능</td>
                        <td className="px-3 py-2 text-blue-600">🔵 조건부 사용</td>
                        <td className="px-3 py-2">정기 교정 및 모니터링</td>
                      </tr>
                      <tr className={`border-b ${borderClass}`}>
                        <td className="px-3 py-2">30-50%</td>
                        <td className="px-3 py-2">제한적</td>
                        <td className="px-3 py-2 text-yellow-600">⚠️ 주의 필요</td>
                        <td className="px-3 py-2">측정 절차 개선 필요</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">&gt; 50%</td>
                        <td className="px-3 py-2">불가</td>
                        <td className="px-3 py-2 text-red-600">❌ 즉시 개선</td>
                        <td className="px-3 py-2">시스템 전면 재검토</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className={`font-semibold ${textClass} mb-2`}>📈 주요 지표 설명</h4>
                <div className="space-y-3">
                  <div className={`${surfaceClass} p-3 rounded-lg`}>
                    <strong className={textClass}>반복성 (Repeatability):</strong>
                    <span className={`${textMutedClass} ml-2`}>동일한 측정자가 동일한 조건에서 반복 측정할 때의 변동</span>
                  </div>
                  <div className={`${surfaceClass} p-3 rounded-lg`}>
                    <strong className={textClass}>재현성 (Reproducibility):</strong>
                    <span className={`${textMutedClass} ml-2`}>서로 다른 측정자 간의 측정 차이</span>
                  </div>
                  <div className={`${surfaceClass} p-3 rounded-lg`}>
                    <strong className={textClass}>ICC (급내상관계수):</strong>
                    <span className={`${textMutedClass} ml-2`}>측정의 일관성과 신뢰성을 나타내는 지표 (0~1)</span>
                  </div>
                  <div className={`${surfaceClass} p-3 rounded-lg`}>
                    <strong className={textClass}>변동계수 (CV):</strong>
                    <span className={`${textMutedClass} ml-2`}>표준편차를 평균으로 나눈 상대적 변동 지표</span>
                  </div>
                </div>
              </div>

              <div className={`border border-blue-200 ${isDark ? 'bg-blue-900/20' : 'bg-blue-50'} p-4 rounded-lg`}>
                <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">📋 최적 측정 조건</h4>
                <ul className={`${isDark ? 'text-blue-300' : 'text-blue-700'} space-y-1 text-sm`}>
                  <li>• 측정자: 최소 2명 (권장 3명 이상)</li>
                  <li>• 대상자: 최소 5개 (권장 10개 이상)</li>
                  <li>• 반복 측정: 각 조건별 2-3회</li>
                  <li>• 총 측정 횟수: 최소 30회 이상 권장</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        
        {/* 푸터 */}
        <div className={`p-6 border-t ${borderClass} ${surfaceClass}`}>
          <div className="flex justify-between items-center">
            <div className={`text-sm ${textMutedClass}`}>
              더 자세한 도움이 필요하시면 개발팀에 문의하세요.
            </div>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
