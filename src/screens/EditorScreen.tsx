import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { TimelineBar } from '../components/TimelineBar';
import {
  expand,
  formatDuration,
  totalDurationMs,
  validate,
  type FocusSpec,
  type IntervalSpec,
  type RoutineSpec,
  type SpecError,
} from '../engine';
import type { ScreenProps } from '../navigation';
import { blankSpec } from '../presets';
import { newId, useStore } from '../store';
import { color, phaseColor, radius, space, type } from '../theme';

const ERROR_TEXT: Record<SpecError, string> = {
  NO_ROUNDS: 'Add at least one round.',
  WORK_TOO_SHORT: 'Active time needs to be at least 5 seconds.',
  NEGATIVE_DURATION: 'Durations can’t be negative.',
  TOO_LONG: 'Keep the whole routine under 12 hours.',
};

type Field =
  | { key: string; label: string; kind: 'duration'; step: number; min: number }
  | { key: string; label: string; kind: 'count'; min: number; max: number };

const INTERVAL_FIELDS: Field[] = [
  { key: 'workMs', label: 'Work', kind: 'duration', step: 5_000, min: 5_000 },
  { key: 'restMs', label: 'Rest', kind: 'duration', step: 5_000, min: 0 },
  { key: 'rounds', label: 'Rounds', kind: 'count', min: 1, max: 99 },
  { key: 'warmupMs', label: 'Warm up', kind: 'duration', step: 15_000, min: 0 },
  {
    key: 'cooldownMs',
    label: 'Cool down',
    kind: 'duration',
    step: 15_000,
    min: 0,
  },
];

const FOCUS_FIELDS: Field[] = [
  {
    key: 'focusMs',
    label: 'Focus',
    kind: 'duration',
    step: 300_000,
    min: 300_000,
  },
  {
    key: 'shortBreakMs',
    label: 'Short break',
    kind: 'duration',
    step: 60_000,
    min: 0,
  },
  {
    key: 'longBreakMs',
    label: 'Long break',
    kind: 'duration',
    step: 300_000,
    min: 0,
  },
  { key: 'cycles', label: 'Cycles', kind: 'count', min: 1, max: 12 },
  {
    key: 'longBreakEvery',
    label: 'Long break every',
    kind: 'count',
    min: 0,
    max: 12,
  },
];

