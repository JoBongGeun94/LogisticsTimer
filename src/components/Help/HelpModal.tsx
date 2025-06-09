import React, { useState } from 'react';
import { X, HelpCircle, Keyboard, BarChart3, Download } from 'lucide-react';

interface HelpModalProps {
  isVisible: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isVisible, onClose, isDark }) => {
  const [activeTab, setActiveTab] = useState<'usage' | 'shortcuts' | 'analysis' | 'export'>('usage');

  const theme = {
    bg: isDark ? 'bg-gray-900' : 'bg-gray-50',
    card: isDark ? 'bg-gray-800' : 'bg-white',
    text: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-200' : 'text-gray-700',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
    border: isDark ? 'border-gray-600' : 'border-gray-200',
    surface: isDark ? 'bg-gray-700' : 'bg-gray-50',
  };

  if (!isVisible) return null;

  const tabs = [
    { id: 'usage' as const, label: '사용법', icon: HelpCircle },
    { id: 'shortcuts' as const, label: '단축키', icon: Keyboard },
    { id: 'analysis' as const, label: 'Gage R&R', icon: BarChart3 },
    { id: 'export' as const, label: '내보내기', icon: Download },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${theme.card} rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border ${theme.border}`}>
        {/* 헤더 */}
        <div className={`p-6 border-b ${theme.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HelpCircle className="w-6 h-6 text-blue-500" />
              <h2 className={`text-xl font-bold ${theme.text}`}>물류타이머 종합 도움말</h2>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* 탭 네비게이션 */}
          <div className="flex space-x-1 mt-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white'
                      : `${theme.surface} ${theme.textSecondary} hover:${theme.textSecondary}`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>기본 사용 흐름</h3>
                <ol className={`space-y-2 ${theme.textSecondary}`}>
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                    <span><strong>세션 생성:</strong> "새 세션" 버튼으로 작업 세션 만들기</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                    <span><strong>측정자/대상자 선택:</strong> 드롭다운에서 현재 측정 조건 설정</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                    <span><strong>측정 진행:</strong> 시작 → 작업 수행 → 랩타임 기록</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                    <span><strong>결과 확인:</strong> 실시간 분석 결과 및 상세 분석 페이지 활용</span>
                  </li>
                </ol>
              </div>

              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>세션 설정 가이드</h3>
                <div className={`${theme.surface} p-4 rounded-lg`}>
                  <ul className={`space-y-2 ${theme.textSecondary}`}>
                    <li>• <strong>측정자 2명 이상:</strong> 재현성(Reproducibility) 분석 가능</li>
                    <li>• <strong>대상자 5개 이상:</strong> 대상자간 변동성 분석 가능</li>
                    <li>• <strong>최소 10회 측정:</strong> 엄격한 MSA 규격 준수 (권장)</li>
                    <li>• <strong>각 조건별 2-3회:</strong> 신뢰성 있는 분석 결과</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>측정 팁</h3>
                <ul className={`space-y-1 ${theme.textSecondary}`}>
                  <li>• 일정한 환경에서 측정하여 외부 변수 최소화</li>
                  <li>• 측정자 간 표준화된 방법 사전 합의</li>
                  <li>• 대상자는 가능한 다양한 범위로 선정</li>
                  <li>• 측정 순서를 무작위로 진행하여 편향 방지</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>타이머 제어</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${theme.text}`}>스페이스바</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Space</kbd>
                    </div>
                    <p className={`text-sm ${theme.textMuted}`}>타이머 시작/정지</p>
                  </div>
                  
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${theme.text}`}>엔터</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd>
                    </div>
                    <p className={`text-sm ${theme.textMuted}`}>측정 완료 (랩타임 기록)</p>
                  </div>
                  
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${theme.text}`}>ESC</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
                    </div>
                    <p className={`text-sm ${theme.textMuted}`}>타이머 중지</p>
                  </div>
                  
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${theme.text}`}>R키</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">R</kbd>
                    </div>
                    <p className={`text-sm ${theme.textMuted}`}>타이머 리셋</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>일반 단축키</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${theme.text}`}>도움말</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">F1</kbd>
                    </div>
                    <p className={`text-sm ${theme.textMuted}`}>이 도움말 창 열기</p>
                  </div>
                  
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${theme.text}`}>데이터 내보내기</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+E</kbd>
                    </div>
                    <p className={`text-sm ${theme.textMuted}`}>CSV 파일 다운로드</p>
                  </div>
                </div>
              </div>

              <div className={`${theme.surface} p-4 rounded-lg`}>
                <h4 className={`font-medium ${theme.text} mb-2`}>💡 단축키 사용 팁</h4>
                <ul className={`space-y-1 text-sm ${theme.textSecondary}`}>
                  <li>• 입력 필드에 포커스가 있을 때는 단축키가 비활성화됩니다</li>
                  <li>• 모달창이 열려있을 때는 일부 단축키가 제한됩니다</li>
                  <li>• 세션이 생성되어야 타이머 관련 단축키를 사용할 수 있습니다</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>Gage R&R 분석 개요</h3>
                <p className={`${theme.textSecondary} mb-4`}>
                  Gage R&R(Gauge Repeatability & Reproducibility)은 측정 시스템의 정확성과 정밀성을 평가하는 통계적 방법입니다.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <h4 className={`font-medium ${theme.text} mb-2`}>반복성 (Repeatability)</h4>
                    <p className={`text-sm ${theme.textMuted}`}>
                      동일한 측정자가 동일한 조건에서 같은 대상을 반복 측정할 때의 변동
                    </p>
                  </div>
                  
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <h4 className={`font-medium ${theme.text} mb-2`}>재현성 (Reproducibility)</h4>
                    <p className={`text-sm ${theme.textMuted}`}>
                      서로 다른 측정자가 같은 대상을 측정할 때 발생하는 변동
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>평가 기준표</h3>
                <div className="overflow-x-auto">
                  <table className={`w-full text-sm border ${theme.border}`}>
                    <thead className={`${theme.surface}`}>
                      <tr>
                        <th className={`p-3 text-left ${theme.text} border-b ${theme.border}`}>구분</th>
                        <th className={`p-3 text-center ${theme.text} border-b ${theme.border}`}>R&R 비율</th>
                        <th className={`p-3 text-center ${theme.text} border-b ${theme.border}`}>NDC</th>
                        <th className={`p-3 text-center ${theme.text} border-b ${theme.border}`}>평가</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={`border-b ${theme.border}`}>
                        <td className={`p-3 ${theme.text}`}>우수</td>
                        <td className={`p-3 text-center ${theme.textSecondary}`}>&lt; 10%</td>
                        <td className={`p-3 text-center ${theme.textSecondary}`}>≥ 5</td>
                        <td className={`p-3 text-center`}>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">측정시스템 우수</span>
                        </td>
                      </tr>
                      <tr className={`border-b ${theme.border}`}>
                        <td className={`p-3 ${theme.text}`}>허용가능</td>
                        <td className={`p-3 text-center ${theme.textSecondary}`}>10-30%</td>
                        <td className={`p-3 text-center ${theme.textSecondary}`}>≥ 5</td>
                        <td className={`p-3 text-center`}>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">사용 가능</span>
                        </td>
                      </tr>
                      <tr className={`border-b ${theme.border}`}>
                        <td className={`p-3 ${theme.text}`}>제한적</td>
                        <td className={`p-3 text-center ${theme.textSecondary}`}>30-50%</td>
                        <td className={`p-3 text-center ${theme.textSecondary}`}>&lt; 5</td>
                        <td className={`p-3 text-center`}>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">제한적 사용</span>
                        </td>
                      </tr>
                      <tr>
                        <td className={`p-3 ${theme.text}`}>불가</td>
                        <td className={`p-3 text-center ${theme.textSecondary}`}>&gt; 50%</td>
                        <td className={`p-3 text-center ${theme.textSecondary}`}>&lt; 5</td>
                        <td className={`p-3 text-center`}>
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">즉시 개선 필요</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>추가 지표 설명</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <h4 className={`font-medium ${theme.text} mb-2`}>P/T 비율</h4>
                    <p className={`text-sm ${theme.textMuted} mb-2`}>
                      정밀도 대 공차 비율로 측정 정밀도를 평가
                    </p>
                    <p className={`text-xs ${theme.textMuted}`}>&lt; 0.1: 양호, &gt; 0.3: 개선 필요</p>
                  </div>
                  
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <h4 className={`font-medium ${theme.text} mb-2`}>Cpk (공정능력지수)</h4>
                    <p className={`text-sm ${theme.textMuted} mb-2`}>
                      공정의 능력과 규격과의 관계를 나타내는 지수
                    </p>
                    <p className={`text-xs ${theme.textMuted}`}>≥ 1.33: 양호, &lt; 1.0: 부족</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>내보내기 옵션</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <h4 className={`font-medium ${theme.text} mb-2`}>CSV 데이터</h4>
                    <p className={`text-sm ${theme.textMuted} mb-3`}>
                      원시 측정 데이터를 엑셀에서 열 수 있는 CSV 형식으로 내보내기
                    </p>
                    <ul className={`text-xs ${theme.textMuted} space-y-1`}>
                      <li>• UTF-8 BOM 인코딩으로 한글 호환</li>
                      <li>• 측정 시간, 측정자, 대상자 정보 포함</li>
                      <li>• 엑셀에서 바로 열기 가능</li>
                    </ul>
                  </div>
                  
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <h4 className={`font-medium ${theme.text} mb-2`}>상세 분석 보고서</h4>
                    <p className={`text-sm ${theme.textMuted} mb-3`}>
                      Gage R&R 분석 결과와 통계 데이터를 포함한 종합 보고서
                    </p>
                    <ul className={`text-xs ${theme.textMuted} space-y-1`}>
                      <li>• MSA 분석 결과 및 해석</li>
                      <li>• 권장사항 및 개선 방향</li>
                      <li>• 신뢰구간 및 통계 검정 결과</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>파일 구조</h3>
                <div className={`${theme.surface} p-4 rounded-lg`}>
                  <h4 className={`font-medium ${theme.text} mb-2`}>CSV 파일 구조</h4>
                  <div className="overflow-x-auto">
                    <table className={`w-full text-xs border ${theme.border}`}>
                      <thead>
                        <tr className={`bg-gray-50 dark:bg-gray-700`}>
                          <th className={`p-2 text-left ${theme.text} border ${theme.border}`}>컬럼명</th>
                          <th className={`p-2 text-left ${theme.text} border ${theme.border}`}>설명</th>
                          <th className={`p-2 text-left ${theme.text} border ${theme.border}`}>예시</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className={`p-2 ${theme.textSecondary} border ${theme.border}`}>측정번호</td>
                          <td className={`p-2 ${theme.textSecondary} border ${theme.border}`}>순차적 측정 번호</td>
                          <td className={`p-2 ${theme.textMuted} border ${theme.border}`}>1, 2, 3...</td>
                        </tr>
                        <tr>
                          <td className={`p-2 ${theme.textSecondary} border ${theme.border}`}>측정시간</td>
                          <td className={`p-2 ${theme.textSecondary} border ${theme.border}`}>측정된 시간 (초)</td>
                          <td className={`p-2 ${theme.textMuted} border ${theme.border}`}>45.23</td>
                        </tr>
                        <tr>
                          <td className={`p-2 ${theme.textSecondary} border ${theme.border}`}>측정자</td>
                          <td className={`p-2 ${theme.textSecondary} border ${theme.border}`}>측정 수행자</td>
                          <td className={`p-2 ${theme.textMuted} border ${theme.border}`}>6급 조봉근</td>
                        </tr>
                        <tr>
                          <td className={`p-2 ${theme.textSecondary} border ${theme.border}`}>대상자</td>
                          <td className={`p-2 ${theme.textSecondary} border ${theme.border}`}>측정 대상</td>
                          <td className={`p-2 ${theme.textMuted} border ${theme.border}`}>7급 김공군</td>
                        </tr>
                        <tr>
                          <td className={`p-2 ${theme.textSecondary} border ${theme.border}`}>타임스탬프</td>
                          <td className={`p-2 ${theme.textSecondary} border ${theme.border}`}>측정 일시</td>
                          <td className={`p-2 ${theme.textMuted} border ${theme.border}`}>2025-06-09 14:30:25</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={`text-lg font-semibold ${theme.text} mb-3`}>활용 방법</h3>
                <div className="space-y-3">
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <h4 className={`font-medium ${theme.text} mb-2`}>📊 엑셀 분석</h4>
                    <p className={`text-sm ${theme.textMuted}`}>
                      내보낸 CSV 파일을 엑셀에서 열어 추가적인 통계 분석이나 그래프 작성이 가능합니다.
                    </p>
                  </div>
                  
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <h4 className={`font-medium ${theme.text} mb-2`}>📋 보고서 작성</h4>
                    <p className={`text-sm ${theme.textMuted}`}>
                      상세 분석 결과를 활용하여 업무 개선 보고서나 품질 관리 문서를 작성할 수 있습니다.
                    </p>
                  </div>
                  
                  <div className={`${theme.surface} p-4 rounded-lg`}>
                    <h4 className={`font-medium ${theme.text} mb-2`}>🔄 데이터 백업</h4>
                    <p className={`text-sm ${theme.textMuted}`}>
                      정기적으로 데이터를 내보내어 중요한 측정 기록을 안전하게 보관할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
