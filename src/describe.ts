import { formatDuration, type RoutineSpec } from './engine';

export function describe(spec: RoutineSpec): string {
  if (spec.type === 'interval') {
    const parts = [
      `${spec.rounds} ${spec.rounds === 1 ? 'round' : 'rounds'}`,
      `${formatDuration(spec.workMs)} on`,
    ];
    if (spec.restMs > 0) parts.push(`${formatDuration(spec.restMs)} off`);
    return parts.join(' · ');
  }
  const parts = [
    `${spec.cycles} × ${formatDuration(spec.focusMs)}`,
    `${formatDuration(spec.shortBreakMs)} breaks`,
  ];
  return parts.join(' · ');
}
