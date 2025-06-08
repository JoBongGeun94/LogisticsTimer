// 기본 타입들
export interface LapTime {
  id: string;
  time: number;
  timestamp: Date;
  operatorId: string;
  partId: string;
  sessionId: string;
}

export interface Session {
  id: string;
  name: string;
  workType: string;
  operators: string[];
  parts: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface TimerState {
  currentTime: number;
  isRunning: boolean;
  startTime: number | null;
  lastTime: number;
}

// 테마 관련 타입들
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  mode: ThemeMode;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
}

// 분석 관련 타입들
export interface GageRRAnalysis {
  totalVariation: number;
  repeatability: number;
  reproducibility: number;
  gageRR: number;
  gageRRPercent: number;
  ndc: number;
  ptRatio: number;
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  recommendations: string[];
}

// UI 관련 타입들
export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  duration?: number;
  onClose: () => void;
}

// 키보드 이벤트 설정
export interface KeyboardEventConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

// 세션 폼 데이터
export interface SessionFormData {
  name: string;
  workType: string;
  operators: string[];
  targets: string[];
}

// 분석 설정
export interface AnalysisConfiguration {
  logTransform: boolean;
  transformType: 'none' | 'ln' | 'log10' | 'sqrt';
  confidenceLevel: number;
  minMeasurements: number;
}

// Hook 반환 타입들
export interface UseTimerReturn {
  currentTime: number;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  pause: () => void;
}

export interface UseSessionReturn {
  sessions: Session[];
  currentSession: Session | null;
  measurements: LapTime[];
  createSession: (sessionData: Omit<Session, 'id' | 'createdAt'>) => void;
  selectSession: (sessionId: string) => void;
  addMeasurement: (measurement: LapTime) => void;
  clearMeasurements: () => void;
}

// 내보내기 옵션
export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeAnalysis: boolean;
  filename?: string;
}

// 세션 필터
export interface SessionFilter {
  workType?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  isActive?: boolean;
}

// 새로운 기능을 위한 추가 타입들 (기존 타입과 충돌 없음)
export type AppView = 'landing' | 'main' | 'detailed-analysis';

export interface NavigationState {
  currentView: AppView;
  previousView?: AppView;
  canGoBack: boolean;
}

export interface DetailedAnalysisProps {
  analysisResult: any; // GageRRResult는 이미 정의되어 있음
  measurements: LapTime[];
  sessionName: string;
  onBack: () => void;
}

export interface LandingPageProps {
  onGetStarted: () => void;
}
