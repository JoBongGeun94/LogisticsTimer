export class StorageService {
  private static readonly STORAGE_KEYS = {
    SESSIONS: 'logistics_timer_sessions',
    CURRENT_SESSION: 'logistics_timer_current_session',
    THEME: 'logistics_timer_theme',
    SETTINGS: 'logistics_timer_settings'
  } as const;

  static saveData<T>(key: keyof typeof StorageService.STORAGE_KEYS, data: T): void {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(StorageService.STORAGE_KEYS[key], serializedData);
    } catch (error) {
      console.error(`Failed to save data for key ${key}:`, error);
    }
  }

  static loadData<T>(key: keyof typeof StorageService.STORAGE_KEYS): T | null {
    try {
      const serializedData = localStorage.getItem(StorageService.STORAGE_KEYS[key]);
      if (serializedData === null) return null;
      return JSON.parse(serializedData) as T;
    } catch (error) {
      console.error(`Failed to load data for key ${key}:`, error);
      return null;
    }
  }

  static removeData(key: keyof typeof StorageService.STORAGE_KEYS): void {
    try {
      localStorage.removeItem(StorageService.STORAGE_KEYS[key]);
    } catch (error) {
      console.error(`Failed to remove data for key ${key}:`, error);
    }
  }

  static clearAllData(): void {
    try {
      Object.values(StorageService.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }
}
