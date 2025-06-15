
import React, { memo } from 'react';
import { X, Book, Keyboard, BarChart3, Info, Timer, Users, Target } from 'lucide-react';
import { Theme } from '../../../types';

interface HelpModalProps {
  isVisible: boolean;
  onClose: () => void;
  theme: Theme;
  isDark: boolean;
}

const HelpModal = memo<HelpModalProps>(({ isVisible, onClose, theme, isDark }) => {
  if (!isVisible) return null;

  const shortcuts = [
    { key: '스페이스바', action: '타이머 시작/정지', icon: Timer },
    { key: 'Enter', action: '측정 완료 (랩타임)', icon: Target },
    { key: 'Escape', action: '타이머 중지', icon: X },
    { key: 'R', action: '타이머 리셋', icon: BarChart3 }
  ];

  const features = [
    {
      title: '정밀 측정',
      description: '밀리초 단위의 정확한 시간 측정',
      icon: Timer
    },
    {
      title: 'Gage R&R 분석',
      description: 'MSA 규격 준수 측정시스템 분석',
      icon: BarChart3
    },
    {
      title: '세션 관리',
      description: '측정자별, 대상자별 체계적 관리',
      icon: Users
    },
    {
      title: '데이터 내보내기',
      description: 'Excel 형태로 측정 데이터 다운로드',
      icon: Book
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${theme.card} rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border ${theme.border}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <Book className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-xl font-bold ${theme.text}`}>도움말 및 사용법</h3>
            </div>
            <button
              onClick={onClose}
              className={`${theme.textMuted} hover:${theme.textSecondary} transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 키보드 단축키 */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Keyboard className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                <h4 className={`font-semibold ${theme.text}`}>키보드 단축키</h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {shortcuts.map((shortcut, index) => {
                  const Icon = shortcut.icon;
                  return (
                    <div key={index} className={`${theme.surface} p-3 rounded-lg border ${theme.border} flex items-center justify-between`}>
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${theme.textMuted}`} />
                        <span className={`text-sm ${theme.text}`}>{shortcut.action}</span>
                      </div>
                      <kbd className={`px-2 py-1 text-xs font-mono rounded border ${theme.border} ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        {shortcut.key}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 주요 기능 */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                <h4 className={`font-semibold ${theme.text}`}>주요 기능</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className={`${theme.surface} p-4 rounded-lg border ${theme.border}`}>
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                          <Icon className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <div>
                          <h5 className={`font-medium ${theme.text} mb-1`}>{feature.title}</h5>
                          <p className={`text-xs ${theme.textMuted}`}>{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gage R&R 분석 조건 */}
            <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg border`}>
              <div className="flex items-center space-x-2 mb-3">
                <Info className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <h4 className={`font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Gage R&R 분석 조건</h4>
              </div>
              <ul className={`${isDark ? 'text-blue-300' : 'text-blue-700'} space-y-1 text-sm`}>
                <li>• 최소 6회 측정 (권장: 10회 이상)</li>
                <li>• 측정자 2명 이상</li>
                <li>• 대상자 5개 이상</li>
                <li>• 각 조건별 2-3회 반복 측정</li>
              </ul>
            </div>

            {/* 사용 순서 */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Target className={`w-5 h-5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                <h4 className={`font-semibold ${theme.text}`}>사용 순서</h4>
              </div>
              <ol className={`space-y-2 text-sm ${theme.textSecondary}`}>
                <li className="flex items-start space-x-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'} flex-shrink-0 mt-0.5`}>1</span>
                  <span>새 세션을 생성하고 측정자/대상자를 설정합니다</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'} flex-shrink-0 mt-0.5`}>2</span>
                  <span>측정할 측정자와 대상자를 선택합니다</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'} flex-shrink-0 mt-0.5`}>3</span>
                  <span>스페이스바로 타이머를 시작하고 Enter로 측정을 완료합니다</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'} flex-shrink-0 mt-0.5`}>4</span>
                  <span>충분한 데이터 수집 후 분석 결과를 확인합니다</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'} flex-shrink-0 mt-0.5`}>5</span>
                  <span>필요시 CSV나 분석 보고서를 다운로드합니다</span>
                </li>
              </ol>
            </div>
          </div>

          <div className="flex justify-end mt-6">
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
});

export default HelpModal;
