export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

export type QualityStatus = 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ColorScheme = 'green' | 'blue' | 'yellow' | 'red';

export interface StatusConfig {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly text: string;
  readonly colorScheme: ColorScheme;
}

export type StatusConfigMap = {
  readonly [K in QualityStatus]: StatusConfig;
};
