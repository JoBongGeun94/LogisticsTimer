import React, { memo } from 'react';
import { X, Keyboard, Timer, BarChart3, Download, Info } from 'lucide-react';

interface HelpModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const HelpModal = memo<HelpModalProps>(({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-600">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              📚 사용 가이드
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 키보드 단축키 */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Keyboard className="w-5 h-5" />
                키보드 단축키
              </h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">타이머 시작/정지</span>
                  <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">스페이스바</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">측정 완료</span>
                  <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Enter</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">타이머 리셋</span>
                  <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">R</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">도움말 열기</span>
                  <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">F1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">타이머 중지</span>
                  <span className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-xs font-mono">Escape</span>
                </div>
              </div>
            </div>

            {/* 측정 절차 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Timer className="w-5 h-5" />
                측정 절차
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>새 세션 생성 (최소 측정자 2명, 대상자 5개 권장)</li>
                <li>측정자와 대상자를 선택</li>
                <li>스페이스바로 타이머 시작</li>
                <li>작업 완료 후 Enter로 측정 기록</li>
                <li>같은 조건으로 3-5회 반복 측정</li>
                <li>분석 결과 확인 및 Excel 다운로드</li>
              </ol>
            </div>

            {/* Gage R&R 분석 */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Gage R&R 분석 기준
              </h4>
              <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium">우수 (&lt;10%)</div>
                    <div className="text-xs">모든 측정에 신뢰 가능</div>
                  </div>
                  <div>
                    <div className="font-medium">양호 (10-30%)</div>
                    <div className="text-xs">대부분 용도로 사용 가능</div>
                  </div>
                  <div>
                    <div className="font-medium">보통 (30-50%)</div>
                    <div className="text-xs">제한적 사용 권장</div>
                  </div>
                  <div>
                    <div className="font-medium">불량 (&gt;50%)</div>
                    <div className="text-xs">측정 시스템 개선 필요</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 내보내기 기능 */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
              <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                <Download className="w-5 h-5" />
                데이터 내보내기
              </h4>
              <div className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                <div>
                  <span className="font-medium">CSV 버튼:</span> 측정 기록 원시 데이터
                </div>
                <div>
                  <span className="font-medium">분석 버튼:</span> Gage R&R 상세 분석 보고서
                </div>
                <div>
                  <span className="font-medium">상세 버튼:</span> 실시간 분석 결과 확인
                </div>
              </div>
            </div>

            {/* 팁과 권장사항 */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                팁과 권장사항
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                <li>각 조건별 최소 3회, 권장 5회 측정</li>
                <li>측정자 교육을 통한 재현성 향상</li>
                <li>일정한 측정 환경 유지</li>
                <li>정기적인 장비 점검 및 교정</li>
                <li>변동계수 12% 이하 목표</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});