/**
 * Writes fixtures/engine.json: sessions plus the snapshot the TypeScript
 * engine produces for them at various instants. The Swift (watchOS) and
 * Kotlin (Wear OS) ports run the same file in their own tests, so all three
 * implementations are held to identical output.
 *
 *   npx tsx scripts/gen-fixtures.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { back, pause, resume, skip, snapshot, start, stop } from '../src/engine';
import type { Routine, Session } from '../src/engine';
import { presets } from '../src/presets';

const T0 = 1_700_000_000_000;
const S = 1000;

const odd: Routine = {
  id: 'odd',
  name: 'Odd',
  spec: {
    type: 'interval',
    warmupMs: 0,
    workMs: 7_333,
    restMs: 0,
    rounds: 3,
    cooldownMs: 1_250,
  },
};

const scenarios: { name: string; build: () => Session }[] = [
  { name: 'tabata fresh', build: () => start(presets[0], T0) },
  {
    name: 'tabata paused then resumed',
    build: () => resume(pause(start(presets[0], T0), T0 + 65 * S), T0 + 400 * S),
  },
  {
    name: 'tabata paused',
    build: () => pause(start(presets[0], T0), T0 + 83 * S),
  },
  {
    name: 'hiit skipped twice',
    build: () => skip(skip(start(presets[1], T0), T0 + 5 * S), T0 + 6 * S),
  },
  {
    name: 'hiit back after skip',
    build: () => back(skip(start(presets[1], T0), T0 + 5 * S), T0 + 30 * S),
  },
  { name: 'pomodoro fresh', build: () => start(presets[2], T0) },
  {
    name: 'deep work stopped',
    build: () => stop(start(presets[3], T0), T0 + 20 * 60 * S),
  },
  { name: 'odd durations', build: () => start(odd, T0) },
];

const offsets = [0, 1, 999, 1_000, 59_999, 60_000, 83_500, 7_333, 14_666, 23_249, 23_250, 1_500_000, 3_600_000, 99_999_999];

const fixtures = scenarios.map(({ name, build }) => {
  const session = build();
  return {
    name,
    session,
    cases: offsets.map(o => ({ now: T0 + o, snapshot: snapshot(session, T0 + o) })),
  };
});

mkdirSync('fixtures', { recursive: true });
writeFileSync('fixtures/engine.json', JSON.stringify(fixtures, null, 1) + '\n');
console.log(`wrote ${fixtures.length} scenarios × ${offsets.length} instants`);
