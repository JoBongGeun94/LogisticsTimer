import {
  IStorageRepository,
  ICalculationEngine,
  IExportService,
  ILogger,
  IDependencyContainer,
} from '../interfaces/IDependencies';
// implementations/StorageRepository.ts - 구체적 구현체

/**
 * 로컬 스토리지 구현체 (LSP)
 * IStorageRepository 인터페이스의 모든 규약 준수
 */
export class LocalStorageRepository implements IStorageRepository {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      throw error;
    }
  }
}

/**
 * 메모리 스토리지 구현체 (LSP)
 * IStorageRepository 인터페이스의 완전한 대체 가능
 */
export class InMemoryStorageRepository implements IStorageRepository {
  private storage = new Map<string, string>();

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const item = this.storage.get(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      this.storage.set(key, JSON.stringify(value));
    } catch (error) {
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

/**
 * Gage R&R 계산 엔진 구현체 (SRP, OCP)
 * 단일 책임: 측정시스템분석 계산만 담당
 * 확장 개방: 새로운 계산 방법 추가 시 기존 코드 수정 불필요
 */
export class GageRRCalculationEngine implements ICalculationEngine {
  private readonly ACCEPTABLE_GAGE_RR_THRESHOLD = 0.3;

  calculateGageRR(measurements: number[][]): {
    repeatability: number;
    reproducibility: number;
    gageRR: number;
    isAcceptable: boolean;
  } {
    if (!measurements.length || !measurements[0]?.length) {
      throw new Error('Invalid measurement data');
    }

    const repeatability = this.calculateRepeatability(measurements);
    const reproducibility = this.calculateReproducibility(measurements);
    const gageRR = Math.sqrt(repeatability ** 2 + reproducibility ** 2);

    return {
      repeatability,
      reproducibility,
      gageRR,
      isAcceptable: gageRR <= this.ACCEPTABLE_GAGE_RR_THRESHOLD,
    };
  }

  calculateStatistics(values: number[]): {
    mean: number;
    standardDeviation: number;
    variance: number;
  } {
    if (!values.length) {
      throw new Error('Cannot calculate statistics for empty array');
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + (val - mean) ** 2, 0) /
      (values.length - 1);
    const standardDeviation = Math.sqrt(variance);

    return { mean, standardDeviation, variance };
  }

  private calculateRepeatability(measurements: number[][]): number {
    // Gage R&R 반복성 계산 로직
    const withinGroupVariances = measurements.map((group) => {
      if (group.length < 2) return 0;
      const stats = this.calculateStatistics(group);
      return stats.variance;
    });

    const avgWithinGroupVariance =
      withinGroupVariances.reduce((sum, v) => sum + v, 0) /
      withinGroupVariances.length;
    return Math.sqrt(avgWithinGroupVariance);
  }

  private calculateReproducibility(measurements: number[][]): number {
    // Gage R&R 재현성 계산 로직
    const groupMeans = measurements.map((group) => {
      const stats = this.calculateStatistics(group);
      return stats.mean;
    });

    const overallMean =
      groupMeans.reduce((sum, mean) => sum + mean, 0) / groupMeans.length;
    const betweenGroupVariance =
      groupMeans.reduce((sum, mean) => sum + (mean - overallMean) ** 2, 0) /
      (groupMeans.length - 1);

    return Math.sqrt(betweenGroupVariance);
  }
}

/**
 * 안전한 파일 내보내기 서비스 (SRP, ISP)
 * 단일 책임: 파일 내보내기만 담당
 * 인터페이스 분리: 필요한 메서드만 구현
 */
export class SafeExportService implements IExportService {
  async exportToCSV(data: any[][], filename: string): Promise<boolean> {
    try {
      const csvContent = this.convertToCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, filename);
      return true;
    } catch (error) {
      return false;
    }
  }

  async exportToJSON(data: object, filename: string): Promise<boolean> {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      this.downloadBlob(blob, filename);
      return true;
    } catch (error) {
      return false;
    }
  }

  private convertToCSV(data: any[][]): string {
    return data
      .map((row) =>
        row
          .map((cell) =>
            typeof cell === 'string' &&
            (cell.includes(',') || cell.includes('"'))
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(',')
      )
      .join('\n');
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * 콘솔 로거 구현체 (LSP)
 * ILogger 인터페이스 완전 준수
 */
export class ConsoleLogger implements ILogger {
  debug(message: string, meta?: object): void {
  }

  info(message: string, meta?: object): void {
  }

  warn(message: string, meta?: object): void {
  }

  error(message: string, error?: Error): void {
  }
}

/**
 * 의존성 컨테이너 (DIP, 싱글톤 패턴)
 * 모든 의존성을 중앙에서 관리
 */
export class DependencyContainer implements IDependencyContainer {
  private static instance: DependencyContainer;

  public readonly storage: IStorageRepository;
  public readonly calculator: ICalculationEngine;
  public readonly exporter: IExportService;
  public readonly logger: ILogger;

  private constructor() {
    // 런타임 환경에 따른 구현체 선택
    this.storage =
      typeof window !== 'undefined' && window.localStorage
        ? new LocalStorageRepository()
        : new InMemoryStorageRepository();

    this.calculator = new GageRRCalculationEngine();
    this.exporter = new SafeExportService();
    this.logger = new ConsoleLogger();
  }

  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  // 테스트용 의존성 주입 메서드 (OCP)
  public static createTestInstance(
    storage?: IStorageRepository,
    calculator?: ICalculationEngine,
    exporter?: IExportService,
    logger?: ILogger
  ): DependencyContainer {
    const container = Object.create(DependencyContainer.prototype);
    container.storage = storage || new InMemoryStorageRepository();
    container.calculator = calculator || new GageRRCalculationEngine();
    container.exporter = exporter || new SafeExportService();
    container.logger = logger || new ConsoleLogger();
    return container;
  }
}
