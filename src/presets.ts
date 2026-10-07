import type { Routine, RoutineSpec } from './engine';

const sec = (n: number) => n * 1000;
const min = (n: number) => n * 60_000;

export const presets: Routine[] = [
  {
    id: 'preset-tabata',
    name: 'Tabata',
    spec: {
      type: 'interval',
      warmupMs: sec(60),
      workMs: sec(20),
      restMs: sec(10),
      rounds: 8,
      cooldownMs: sec(60),
    },
  },
  {
    id: 'preset-hiit',
    name: 'HIIT 40 / 20',
    spec: {
      type: 'interval',
      warmupMs: min(3),
      workMs: sec(40),
      restMs: sec(20),
      rounds: 12,
      cooldownMs: min(3),
    },
  },
  {
    id: 'preset-pomodoro',
    name: 'Pomodoro',
    spec: {
      type: 'focus',
      focusMs: min(25),
      shortBreakMs: min(5),
      longBreakMs: min(15),
      cycles: 4,
      longBreakEvery: 4,
    },
  },
  {
    id: 'preset-deep-work',
    name: 'Deep work',
    spec: {
      type: 'focus',
      focusMs: min(50),
      shortBreakMs: min(10),
      longBreakMs: min(20),
      cycles: 3,
      longBreakEvery: 0,
    },
  },
];

export function blankSpec(kind: RoutineSpec['type']): RoutineSpec {
  return kind === 'interval'
    ? {
        type: 'interval',
        warmupMs: sec(30),
        workMs: sec(30),
        restMs: sec(15),
        rounds: 6,
        cooldownMs: sec(30),
      }
    : {
        type: 'focus',
        focusMs: min(25),
        shortBreakMs: min(5),
        longBreakMs: min(15),
        cycles: 4,
        longBreakEvery: 4,
      };
}
