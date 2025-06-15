import React, { useState } from 'react';
import { X, Book, Keyboard, BarChart3 } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('usage');

  if (!isOpen) return null;

  const tabs = [
    { id: 'usage', label: '사용법', icon: <Book className="w-4 h-4" /> },
    { id: 'shortcuts', label: '단축키', icon: <Keyboard className="w-4 h-4" /> },
    { id: 'analysis', label: 'Gage R&R', icon: <BarChart3 className="w-4 h-4" /> }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">도움말</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900'
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
                <h3 className="text-lg font-semibold mb-3">기본 사용법</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li><strong>세션 생성:</strong> "새 세션" 버튼을 클릭하여 측정 세션을 생성합니다.</li>
                  <li><strong>측정자/대상자 설정:</strong> MSA 규격에 따라 최소 2명의 측정자와 5개의 대상자를 설정합니다.</li>
                  <li><strong>측정 진행:</strong> 측정자와 대상자를 선택한 후 타이머를 사용하여 작업 시간을 측정합니다.</li>
                  <li><strong>데이터 분석:</strong> 10회 이상 측정 후 Gage R&R 분석을 실행할 수 있습니다.</li>
                  <li><strong>결과 내보내기:</strong> CSV 형식으로 측정 데이터를 다운로드할 수 있습니다.</li>
                </ol>
              </div>
            </div>
          )}
          
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-3">키보드 단축키</h3>
              <div className="grid gap-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>타이머 시작/정지</span>
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-sm">스페이스바</kbd>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>측정 완료</span>
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-sm">Enter</kbd>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>타이머 리셋</span>
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-sm">R</kbd>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>소개 페이지</span>
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-sm">Ctrl + H</kbd>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>데이터 내보내기</span>
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-sm">Ctrl + E</kbd>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>도움말 열기</span>
                  <kbd className="bg-gray-200 px-2 py-1 rounded text-sm">F1</kbd>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Gage R&R 분석</h3>
                <p className="text-gray-700 mb-4">
                  Gage R&R는 측정시스템의 변동을 평가하는 통계적 방법입니다.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">평가 기준</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">R&R 비율</th>
                        <th className="px-3 py-2 text-left">평가</th>
                        <th className="px-3 py-2 text-left">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-3 py-2">&lt; 10%</td>
                        <td className="px-3 py-2">우수</td>
                        <td className="px-3 py-2 text-green-600">✓ 사용 권장</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2">10-30%</td>
                        <td className="px-3 py-2">허용 가능</td>
                        <td className="px-3 py-2 text-yellow-600">⚠ 주의 관찰</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2">30-50%</td>
                        <td className="px-3 py-2">제한적</td>
                        <td className="px-3 py-2 text-orange-600">△ 개선 필요</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-3 py-2">&gt; 50%</td>
                        <td className="px-3 py-2">불가</td>
                        <td className="px-3 py-2 text-red-600">✗ 즉시 개선</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 푸터 */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              더 자세한 도움이 필요하시면 디지털혁신팀에 문의하세요.
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
