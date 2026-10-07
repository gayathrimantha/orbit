import type { PhaseKind } from './engine';

export const color = {
  bg: '#0B0C0F',
  surface: '#14161B',
  surfaceRaised: '#1B1E25',
  border: '#252932',
  text: '#F2F3F5',
  muted: '#8C929C',
  faint: '#545A65',
  danger: '#FF5A5F',
} as const;

export const phaseColor: Record<PhaseKind, string> = {
  warmup: '#F5B759',
  work: '#FF6B5A',
  rest: '#3CC9B0',
  cooldown: '#7C9CFF',
  focus: '#A98BFF',
  break: '#4FD18B',
};

export const phaseLabel: Record<PhaseKind, string> = {
  warmup: 'Warm up',
  work: 'Work',
  rest: 'Rest',
  cooldown: 'Cool down',
  focus: 'Focus',
  break: 'Break',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export const type = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: -0.8 },
  title: { fontSize: 20, fontWeight: '600', letterSpacing: -0.3 },
  body: { fontSize: 16, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  caption: { fontSize: 13, fontWeight: '400' },
} as const;

/** Mixes a hex colour with the background, for tinted fills that stay legible. */
export function tint(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