export function EditorScreen({ navigation, route }: ScreenProps<'Editor'>) {
  const insets = useSafeAreaInsets();
  const existing = useStore(s =>
    s.routines.find(r => r.id === route.params.routineId),
  );
  const saveRoutine = useStore(s => s.saveRoutine);
  const deleteRoutine = useStore(s => s.deleteRoutine);

  const [name, setName] = useState(existing?.name ?? '');
  const [spec, setSpec] = useState<RoutineSpec>(
    existing?.spec ?? blankSpec(route.params.kind ?? 'interval'),
  );

  const phases = useMemo(() => expand(spec), [spec]);
  const errors = validate(spec);
  const canSave = errors.length === 0 && name.trim().length > 0;
  const fields = spec.type === 'interval' ? INTERVAL_FIELDS : FOCUS_FIELDS;

  const setField = (key: string, value: number) =>
    setSpec(s => ({ ...s, [key]: value } as IntervalSpec | FocusSpec));

  const save = () => {
    saveRoutine({ id: existing?.id ?? newId(), name: name.trim(), spec });
    navigation.goBack();
  };

  const remove = () =>
    Alert.alert(`Delete “${existing!.name}”?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteRoutine(existing!.id);
          navigation.goBack();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          styles.topBar,
          // iOS presents this as a sheet below the status bar; Android doesn't.
          { paddingTop: (Platform.OS === 'ios' ? 0 : insets.top) + space.lg },
        ]}
      >
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        >
          <Icon name="close" size={20} color={color.text} />
        </Pressable>
        <Text style={styles.topTitle}>
          {existing ? 'Edit routine' : 'New routine'}
        </Text>
        <Pressable
          disabled={!canSave}
          onPress={save}
          style={({ pressed }) => [
            styles.save,
            !canSave && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: space.xl,
          paddingBottom: insets.bottom + space.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={color.faint}
          style={styles.name}
          maxLength={40}
          returnKeyType="done"
        />

        {!existing && (
          <View style={styles.segment}>
            {(['interval', 'focus'] as const).map(k => (
              <Pressable
                key={k}
                onPress={() => setSpec(blankSpec(k))}
                style={[
                  styles.segmentItem,
                  spec.type === k && styles.segmentOn,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    spec.type === k && styles.segmentTextOn,
                  ]}
                >
                  {k === 'interval' ? 'Workout' : 'Focus'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.preview}>
          <View style={styles.previewHead}>
            <Text style={styles.label}>PREVIEW</Text>
            <Text style={styles.total}>
              {formatDuration(totalDurationMs(phases))}
            </Text>
          </View>
          <TimelineBar phases={phases} height={10} />
        </View>

        <View style={styles.fields}>
          {fields.map(f => (
            <Stepper
              key={f.key}
              field={f}
              value={(spec as unknown as Record<string, number>)[f.key]}
              onChange={v => setField(f.key, v)}
            />
          ))}
        </View>

        {errors.map(e => (
          <Text key={e} style={styles.error}>
            {ERROR_TEXT[e]}
          </Text>
        ))}

        {existing && (
          <Pressable onPress={remove} style={styles.delete}>
            <Text style={styles.deleteText}>Delete routine</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stepper({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: number;
  onChange: (v: number) => void;
}) {
  const step = field.kind === 'duration' ? field.step : 1;
  const max = field.kind === 'count' ? field.max : Infinity;
  const display =
    field.kind === 'duration'
      ? value === 0
        ? 'Off'
        : formatDuration(value)
      : field.key === 'longBreakEvery' && value === 0
      ? 'Never'
      : String(value);
  const dot =
    field.key === 'workMs'
      ? phaseColor.work
      : field.key === 'restMs'
      ? phaseColor.rest
      : field.key === 'focusMs'
      ? phaseColor.focus
      : field.key.toLowerCase().includes('break')
      ? phaseColor.break
      : field.key === 'warmupMs'
      ? phaseColor.warmup
      : field.key === 'cooldownMs'
      ? phaseColor.cooldown
      : undefined;

  return (
    <View style={styles.row}>
      {dot ? (
        <View style={[styles.dot, { backgroundColor: dot }]} />
      ) : (
        <View style={styles.dotSpacer} />
      )}
      <Text style={styles.rowLabel}>{field.label}</Text>
      <StepButton
        sign="−"
        disabled={value <= field.min}
        onPress={() => onChange(Math.max(field.min, value - step))}
      />
      <Text style={styles.value}>{display}</Text>
      <StepButton
        sign="+"
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
      />
    </View>
  );
}

function StepButton({
  sign,
  disabled,
  onPress,
}: {
  sign: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sign === '+' ? 'Increase' : 'Decrease'}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.step,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.stepText}>{sign}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.3 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    ...type.body,
    fontWeight: '600',
    color: color.text,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceRaised,
  },
  save: {
    paddingHorizontal: space.lg,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.text,
    justifyContent: 'center',
  },
  saveText: { ...type.body, fontWeight: '600', color: color.bg },
  name: {
    ...type.display,
    color: color.text,
    paddingVertical: space.sm,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    padding: 3,
    marginTop: space.lg,
  },
  segmentItem: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm - 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: color.surfaceRaised },
  segmentText: { ...type.body, color: color.muted, fontWeight: '500' },
  segmentTextOn: { color: color.text },
  preview: {
    marginTop: space.xl,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    gap: space.md,
  },
  previewHead: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...type.label, color: color.faint, letterSpacing: 1.6 },
  total: {
    ...type.label,
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  fields: {
    marginTop: space.xl,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    height: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    gap: space.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSpacer: { width: 8 },
  rowLabel: { flex: 1, ...type.body, color: color.text },
  value: {
    minWidth: 76,
    textAlign: 'center',
    ...type.body,
    fontWeight: '600',
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  step: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 20, color: color.text, marginTop: -2 },
  error: { ...type.caption, color: color.danger, marginTop: space.md },
  delete: { marginTop: space.xxl, alignItems: 'center', padding: space.md },
  deleteText: { ...type.body, color: color.danger, fontWeight: '500' },
});
