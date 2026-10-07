import {
  back,
  expand,
  formatClock,
  formatDuration,
  pause,
  resume,
  settle,
  skip,
  snapshot,
  start,
  stop,
  totalDurationMs,
  upcomingBoundaries,
  validate,
  type FocusSpec,
  type IntervalSpec,
  type Routine,
} from '..';

const S = 1000;
const T0 = 1_700_000_000_000;

const tabata: IntervalSpec = {
  type: 'interval',
  warmupMs: 10 * S,
  workMs: 20 * S,
  restMs: 10 * S,
  rounds: 3,
  cooldownMs: 30 * S,
};
const routine: Routine = { id: 'r1', name: 'Tabata', spec: tabata };

describe('expand', () => {
  it('lays out an interval routine with no rest after the last round', () => {
    expect(expand(tabata).map(p => `${p.kind}${p.round ?? ''}`)).toEqual([
      'warmup',
      'work1',
      'rest1',
      'work2',
      'rest2',
      'work3',
      'cooldown',
    ]);
    expect(totalDurationMs(expand(tabata))).toBe(120 * S);
  });

  it('omits zero-length warmup, rest and cooldown', () => {
    const phases = expand({ ...tabata, warmupMs: 0, restMs: 0, cooldownMs: 0 });
    expect(phases.map(p => p.kind)).toEqual(['work', 'work', 'work']);
  });

  it('inserts a long break every N focus cycles', () => {
    const spec: FocusSpec = {
      type: 'focus',
      focusMs: 25 * 60 * S,
      shortBreakMs: 5 * 60 * S,
      longBreakMs: 15 * 60 * S,
      cycles: 5,
      longBreakEvery: 2,
    };
    const breaks = expand(spec)
      .filter(p => p.kind === 'break')
      .map(p => p.durationMs / (60 * S));
    expect(breaks).toEqual([5, 15, 5, 15]);
  });
});

describe('validate', () => {
  it('accepts a sane routine', () => {
    expect(validate(tabata)).toEqual([]);
  });

  it('rejects zero rounds, tiny work and negative durations', () => {
    expect(validate({ ...tabata, rounds: 0 })).toContain('NO_ROUNDS');
    expect(validate({ ...tabata, workMs: 1 * S })).toContain('WORK_TOO_SHORT');
    expect(validate({ ...tabata, restMs: -1 })).toContain('NEGATIVE_DURATION');
  });

  it('rejects routines longer than 12 hours', () => {
    expect(validate({ ...tabata, rounds: 2000 })).toContain('TOO_LONG');
  });
});

describe('session', () => {
  it('derives the current phase purely from the clock', () => {
    const s = start(routine, T0);
    expect(snapshot(s, T0).phase.kind).toBe('warmup');
    const snap = snapshot(s, T0 + 15 * S);
    expect(snap.phase).toMatchObject({ kind: 'work', round: 1 });
    expect(snap.phaseElapsedMs).toBe(5 * S);
    expect(snap.phaseRemainingMs).toBe(15 * S);
    expect(snap.next).toMatchObject({ kind: 'rest', round: 1 });
  });

  it('freezes while paused and resumes where it left off', () => {
    let s = start(routine, T0);
    s = pause(s, T0 + 5 * S);
    expect(snapshot(s, T0 + 60 * S).totalElapsedMs).toBe(5 * S);
    expect(snapshot(s, T0 + 60 * S).status).toBe('paused');
    s = resume(s, T0 + 60 * S);
    expect(snapshot(s, T0 + 62 * S).totalElapsedMs).toBe(7 * S);
  });

  it('treats repeated pause and resume as no-ops', () => {
    let s = start(routine, T0);
    s = pause(s, T0 + 1 * S);
    expect(pause(s, T0 + 9 * S)).toBe(s);
    s = resume(s, T0 + 2 * S);
    expect(resume(s, T0 + 9 * S)).toBe(s);
  });

  it('skips to the start of the next phase', () => {
    let s = start(routine, T0);
    s = skip(s, T0 + 3 * S);
    const snap = snapshot(s, T0 + 3 * S);
    expect(snap.phase.kind).toBe('work');
    expect(snap.phaseElapsedMs).toBe(0);
  });

  it('skipping the last phase finishes the session', () => {
    let s = start(routine, T0);
    for (let i = 0; i < 7; i++) s = skip(s, T0 + i * S);
    expect(s.finishedAt).toBe(T0 + 6 * S);
    expect(snapshot(s, T0 + 100 * S).status).toBe('finished');
  });

  it('back restarts the phase, or steps back within the grace window', () => {
    let s = start(routine, T0);
    const mid = back(s, T0 + 15 * S);
    expect(snapshot(mid, T0 + 15 * S)).toMatchObject({
      phaseIndex: 1,
      phaseElapsedMs: 0,
    });
    const early = back(s, T0 + 11 * S);
    expect(snapshot(early, T0 + 11 * S)).toMatchObject({
      phaseIndex: 0,
      phaseElapsedMs: 0,
    });
  });

  it('records the exact finish time even when settled late', () => {
    let s = start(routine, T0);
    s = pause(s, T0 + 10 * S);
    s = resume(s, T0 + 40 * S);
    s = settle(s, T0 + 10_000 * S);
    expect(s.finishedAt).toBe(T0 + 150 * S);
    expect(snapshot(s, T0 + 10_000 * S)).toMatchObject({
      status: 'finished',
      totalRemainingMs: 0,
      totalProgress: 1,
    });
  });

  it('stop ends early and keeps the elapsed position', () => {
    let s = start(routine, T0);
    s = stop(s, T0 + 25 * S);
    expect(snapshot(s, T0 + 99 * S)).toMatchObject({
      status: 'finished',
      totalElapsedMs: 25 * S,
    });
  });

  it('survives a JSON round-trip, as it would through storage or a watch', () => {
    let s = start(routine, T0);
    s = pause(s, T0 + 12 * S);
    const restored = JSON.parse(JSON.stringify(s));
    expect(snapshot(restored, T0 + 99 * S)).toEqual(snapshot(s, T0 + 99 * S));
  });
});

describe('upcomingBoundaries', () => {
  it('lists the wall-clock start of every remaining phase', () => {
    const s = start(routine, T0);
    const b = upcomingBoundaries(s, T0 + 12 * S);
    expect(b[0]).toMatchObject({ at: T0 + 30 * S, index: 2 });
    expect(b[b.length - 1]).toMatchObject({ at: T0 + 120 * S, phase: null });
    expect(b).toHaveLength(6);
  });

  it('is empty while paused', () => {
    const s = pause(start(routine, T0), T0 + S);
    expect(upcomingBoundaries(s, T0 + 2 * S)).toEqual([]);
  });
});

describe('format', () => {
  it('counts down without showing 0:00 early', () => {
    expect(formatClock(59_001)).toBe('1:00');
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(3_725_000)).toBe('1:02:05');
  });

  it('describes durations in words', () => {
    expect(formatDuration(45 * S)).toBe('45 sec');
    expect(formatDuration(25 * 60 * S)).toBe('25 min');
    expect(formatDuration(90 * 60 * S)).toBe('1 hr 30 min');
  });
});
