export interface TimerState {
  currentTime: number;
  isRunning: boolean;
}

export interface TimerControls {
  toggle: () => void;
  stop: () => void;
  reset: () => void;
}

export interface UseTimerReturn extends TimerState, TimerControls {
  recordLap: (operator: string, target: string) => void;
}

export interface LapTime {
  id: number;
  time: number;
  timestamp: string;
  operator: string;
  target: string;
  sessionId: string;
}
