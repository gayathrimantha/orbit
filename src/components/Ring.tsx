import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { tint } from '../theme';

interface Props {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  children?: ReactNode;
}

/** Depleting ring: full at the start of a phase, empty when it ends. */
export function Ring({ size, stroke, progress, color, children }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const remaining = 1 - Math.min(Math.max(progress, 0), 1);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tint(color, 0.14)}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - remaining)}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
