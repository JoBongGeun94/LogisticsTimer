
/**
 * 저장소 키 관리 인터페이스 (Interface Segregation Principle)
 */
interface IStorageKeyManager {
  getKey(keyType: string): string;
  getAllKeys(): string[];
}

/**
 * 저장소 작업 인터페이스 (Interface Segregation Principle)
 */
interface IStorageOperations {
  save<T>(key: string, data: T): boolean;
  load<T>(key: string): T | null;
  remove(key: string): boolean;
  clear(): boolean;
}

/**
 * 🔧 캐싱 저장소 인터페이스 (성능 최적화)
 */
interface ICachedStorageOperations extends IStorageOperations {
  getCachedData<T>(key: string): T | null;
  setCachedData<T>(key: string, data: T): void;
  invalidateCache(key?: string): void;
}

/**
 * 저장소 검증 인터페이스 (Interface Segregation Principle)
 */
interface IStorageValidator {
  isValidKey(key: string): boolean;
  isValidData<T>(data: T): boolean;
}

/**
 * 저장소 키 관리자 (Single Responsibility Principle)
 */
class StorageKeyManager implements IStorageKeyManager {
  private static readonly STORAGE_KEYS = {
    SESSIONS: 'logistics_timer_sessions',
    CURRENT_SESSION: 'logistics_timer_current_session',
    THEME: 'logistics_timer_theme',
    SETTINGS: 'logistics_timer_settings',
    LAP_TIMES: 'logistics_timer_lap_times'
  } as const;

  getKey(keyType: string): string {
    const key = StorageKeyManager.STORAGE_KEYS[keyType as keyof typeof StorageKeyManager.STORAGE_KEYS];
    if (!key) {
      throw new Error(`Invalid storage key type: ${keyType}`);
    }
    return key;
  }

  getAllKeys(): string[] {
    return Object.values(StorageKeyManager.STORAGE_KEYS);
  }
}

/**
 * 저장소 검증자 (Single Responsibility Principle)
 */
class StorageValidator implements IStorageValidator {
  isValidKey(key: string): boolean {
    return typeof key === 'string' && key.trim().length > 0;
  }

  isValidData<T>(data: T): boolean {
    try {
      JSON.stringify(data);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 🔧 캐싱된 저장소 작업 구현체 (성능 최적화 + 동기화 보장)
 */
class CachedLocalStorageOperations implements ICachedStorageOperations {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분 TTL

  constructor(private validator: IStorageValidator) {}

  save<T>(key: string, data: T): boolean {
    try {
      if (!this.validator.isValidKey(key) || !this.validator.isValidData(data)) {
        return false;
      }

      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
      
      // 🔧 캐시 동기화 - 저장 시 즉시 캐시 업데이트
      this.setCachedData(key, data);
      
      return true;
    } catch (error) {
      console.error(`Failed to save data for key ${key}:`, error);
      return false;
    }
  }

  load<T>(key: string): T | null {
    try {
      if (!this.validator.isValidKey(key)) {
        return null;
      }

      // 🔧 캐시 우선 확인
      const cachedData = this.getCachedData<T>(key);
      if (cachedData !== null) {
        return cachedData;
      }

      // 캐시 미스 시 localStorage에서 로드
      const serializedData = localStorage.getItem(key);
      if (serializedData === null) return null;
      
      const data = JSON.parse(serializedData) as T;
      
      // 🔧 로드된 데이터를 캐시에 저장
      this.setCachedData(key, data);
      
      return data;
    } catch (error) {
      console.error(`Failed to load data for key ${key}:`, error);
      return null;
    }
  }

  remove(key: string): boolean {
    try {
      if (!this.validator.isValidKey(key)) {
        return false;
      }

      localStorage.removeItem(key);
      
      // 🔧 캐시에서도 제거
      this.cache.delete(key);
      
      return true;
    } catch (error) {
      console.error(`Failed to remove data for key ${key}:`, error);
      return false;
    }
  }

  clear(): boolean {
    try {
      localStorage.clear();
      
      // 🔧 캐시도 전체 클리어
      this.invalidateCache();
      
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  // 🔧 캐시 관련 메서드들
  getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // TTL 체크
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

/**
 * 저장소 팩토리 (Dependency Inversion Principle)
 */
class StorageFactory {
  static createKeyManager(): IStorageKeyManager {
    return new StorageKeyManager();
  }

  static createValidator(): IStorageValidator {
    return new StorageValidator();
  }

  static createOperations(): ICachedStorageOperations {
    return new CachedLocalStorageOperations(this.createValidator());
  }
}

/**
 * 🔧 통합 저장소 서비스 (Facade Pattern + 캐싱 최적화)
 */
export class StorageService {
  private static keyManager = StorageFactory.createKeyManager();
  private static operations = StorageFactory.createOperations();

  static saveData<T>(keyType: string, data: T): boolean {
    try {
      const key = this.keyManager.getKey(keyType);
      return this.operations.save(key, data);
    } catch (error) {
      console.error(`Failed to save data for key type ${keyType}:`, error);
      return false;
    }
  }

  static loadData<T>(keyType: string): T | null {
    try {
      const key = this.keyManager.getKey(keyType);
      return this.operations.load<T>(key);
    } catch (error) {
      console.error(`Failed to load data for key type ${keyType}:`, error);
      return null;
    }
  }

  static removeData(keyType: string): boolean {
    try {
      const key = this.keyManager.getKey(keyType);
      return this.operations.remove(key);
    } catch (error) {
      console.error(`Failed to remove data for key type ${keyType}:`, error);
      return false;
    }
  }

  static clearAllData(): boolean {
    try {
      return this.operations.clear();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  // 🔧 캐시 관리 메서드 추가
  static invalidateCache(keyType?: string): void {
    try {
      if (keyType) {
        const key = this.keyManager.getKey(keyType);
        this.operations.invalidateCache(key);
      } else {
        this.operations.invalidateCache();
      }
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
    }
  }

  // 직접 키 접근을 위한 유틸리티 메서드 (Open/Closed Principle)
  static saveDataWithKey<T>(key: string, data: T): boolean {
    return this.operations.save(key, data);
  }

  static loadDataWithKey<T>(key: string): T | null {
    return this.operations.load<T>(key);
  }

  static removeDataWithKey(key: string): boolean {
    return this.operations.remove(key);
  }
}
