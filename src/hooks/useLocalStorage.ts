import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * SOLID 원칙 적용 LocalStorage 훅
 * SRP: 오직 LocalStorage 동기화만 담당
 * OCP: 타입 확장 가능
 * DIP: 구체적 구현이 아닌 추상화에 의존
 */
export function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // 초기화 시에만 localStorage에서 읽기 (무한 루프 방지)
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') return initialValue;
      
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`LocalStorage 읽기 오류 (${key}):`, error);
      return initialValue;
    }
  });

  // 이전 값 추적으로 불필요한 업데이트 방지
  const prevValueRef = useRef<T>(storedValue);

  // setValue 함수 메모이제이션 (dependency 변경 방지)
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // 값이 동일하면 업데이트 생략 (무한 렌더링 방지)
      if (JSON.stringify(valueToStore) === JSON.stringify(prevValueRef.current)) {
        return;
      }

      setStoredValue(valueToStore);
      prevValueRef.current = valueToStore;
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`LocalStorage 저장 오류 (${key}):`, error);
    }
  }, [key, storedValue]);

  // localStorage 변경 감지 (다른 탭에서의 변경)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          if (JSON.stringify(newValue) !== JSON.stringify(prevValueRef.current)) {
            setStoredValue(newValue);
            prevValueRef.current = newValue;
          }
        } catch (error) {
          console.warn(`LocalStorage 동기화 오류 (${key}):`, error);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [key]); // key만 dependency로 설정 (무한 루프 방지)

  return [storedValue, setValue];
}
