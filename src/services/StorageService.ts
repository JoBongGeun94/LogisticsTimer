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
  private cache = new Map<string, { data: any; timestamp: number; accessCount: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 🔧 10분 TTL로 연장 (성능 최적화)
  private readonly MAX_CACHE_SIZE = 50; // 🔧 최대 캐시 크기 제한

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

    // 🔧 LRU 갱신 (접근 횟수 증가)
    cached.accessCount++;
    cached.timestamp = now; // 액세스 시간 갱신

    return cached.data as T;
  }

  setCachedData<T>(key: string, data: T): void {
    // 🔧 캐시 크기 관리 (LRU 방식으로 제거)
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  // 🔧 LRU 캐시 제거 로직
  private evictLeastRecentlyUsed(): void {
    let lruKey = '';
    let oldestTime = Date.now();
    let lowestAccess = Infinity;

    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime || 
         (value.timestamp === oldestTime && value.accessCount < lowestAccess)) {
        oldestTime = value.timestamp;
        lowestAccess = value.accessCount;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      console.log(`🗑️ LRU 캐시 제거: ${lruKey}`);
    }
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
  private static readonly CACHE_PREFIX = 'logistics_timer_cache_';
  private static readonly CACHE_EXPIRY = 30 * 60 * 1000; // 30분

  static setCache<T>(key: string, data: T): void {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const cacheData = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + this.CACHE_EXPIRY
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('캐시 저장 실패:', error);
    }
  }

  static getCache<T>(key: string): T | null {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) return null;

      // 🔧 안전한 JSON 파싱 
      let cacheData;
      try {
        cacheData = JSON.parse(cached);
      } catch (parseError) {
        console.warn('캐시 파싱 실패:', parseError);
        localStorage.removeItem(cacheKey); // 손상된 캐시 제거
        return null;
      }

      // 캐시 데이터 구조 검증
      if (!cacheData || typeof cacheData !== 'object' || !cacheData.hasOwnProperty('expiry')) {
        localStorage.removeItem(cacheKey); // 잘못된 구조 제거
        return null;
      }

      // 만료 확인
      if (Date.now() > cacheData.expiry) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('캐시 로드 실패:', error);
      return null;
    }
  }

  static clearCache(key?: string): void {
    try {
      if (key) {
        const cacheKey = this.CACHE_PREFIX + key;
        localStorage.removeItem(cacheKey);
      } else {
        // 모든 캐시 제거
        Object.keys(localStorage)
          .filter(k => k.startsWith(this.CACHE_PREFIX))
          .forEach(k => localStorage.removeItem(k));
      }
    } catch (error) {
      console.warn('캐시 정리 실패:', error);
    }
  }

  // 🔧 캐시 무효화 구현 - 전역 분석 캐시 초기화
  static invalidateCache(): void {
    try {
      // 분석 관련 캐시 무효화
      const analysisKeys = ['analysisCache', 'statisticsCache', 'gageRRCache'];

      analysisKeys.forEach(key => {
        const cacheKey = this.CACHE_PREFIX + key;
        localStorage.removeItem(cacheKey);
      });

      // 직접 설정된 분석 캐시도 제거
      localStorage.removeItem('analysisCache');

      console.log('🔄 전역 분석 캐시 무효화 완료');
    } catch (error) {
      console.warn('캐시 무효화 실패:', error);
    }
  }

  // 🔧 세션별 캐시 무효화
  static invalidateSessionCache(sessionId: string): void {
    try {
      const sessionKeys = [`session_${sessionId}`, `analysis_${sessionId}`, `statistics_${sessionId}`];

      sessionKeys.forEach(key => {
        const cacheKey = this.CACHE_PREFIX + key;
        localStorage.removeItem(cacheKey);
      });

      console.log(`🔄 세션 ${sessionId} 캐시 무효화 완료`);
    } catch (error) {
      console.warn('세션 캐시 무효화 실패:', error);
    }
  }

  // 🔧 만료된 캐시 정리 - 예외 처리 강화
  static cleanExpiredCache(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];

      // localStorage 키 안전하게 순회
      const localStorageKeys = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) localStorageKeys.push(key);
        }
      } catch (error) {
        console.warn('localStorage 키 순회 실패:', error);
        return;
      }

      localStorageKeys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              let cacheData;
              try {
                cacheData = JSON.parse(cached);
                // 구조 검증
                if (cacheData && typeof cacheData === 'object' && 
                    typeof cacheData.expiry === 'number' && 
                    now > cacheData.expiry) {
                  keysToRemove.push(key);
                }
              } catch (parseError) {
                // 파싱 오류가 있는 캐시도 제거
                keysToRemove.push(key);
              }
            }
          } catch (error) {
            // 액세스 오류가 있는 캐시도 제거
            keysToRemove.push(key);
          }
        }
      });

      // 안전한 키 제거
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`캐시 키 제거 실패: ${key}`, error);
        }
      });

      if (keysToRemove.length > 0) {
        console.log(`🔄 만료된 캐시 ${keysToRemove.length}개 정리 완료`);
      }
    } catch (error) {
      console.warn('만료된 캐시 정리 실패:', error);
    }
  }
}