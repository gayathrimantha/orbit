import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Soft wash of the phase colour from the top of the screen, no hard edge. */
export function Glow({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="g" cx="50%" cy="0%" rx="90%" ry="60%">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
            <Stop offset="0.55" stopColor={color} stopOpacity={0.06} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#g)" />
      </Svg>
    </View>
  );
}
