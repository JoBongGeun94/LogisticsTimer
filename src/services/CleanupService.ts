
/**
 * 불필요한 파일 및 코드 정리 서비스 (Single Responsibility Principle)
 */

export class CleanupService {
  /**
   * 사용하지 않는 파일 목록
   */
  static getUnusedFiles(): string[] {
    return [
      'minimal_fix_script.sh',
      'src/App.tsx.backup.20250611_201806',
      'src/App.tsx.orig',
      'src/App.tsx.rej',
      'src/services/AnalysisService.ts.orig',
      'src/services/AnalysisService.ts.rej',
      'src/types/.gitkeep'
    ];
  }

  /**
   * 중복된 설정 파일 목록
   */
  static getDuplicateConfigs(): string[] {
    return [
      'tailwind.config.js', // tailwind.config.ts와 중복
      '.env.example' // 사용되지 않는 환경변수 예제
    ];
  }

  /**
   * 사용하지 않는 타입 정의 목록
   */
  static getUnusedTypes(): string[] {
    return [
      'src/types/strict/SafeTypes.ts', // 사용되지 않음
      'src/types/Events.ts', // 사용되지 않음
      'src/types/Timer.ts' // App.tsx에서 직접 정의하여 중복
    ];
  }
}
