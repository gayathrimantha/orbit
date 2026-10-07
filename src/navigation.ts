import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RoutineSpec } from './engine';

export type RootStack = {
  Home: undefined;
  Editor: { routineId?: string; kind?: RoutineSpec['type'] };
  Timer: undefined;
};

export type ScreenProps<K extends keyof RootStack> = NativeStackScreenProps<
  RootStack,
  K
>;
