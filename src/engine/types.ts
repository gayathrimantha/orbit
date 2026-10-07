export type PhaseKind = 'warmup' | 'work' | 'rest' | 'cooldown' | 'focus' | 'break';

export interface Phase {
  kind: PhaseKind;
  durationMs: number;
  round?: number;
}

export interface IntervalSpec {
  type: 'interval';
  warmupMs: number;
  workMs: number;
  restMs: number;
  rounds: number;
  cooldownMs: number;
}

export interface FocusSpec {
  type: 'focus';
  focusMs: number;
  shortBreakMs: number;
  longBreakMs: number;
  cycles: number;
  longBreakEvery: number;
}

export type RoutineSpec = IntervalSpec | FocusSpec;

export interface Routine {
  id: string;
  name: string;
  spec: RoutineSpec;
}

export type SessionStatus = 'running' | 'paused' | 'finished';

/**
 * A session is described entirely by timestamps, never by tick counts, so it
 * can be persisted, restored after the process dies, or handed to a watch and
 * rendered there without a stream of updates.
 */
export interface Session {
  routine: Routine;
  phases: Phase[];
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  skippedMs: number;
  finishedAt: number | null;
}

export interface Snapshot {
  status: SessionStatus;
  phaseIndex: number;
  phase: Phase;
  next: Phase | null;
  phaseElapsedMs: number;
  phaseRemainingMs: number;
  totalElapsedMs: number;
  totalRemainingMs: number;
  phaseProgress: number;
  totalProgress: number;
}
