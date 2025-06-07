import { IDependencyContainer } from '../interfaces/IDependencies';

class SimpleDependencyContainer implements IDependencyContainer {
  private static instance: SimpleDependencyContainer;

  static getInstance(): SimpleDependencyContainer {
    if (!SimpleDependencyContainer.instance) {
      SimpleDependencyContainer.instance = new SimpleDependencyContainer();
    }
    return SimpleDependencyContainer.instance;
  }

  get storage() {
    return {
      async getItem<T>(key: string): Promise<T | null> {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        } catch {
          return null;
        }
      },
      async setItem<T>(key: string, value: T): Promise<void> {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // 무시
        }
      },
      async removeItem(key: string): Promise<void> {
        try {
          localStorage.removeItem(key);
        } catch {
          // 무시
        }
      }
    };
  }

  get logger() {
    return {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {}
    };
  }
}

export const DependencyContainer = SimpleDependencyContainer;
