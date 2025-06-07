// components/Session/SessionModal.tsx - 세션 생성 모달 (SRP)
import React, { useState, useCallback } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { useSession } from '../../contexts/SessionContext';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Trash2 } from 'lucide-react';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (session: any) => void;
}

/**
 * 세션 생성 모달 컴포넌트
 * SRP: 세션 생성 폼 관리만 담당
 * ISP: 필요한 props만 받음
 */
export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const { createSession } = useSession();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    workType: '',
    operators: [''],
    targets: [''],
    usl: '',
    lsl: '',
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleArrayChange = useCallback(
    (field: 'operators' | 'targets', index: number, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: prev[field].map((item, i) => (i === index ? value : item)),
      }));
    },
    []
  );

  const addArrayItem = useCallback((field: 'operators' | 'targets') => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  }, []);

  const removeArrayItem = useCallback(
    (field: 'operators' | 'targets', index: number) => {
      setFormData((prev) => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index),
      }));
    },
    []
  );

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) {
      showToast('세션명을 입력해주세요.', 'error');
      return false;
    }
    if (!formData.workType.trim()) {
      showToast('작업 유형을 입력해주세요.', 'error');
      return false;
    }

    const validOperators = formData.operators.filter((op) => op.trim());
    if (validOperators.length === 0) {
      showToast('최소 1명의 측정자를 입력해주세요.', 'error');
      return false;
    }

    const validTargets = formData.targets.filter((tg) => tg.trim());
    if (validTargets.length === 0) {
      showToast('최소 1개의 대상자를 입력해주세요.', 'error');
      return false;
    }

    return true;
  }, [formData, showToast]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) return;

      setLoading(true);
      try {
        const sessionData = {
          name: formData.name.trim(),
          workType: formData.workType.trim(),
          operators: formData.operators.filter((op) => op.trim()),
          targets: formData.targets.filter((tg) => tg.trim()),
          usl: formData.usl ? parseFloat(formData.usl) : undefined,
          lsl: formData.lsl ? parseFloat(formData.lsl) : undefined,
        };

        const newSession = createSession(sessionData);
        onSessionCreated(newSession);

        // 폼 초기화
        setFormData({
          name: '',
          workType: '',
          operators: [''],
          targets: [''],
          usl: '',
          lsl: '',
        });
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : '세션 생성에 실패했습니다.',
          'error'
        );
      } finally {
        setLoading(false);
      }
    },
    [formData, validateForm, createSession, onSessionCreated, showToast]
  );

  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [loading, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="새 작업 세션 생성"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              세션명 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 포장 작업 측정"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              작업 유형 *
            </label>
            <input
              type="text"
              value={formData.workType}
              onChange={(e) => handleInputChange('workType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 박스 포장"
              required
            />
          </div>
        </div>

        {/* 규격 한계 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              상한 규격 (USL)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.usl}
              onChange={(e) => handleInputChange('usl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 30.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              하한 규격 (LSL)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.lsl}
              onChange={(e) => handleInputChange('lsl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 10.00"
            />
          </div>
        </div>

        {/* 측정자 목록 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              측정자 목록 *
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addArrayItem('operators')}
              icon={<Plus className="w-4 h-4" />}
            >
              추가
            </Button>
          </div>
          <div className="space-y-2">
            {formData.operators.map((operator, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={operator}
                  onChange={(e) =>
                    handleArrayChange('operators', index, e.target.value)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`측정자 ${index + 1}`}
                />
                {formData.operators.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('operators', index)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 대상자 목록 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              대상자 목록 *
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addArrayItem('targets')}
              icon={<Plus className="w-4 h-4" />}
            >
              추가
            </Button>
          </div>
          <div className="space-y-2">
            {formData.targets.map((target, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={target}
                  onChange={(e) =>
                    handleArrayChange('targets', index, e.target.value)
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`대상자 ${index + 1}`}
                />
                {formData.targets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('targets', index)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            세션 생성
          </Button>
        </div>
      </form>
    </Modal>
  );
};
