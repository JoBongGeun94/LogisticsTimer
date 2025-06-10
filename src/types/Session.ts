import { LapTime } from './Timer';

export interface SessionCore {
  id: string;
  name: string;
  workType: string;
}

export interface SessionParticipants {
  operators: string[];
  targets: string[];
}

export interface SessionMetadata {
  startTime: string;
  endTime?: string;
  isActive: boolean;
}

export interface SessionData extends SessionCore, SessionParticipants, SessionMetadata {
  lapTimes: LapTime[];
}

export interface SessionFormData {
  sessionName: string;
  workType: string;
  operators: string[];
  targets: string[];
}
