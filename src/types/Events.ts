import { SessionFormData } from './Session';
export interface TimerEvents {
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onLapRecord: (operator: string, target: string) => void;
}

export interface SessionEvents {
  onCreate: (data: SessionFormData) => void;
  onSwitch: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export interface UIEvents {
  onThemeToggle: () => void;
  onModalOpen: (modalType: string) => void;
  onModalClose: () => void;
}
