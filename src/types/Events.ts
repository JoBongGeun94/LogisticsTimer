export interface KeyboardEventConfig {
  code: string;
  action: () => void;
  preventDefault?: boolean;
}

export interface BackButtonEvent {
  preventDefault: () => void;
}
