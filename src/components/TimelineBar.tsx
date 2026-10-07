import { StyleSheet, View } from 'react-native';
import type { Phase } from '../engine';
import { phaseColor, tint } from '../theme';

interface Props {
  phases: Phase[];
  height?: number;
  /** 0..1 position along the whole routine; omit for a static preview. */
  progress?: number;
}

export function TimelineBar({ phases, height = 6, progress }: Props) {
  const total = phases.reduce((n, p) => n + p.durationMs, 0) || 1;
  const at = progress === undefined ? undefined : progress * total;
  let t = 0;
  return (
    <View style={[styles.row, { height, borderRadius: height / 2 }]}>
      {phases.map((p, i) => {
        const start = t;
        t += p.durationMs;
        const base = phaseColor[p.kind];
        const fill =
          at === undefined
            ? 1
            : Math.min(Math.max((at - start) / p.durationMs, 0), 1);
        return (
          <View
            key={i}
            style={[
              styles.segment,
              {
                flex: p.durationMs,
                backgroundColor: at === undefined ? base : tint(base, 0.22),
              },
            ]}
          >
            {at !== undefined && fill > 0 && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: base, width: `${fill * 100}%` },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', overflow: 'hidden', gap: 2 },
  segment: { overflow: 'hidden', borderRadius: 2 },
});
