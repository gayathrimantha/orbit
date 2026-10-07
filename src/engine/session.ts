import { expand, totalDurationMs } from './routine';
import type { Phase, Routine, Session, Snapshot } from './types';

export function start(routine: Routine, now: number): Session {
  const phases = expand(routine.spec);
  if (phases.length === 0) throw new Error('Routine has no phases');
  return {
    routine,
    phases,
    startedAt: now,
    pausedAt: null,
    pausedTotalMs: 0,
    skippedMs: 0,
    finishedAt: null,
  };
}

/** Position on the routine's own timeline, independent of wall-clock pauses. */
export function elapsedMs(s: Session, now: number): number {
  const end = s.finishedAt ?? s.pausedAt ?? now;
  const raw = end - s.startedAt - s.pausedTotalMs + s.skippedMs;
  return Math.min(Math.max(raw, 0), totalDurationMs(s.phases));
}

export function pause(s: Session, now: number): Session {
  if (s.pausedAt !== null || s.finishedAt !== null) return s;
  return settle({ ...s, pausedAt: now }, now);
}

export function resume(s: Session, now: number): Session {
  if (s.pausedAt === null || s.finishedAt !== null) return s;
  return {
    ...s,
    pausedTotalMs: s.pausedTotalMs + (now - s.pausedAt),
    pausedAt: null,
  };
}

/** Jumps to the start of the next phase, or finishes on the last one. */
export function skip(s: Session, now: number): Session {
  if (s.finishedAt !== null) return s;
  const snap = snapshot(s, now);
  return settle({ ...s, skippedMs: s.skippedMs + snap.phaseRemainingMs }, now);
}

/** Restarts the current phase, or steps back a phase when it has barely begun. */
export function back(s: Session, now: number, graceMs = 2_000): Session {
  if (s.finishedAt !== null) return s;
  const snap = snapshot(s, now);
  let rewind = snap.phaseElapsedMs;
  if (snap.phaseElapsedMs < graceMs && snap.phaseIndex > 0) {
    rewind += s.phases[snap.phaseIndex - 1].durationMs;
  }
  return { ...s, skippedMs: s.skippedMs - rewind };
}

export function stop(s: Session, now: number): Session {
  if (s.finishedAt !== null) return s;
  return { ...s, finishedAt: s.pausedAt ?? now };
}

/**
 * Marks the session finished once its timeline has run out. Callers render
 * from `snapshot` either way; this only makes the finish time durable.
 */
export function settle(s: Session, now: number): Session {
  if (s.finishedAt !== null) return s;
  const total = totalDurationMs(s.phases);
  if (elapsedMs(s, now) < total) return s;
  const reachedEndAt = s.startedAt + s.pausedTotalMs - s.skippedMs + total;
  return { ...s, finishedAt: Math.min(reachedEndAt, s.pausedAt ?? now) };
}

export function snapshot(s: Session, now: number): Snapshot {
  const total = totalDurationMs(s.phases);
  const elapsed = elapsedMs(s, now);
  const finished = s.finishedAt !== null || elapsed >= total;

  let index = 0;
  let phaseStart = 0;
  while (
    index < s.phases.length - 1 &&
    elapsed >= phaseStart + s.phases[index].durationMs
  ) {
    phaseStart += s.phases[index].durationMs;
    index++;
  }
  const phase = s.phases[index];
  const phaseElapsedMs = Math.min(elapsed - phaseStart, phase.durationMs);

  return {
    status: finished ? 'finished' : s.pausedAt !== null ? 'paused' : 'running',
    phaseIndex: index,
    phase,
    next: s.phases[index + 1] ?? null,
    phaseElapsedMs,
    phaseRemainingMs: phase.durationMs - phaseElapsedMs,
    totalElapsedMs: elapsed,
    totalRemainingMs: total - elapsed,
    phaseProgress: phase.durationMs > 0 ? phaseElapsedMs / phase.durationMs : 1,
    totalProgress: total > 0 ? elapsed / total : 1,
  };
}

/**
 * Wall-clock times at which each remaining phase begins, for scheduling
 * local notifications and haptics while the app is in the background.
 */
export function upcomingBoundaries(
  s: Session,
  now: number,
): { at: number; phase: Phase | null; index: number }[] {
  if (s.pausedAt !== null || s.finishedAt !== null) return [];
  const elapsed = elapsedMs(s, now);
  const origin = now - elapsed;
  const out: { at: number; phase: Phase | null; index: number }[] = [];
  let t = 0;
  s.phases.forEach((p, i) => {
    t += p.durationMs;
    if (t > elapsed) {
      out.push({ at: origin + t, phase: s.phases[i + 1] ?? null, index: i + 1 });
    }
  });
  return out;
}
