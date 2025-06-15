
import React from 'react';
import { X, Keyboard, Timer, BarChart3, Download, Info, Target, Users } from 'lucide-react';

interface HelpModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-600">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Info className="w-6 h-6 text-blue-500" />
              도움말 가이드
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 키보드 단축키 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-purple-500" />
                키보드 단축키
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { key: 'Space', action: '타이머 시작/정지', icon: Timer },
                  { key: 'Enter', action: '측정 완료 (랩타임 기록)', icon: Target },
                  { key: 'Esc', action: '타이머 중지', icon: Timer },
                  { key: 'R', action: '측정 기록 초기화', icon: Timer },
                  { key: 'F1', action: '도움말 열기', icon: Info }
                ].map(({ key, action, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{action}</span>
                    </div>
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </section>

            {/* 측정 가이드 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Timer className="w-5 h-5 text-green-500" />
                측정 가이드
              </h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">1. 세션 생성</h4>
                  <ul className="space-y-1 text-green-700 dark:text-green-400">
                    <li>• 측정자 2명 이상 설정 (재현성 분석용)</li>
                    <li>• 대상자 5개 이상 설정 (통계적 유의성 확보)</li>
                    <li>• 작업 유형별로 세션 구분 관리</li>
                  </ul>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">2. 측정 수행</h4>
                  <ul className="space-y-1 text-blue-700 dark:text-blue-400">
                    <li>• 각 조건별 최소 3-5회 반복 측정</li>
                    <li>• 측정자와 대상자를 번갈아가며 측정</li>
                    <li>• 일정한 간격으로 측정하여 편향 방지</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Gage R&R 분석 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                Gage R&R 분석 기준
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">Gage R&R %</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">평가</th>
                      <th className="text-left py-2 text-gray-700 dark:text-gray-300">권장사항</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 dark:text-gray-400">
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2">≤ 10%</td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          우수
                        </span>
                      </td>
                      <td className="py-2">모든 용도로 사용 가능</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2">10-30%</td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          양호
                        </span>
                      </td>
                      <td className="py-2">대부분 용도로 사용 가능</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2">30-50%</td>
                      <td className="py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          보통
                        </span>
                      </td>
                      <td className="py-2">제한적 사용, 개선 검토</td>
                    </tr>
                    <tr>
                      <td className="py-2">{`> 50%`}</td>
                      <td className="py-2"></td>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          불량
                        </span>
                      </td>
                      <td className="py-2">즉시 개선 필요</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 내보내기 기능 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-500" />
                데이터 내보내기
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">측정 기록 (CSV)</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    원시 측정 데이터를 CSV 형태로 다운로드하여 추가 분석에 활용할 수 있습니다.
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">분석 보고서 (CSV)</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gage R&R 분석 결과와 통계 지표를 포함한 상세 보고서를 다운로드할 수 있습니다.
                  </p>
                </div>
              </div>
            </section>

            {/* 문의 정보 */}
            <section className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                시스템 정보
              </h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                  <strong>공군 종합보급창 물류 작업현장 인시수 측정 시스템</strong><br />
                  MSA 규격 완전 준수 · SOLID 원칙 적용 · 다크모드 지원<br />
                  측정부터 분석까지 한번에 처리하는 통합 솔루션
                </p>
              </div>
            </section>
          </div>

          <div className="flex justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={onClose}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
