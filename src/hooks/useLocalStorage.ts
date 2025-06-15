import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * 저장소 인터페이스 (Interface Segregation Principle)
 */
interface IStorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface IStorageSerializer<T> {
  serialize(value: T): string;
  deserialize(value: string): T;
}

interface IStorageErrorHandler {
  handleReadError(key: string, error: Error): void;
  handleWriteError(key: string, error: Error): void;
}

/**
 * LocalStorage 제공자 (Single Responsibility Principle)
 */
class LocalStorageProvider implements IStorageProvider {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  }
}

/**
 * JSON 직렬화기 (Single Responsibility Principle)
 */
class JSONSerializer<T> implements IStorageSerializer<T> {
  serialize(value: T): string {
    return JSON.stringify(value);
  }

  deserialize(value: string): T {
    return JSON.parse(value);
  }
}

/**
 * 저장소 에러 핸들러 (Single Responsibility Principle)
 */
class StorageErrorHandler implements IStorageErrorHandler {
  handleReadError(key: string, error: Error): void {
    console.warn(`LocalStorage 읽기 오류 (${key}):`, error);
  }

  handleWriteError(key: string, error: Error): void {
    console.warn(`LocalStorage 쓰기 오류 (${key}):`, error);
  }
}

/**
 * 값 비교기 (Single Responsibility Principle)
 */
class ValueComparator {
  static areEqual<T>(value1: T, value2: T): boolean {
    try {
      return JSON.stringify(value1) === JSON.stringify(value2);
    } catch {
      return value1 === value2;
    }
  }
}

/**
 * 저장소 팩토리 (Dependency Inversion Principle)
 */
class StorageFactory {
  static createStorageProvider(): IStorageProvider {
    return new LocalStorageProvider();
  }

  static createSerializer<T>(): IStorageSerializer<T> {
    return new JSONSerializer<T>();
  }

  static createErrorHandler(): IStorageErrorHandler {
    return new StorageErrorHandler();
  }
}

/**
 * 저장소 관리자 (Facade Pattern)
 */
class StorageManager<T> {
  private storageProvider: IStorageProvider;
  private serializer: IStorageSerializer<T>;
  private errorHandler: IStorageErrorHandler;

  constructor(
    storageProvider: IStorageProvider,
    serializer: IStorageSerializer<T>,
    errorHandler: IStorageErrorHandler
  ) {
    this.storageProvider = storageProvider;
    this.serializer = serializer;
    this.errorHandler = errorHandler;
  }

  read(key: string, defaultValue: T): T {
    try {
      const item = this.storageProvider.getItem(key);
      if (!item) return defaultValue;

      // 🔧 안전한 역직렬화
      try {
        return this.serializer.deserialize(item);
      } catch (deserializeError) {
        console.warn(`역직렬화 실패 (${key}):`, deserializeError);
        return defaultValue;
      }
    } catch (error) {
      this.errorHandler.handleReadError(key, error as Error);
      return defaultValue;
    }
  }

  write(key: string, value: T): boolean {
    try {
      const serializedValue = this.serializer.serialize(value);
      this.storageProvider.setItem(key, serializedValue);
      return true;
    } catch (error) {
      this.errorHandler.handleWriteError(key, error as Error);
      return false;
    }
  }
}

/**
 * SOLID 원칙 적용 LocalStorage 훅
 * SRP: 오직 LocalStorage 동기화만 담당
 * OCP: 타입 확장 가능
 * LSP: 상위 타입으로 대체 가능
 * ISP: 인터페이스 분리
 * DIP: 구체적 구현이 아닌 추상화에 의존
 */
export function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // 저장소 관리자 인스턴스 생성 (Open/Closed Principle)
  const storageManager = useRef<StorageManager<T>>(
    new StorageManager(
      StorageFactory.createStorageProvider(),
      StorageFactory.createSerializer<T>(),
      StorageFactory.createErrorHandler()
    )
  ).current;

  // 초기화 시에만 localStorage에서 읽기 (무한 루프 방지)
  const [storedValue, setStoredValue] = useState<T>(() => {
    return storageManager.read(key, initialValue);
  });

  // 이전 값 추적으로 불필요한 업데이트 방지
  const prevValueRef = useRef<T>(storedValue);

  // setValue 함수 메모이제이션 (dependency 변경 방지)
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;

    // 값이 동일하면 업데이트 생략 (무한 렌더링 방지)
    if (ValueComparator.areEqual(valueToStore, prevValueRef.current)) {
      return;
    }

    setStoredValue(valueToStore);
    prevValueRef.current = valueToStore;

    // localStorage에 저장
    storageManager.write(key, valueToStore);
  }, [key, storedValue, storageManager]);

  return [storedValue, setValue];
}