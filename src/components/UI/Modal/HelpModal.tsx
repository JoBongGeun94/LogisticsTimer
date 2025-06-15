
import React, { useState } from "react";
import { X, Book, Keyboard, BarChart3 } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("usage");

  if (!isOpen) return null;

  const tabs = [
    { id: "usage", label: "사용법", icon: <Book className="w-4 h-4" /> },
    {
      id: "shortcuts",
      label: "단축키",
      icon: <Keyboard className="w-4 h-4" />,
    },
    {
      id: "analysis",
      label: "Gage R&R",
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            도움말
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 -m-2"
            aria-label="닫기"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors flex-shrink-0 min-w-0 ${
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <span className="flex-shrink-0">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[65vh] sm:max-h-[60vh] text-gray-900 dark:text-gray-100">
          {activeTab === "usage" && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">기본 사용법</h3>
                <ol className="list-decimal list-inside space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                  <li>
                    <strong>세션 생성:</strong> "새 세션" 버튼을 클릭하여 측정
                    세션을 생성합니다.
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                      <li>세션명, 작업 유형, 측정자, 대상자를 설정</li>
                      <li>
                        Gage R&R 분석을 위해 최소 2명의 측정자와 5개의 대상자
                        권장
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>측정 진행:</strong> 측정자와 대상자를 선택한 후
                    타이머로 작업 시간을 측정합니다.
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                      <li>스페이스바로 타이머 시작/정지</li>
                      <li>Enter로 측정 완료 및 기록</li>
                      <li>0.01초 단위의 정밀한 측정</li>
                    </ul>
                  </li>
                  <li>
                    <strong>실시간 분석:</strong> 측정 진행과 동시에 실시간 통계
                    분석을 확인할 수 있습니다.
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                      <li>변동계수(CV), ICC, ΔPair 등 핵심 지표 표시</li>
                      <li>6회 이상 측정 시 Gage R&R 분석 가능</li>
                    </ul>
                  </li>
                  <li>
                    <strong>데이터 관리:</strong> 측정 기록을 효율적으로 관리할
                    수 있습니다.
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                      <li>측정자/대상자별 필터링</li>
                      <li>개별 측정 기록 삭제</li>
                      <li>세션별 기록 관리</li>
                    </ul>
                  </li>
                  <li>
                    <strong>분석 및 내보내기:</strong> 측정 결과를 분석하고
                    Excel로 내보낼 수 있습니다.
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                      <li>CSV: 기본 측정 데이터</li>
                      <li>분석: 상세한 Gage R&R 분석 보고서</li>
                      <li>상세: 모달에서 실시간 분석 결과 확인</li>
                    </ul>
                  </li>
                </ol>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  💡 사용 팁
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 각 조건별로 최소 3-5회 반복 측정을 권장합니다</li>
                  <li>• 측정 순서를 무작위로 배치하여 편향을 방지하세요</li>
                  <li>• 다크모드는 현장 작업 환경에 최적화되어 있습니다</li>
                  <li>• 뒤로가기 버튼 두 번 클릭으로 앱 종료가 가능합니다</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "shortcuts" && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">키보드 단축키</h3>
              <div className="space-y-2 sm:grid sm:gap-3">
                <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm sm:text-base">타이머 시작/정지</span>
                  <kbd className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs sm:text-sm font-mono flex-shrink-0">
                    스페이스바
                  </kbd>
                </div>
                <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm sm:text-base">측정 완료 (랩타임 기록)</span>
                  <kbd className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs sm:text-sm font-mono flex-shrink-0">
                    Enter
                  </kbd>
                </div>
                <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm sm:text-base">타이머 중지</span>
                  <kbd className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs sm:text-sm font-mono flex-shrink-0">
                    ESC
                  </kbd>
                </div>
                <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm sm:text-base">타이머 리셋 (전체 초기화)</span>
                  <kbd className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs sm:text-sm font-mono flex-shrink-0">
                    R
                  </kbd>
                </div>
                <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm sm:text-base">데이터 내보내기 (CSV)</span>
                  <kbd className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs sm:text-sm font-mono flex-shrink-0">
                    Ctrl + E
                  </kbd>
                </div>
                <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm sm:text-base">소개 페이지로 이동</span>
                  <kbd className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs sm:text-sm font-mono flex-shrink-0">
                    Ctrl + H
                  </kbd>
                </div>
                <div className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm sm:text-base">도움말 열기</span>
                  <kbd className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs sm:text-sm font-mono flex-shrink-0">
                    F1
                  </kbd>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 mt-4">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                  ⚠️ 주의사항
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  입력 필드에 포커스가 있을 때는 키보드 단축키가 비활성화됩니다.
                  단축키 사용 시 입력 필드 밖을 클릭한 후 사용하세요.
                </p>
              </div>
            </div>
          )}

          {activeTab === "analysis" && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">
                  Gage R&R 분석 이해하기
                </h3>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 leading-relaxed">
                  Gage R&R(Gage Repeatability and Reproducibility)은
                  측정시스템의 변동을 평가하는 통계적 방법으로, 측정의 정확성과
                  일관성을 확인하는 데 사용됩니다.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-3">📊 핵심 지표 설명</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h5 className="font-medium mb-1">Gage R&R (%)</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      전체 변동 중 측정시스템에 의한 변동의 비율
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h5 className="font-medium mb-1">ICC (급내상관계수)</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      측정자 간 일관성을 나타내는 지표 (0~1, 높을수록 좋음)
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h5 className="font-medium mb-1">ΔPair (초)</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      연속 측정값 간의 차이 (작을수록 일관성 높음)
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h5 className="font-medium mb-1">변동계수 (CV %)</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      평균 대비 표준편차의 비율 (12% 이하 권장)
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">📋 평가 기준</h4>
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-xs sm:text-sm border-collapse min-w-[480px] sm:min-w-0">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left border dark:border-gray-600">
                          R&R 비율
                        </th>
                        <th className="px-3 py-2 text-left border dark:border-gray-600">
                          평가
                        </th>
                        <th className="px-3 py-2 text-left border dark:border-gray-600">
                          권장사항
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t dark:border-gray-600">
                        <td className="px-3 py-2 border dark:border-gray-600">
                          &lt; 10%
                        </td>
                        <td className="px-3 py-2 border dark:border-gray-600">
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            ✅ 우수
                          </span>
                        </td>
                        <td className="px-3 py-2 border dark:border-gray-600">
                          모든 측정에 사용 권장
                        </td>
                      </tr>
                      <tr className="border-t dark:border-gray-600">
                        <td className="px-3 py-2 border dark:border-gray-600">
                          10-30%
                        </td>
                        <td className="px-3 py-2 border dark:border-gray-600">
                          <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                            👍 양호
                          </span>
                        </td>
                        <td className="px-3 py-2 border dark:border-gray-600">
                          대부분 용도로 사용 가능
                        </td>
                      </tr>
                      <tr className="border-t dark:border-gray-600">
                        <td className="px-3 py-2 border dark:border-gray-600">
                          30-50%
                        </td>
                        <td className="px-3 py-2 border dark:border-gray-600">
                          <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                            ⚠️ 보통
                          </span>
                        </td>
                        <td className="px-3 py-2 border dark:border-gray-600">
                          제한적 사용, 개선 필요
                        </td>
                      </tr>
                      <tr className="border-t dark:border-gray-600">
                        <td className="px-3 py-2 border dark:border-gray-600">
                          &gt; 50%
                        </td>
                        <td className="px-3 py-2 border dark:border-gray-600">
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                            ❌ 불량
                          </span>
                        </td>
                        <td className="px-3 py-2 border dark:border-gray-600">
                          즉시 개선 필요
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🎯 분석 조건</h4>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                    <li>
                      <strong>최소 요구사항:</strong> 측정자 2명 이상, 대상자
                      5개 이상, 총 6회 이상 측정
                    </li>
                    <li>
                      <strong>권장 측정:</strong> 각 조건별 3-5회 반복으로 총
                      30-50회 측정
                    </li>
                    <li>
                      <strong>측정 순서:</strong> 무작위 배치로 편향 최소화
                    </li>
                    <li>
                      <strong>환경 조건:</strong> 동일한 측정 환경 및 도구 사용
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              더 자세한 도움이 필요하시면 경영혁신실에 문의하세요.
            </div>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium min-w-[80px]"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
