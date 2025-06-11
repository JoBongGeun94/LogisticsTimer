
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
 * 저장소 작업 구현체 (Single Responsibility Principle)
 */
class LocalStorageOperations implements IStorageOperations {
  constructor(private validator: IStorageValidator) {}

  save<T>(key: string, data: T): boolean {
    try {
      if (!this.validator.isValidKey(key) || !this.validator.isValidData(data)) {
        return false;
      }

      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
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

      const serializedData = localStorage.getItem(key);
      if (serializedData === null) return null;
      
      return JSON.parse(serializedData) as T;
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
      return true;
    } catch (error) {
      console.error(`Failed to remove data for key ${key}:`, error);
      return false;
    }
  }

  clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
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

  static createOperations(): IStorageOperations {
    return new LocalStorageOperations(this.createValidator());
  }
}

/**
 * 통합 저장소 서비스 (Facade Pattern + Open/Closed Principle)
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
