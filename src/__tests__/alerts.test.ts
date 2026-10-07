import { alertsFor } from '../alerts';
import { pause, start, type Routine } from '../engine';

const T0 = 1_700_000_000_000;
const routine: Routine = {
  id: 't',
  name: 'Tabata',
  spec: {
    type: 'interval',
    warmupMs: 10_000,
    workMs: 20_000,
    restMs: 10_000,
    rounds: 2,
    cooldownMs: 0,
  },
};

describe('alertsFor', () => {
  it('announces each upcoming phase at its exact start, then completion', () => {
    const alerts = alertsFor(start(routine, T0), T0 + 5_000);
    expect(alerts).toEqual([
      {
        id: 'phase-1',
        at: T0 + 10_000,
        title: 'Work · Round 1 of 2',
        body: '20 sec',
      },
      {
        id: 'phase-2',
        at: T0 + 30_000,
        title: 'Rest · Round 1 of 2',
        body: '10 sec',
      },
      {
        id: 'phase-3',
        at: T0 + 40_000,
        title: 'Work · Round 2 of 2',
        body: '20 sec',
      },
      {
        id: 'phase-4',
        at: T0 + 60_000,
        title: 'Tabata complete',
        body: 'Nice work.',
      },
    ]);
  });

  it('schedules nothing while paused', () => {
    expect(
      alertsFor(pause(start(routine, T0), T0 + 1_000), T0 + 2_000),
    ).toEqual([]);
  });

  it('stays under the iOS pending-notification limit', () => {
    const long: Routine = {
      ...routine,
      spec: { ...routine.spec, rounds: 99, warmupMs: 0 },
    } as Routine;
    expect(alertsFor(start(long, T0), T0).length).toBe(60);
  });
});
