import type { FocusSpec, IntervalSpec, Phase, RoutineSpec } from './types';

export function expand(spec: RoutineSpec): Phase[] {
  return spec.type === 'interval' ? expandInterval(spec) : expandFocus(spec);
}

function expandInterval(s: IntervalSpec): Phase[] {
  const phases: Phase[] = [];
  if (s.warmupMs > 0) phases.push({ kind: 'warmup', durationMs: s.warmupMs });
  for (let round = 1; round <= s.rounds; round++) {
    phases.push({ kind: 'work', durationMs: s.workMs, round });
    // No rest after the final round: the cooldown (or the end) follows directly.
    if (round < s.rounds && s.restMs > 0) {
      phases.push({ kind: 'rest', durationMs: s.restMs, round });
    }
  }
  if (s.cooldownMs > 0)
    phases.push({ kind: 'cooldown', durationMs: s.cooldownMs });
  return phases;
}

function expandFocus(s: FocusSpec): Phase[] {
  const phases: Phase[] = [];
  for (let round = 1; round <= s.cycles; round++) {
    phases.push({ kind: 'focus', durationMs: s.focusMs, round });
    if (round === s.cycles) break;
    const long = s.longBreakEvery > 0 && round % s.longBreakEvery === 0;
    phases.push({
      kind: 'break',
      durationMs: long ? s.longBreakMs : s.shortBreakMs,
      round,
    });
  }
  return phases;
}

export function totalDurationMs(phases: Phase[]): number {
  return phases.reduce((sum, p) => sum + p.durationMs, 0);
}

export type SpecError =
  | 'NO_ROUNDS'
  | 'WORK_TOO_SHORT'
  | 'NEGATIVE_DURATION'
  | 'TOO_LONG';

const MIN_ACTIVE_MS = 5_000;
const MAX_TOTAL_MS = 12 * 60 * 60 * 1000;

export function validate(spec: RoutineSpec): SpecError[] {
  const errors: SpecError[] = [];
  const durations =
    spec.type === 'interval'
      ? [spec.warmupMs, spec.workMs, spec.restMs, spec.cooldownMs]
      : [spec.focusMs, spec.shortBreakMs, spec.longBreakMs];
  if (durations.some(d => d < 0 || !Number.isFinite(d))) {
    errors.push('NEGATIVE_DURATION');
  }
  const rounds = spec.type === 'interval' ? spec.rounds : spec.cycles;
  if (!Number.isInteger(rounds) || rounds < 1) errors.push('NO_ROUNDS');
  const active = spec.type === 'interval' ? spec.workMs : spec.focusMs;
  if (active < MIN_ACTIVE_MS) errors.push('WORK_TOO_SHORT');
  if (errors.length === 0 && totalDurationMs(expand(spec)) > MAX_TOTAL_MS) {
    errors.push('TOO_LONG');
  }
  return errors;
}
