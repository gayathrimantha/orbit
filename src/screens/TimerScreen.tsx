import { useEffect, useRef } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glow } from '../components/Glow';
import { Icon, type IconName } from '../components/Icon';
import { Ring } from '../components/Ring';
import { TimelineBar } from '../components/TimelineBar';
import {
  formatClock,
  formatDuration,
  snapshot,
  type Session,
  type Snapshot,
} from '../engine';
import { useNow } from '../hooks/useNow';
import type { ScreenProps } from '../navigation';
import { activeMs, useStore } from '../store';
import { color, phaseColor, phaseLabel, radius, space, type } from '../theme';

export function TimerScreen({ navigation }: ScreenProps<'Timer'>) {
  const session = useStore(s => s.session);

  useEffect(() => {
    if (!session) navigation.goBack();
  }, [session, navigation]);

  if (!session) return <View style={styles.screen} />;
  return session.finishedAt === null ? (
    <Running session={session} onClose={() => navigation.goBack()} />
  ) : (
    <Finished session={session} />
  );
}

function Running({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const control = useStore(s => s.control);
  const tick = useStore(s => s.tick);
  const now = useNow(session.pausedAt === null);
  const snap = snapshot(session, now);
  const c = phaseColor[snap.phase.kind];

  useEffect(() => tick(now), [now, tick]);
  usePhaseCue(snap);

  const confirmStop = () =>
    Alert.alert('End this session?', 'Your progress so far will be saved.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => control('stop') },
    ]);

  const ringSize = Math.min(width - space.xxl * 2, 340);
  const paused = snap.status === 'paused';

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom + space.xl },
      ]}
    >
      <Glow color={c} />

      <View style={styles.topBar}>
        <IconButton icon="chevron" label="Minimise" onPress={onClose} rotate />
        <Text style={styles.routineName} numberOfLines={1}>
          {session.routine.name}
        </Text>
        <IconButton icon="close" label="End session" onPress={confirmStop} />
      </View>

      <View style={styles.center}>
        <Text style={[styles.phase, { color: c }]}>
          {phaseLabel[snap.phase.kind].toUpperCase()}
        </Text>
        <Ring
          size={ringSize}
          stroke={10}
          progress={snap.phaseProgress}
          color={c}
        >
          <Text
            style={[styles.clock, paused && styles.clockPaused]}
            accessibilityRole="timer"
            accessibilityLabel={`${formatDuration(
              snap.phaseRemainingMs,
            )} remaining`}
          >
            {formatClock(snap.phaseRemainingMs)}
          </Text>
          <Text style={styles.round}>{roundText(session, snap)}</Text>
        </Ring>
        <Text style={styles.next}>
          {snap.next
            ? `Next · ${phaseLabel[snap.next.kind]} ${formatDuration(
                snap.next.durationMs,
              )}`
            : 'Last one'}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressRow}>
          <Text style={styles.meta}>{formatClock(snap.totalElapsedMs)}</Text>
          <View style={styles.flex}>
            <TimelineBar
              phases={session.phases}
              progress={snap.totalProgress}
              height={6}
            />
          </View>
          <Text style={styles.meta}>-{formatClock(snap.totalRemainingMs)}</Text>
        </View>

        <View style={styles.controls}>
          <IconButton
            icon="back"
            label="Previous"
            onPress={() => control('back')}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? 'Resume' : 'Pause'}
            onPress={() => control(paused ? 'resume' : 'pause')}
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: c },
              pressed && styles.pressed,
            ]}
          >
            <Icon name={paused ? 'play' : 'pause'} size={32} color={color.bg} />
          </Pressable>
          <IconButton
            icon="skip"
            label="Skip"
            onPress={() => control('skip')}
          />
        </View>
      </View>
    </View>
  );
}

function Finished({ session }: { session: Session }) {
  const insets = useSafeAreaInsets();
  const dismiss = useStore(s => s.dismissSession);
  const startSession = useStore(s => s.startSession);
  const snap = snapshot(session, session.finishedAt!);
  const completed = snap.totalRemainingMs === 0;
  const c =
    phaseColor[session.routine.spec.type === 'interval' ? 'work' : 'focus'];

  return (
    <View
      style={[
        styles.screen,
        styles.finished,
        {
          paddingTop: insets.top + space.xxl,
          paddingBottom: insets.bottom + space.xl,
        },
      ]}
    >
      <View style={styles.center}>
        <Text style={[styles.phase, { color: c }]}>
          {completed ? 'COMPLETE' : 'ENDED EARLY'}
        </Text>
        <Text style={styles.doneTitle}>{session.routine.name}</Text>
        <View style={styles.stats}>
          <Stat label="Total" value={formatClock(snap.totalElapsedMs)} />
          <Stat
            label={session.routine.spec.type === 'interval' ? 'Work' : 'Focus'}
            value={formatClock(activeMs(session))}
          />
          <Stat
            label="Phases"
            value={`${snap.phaseIndex + (completed ? 1 : 0)}/${
              session.phases.length
            }`}
          />
        </View>
        <View style={styles.doneBar}>
          <TimelineBar
            phases={session.phases}
            progress={snap.totalProgress}
            height={6}
          />
        </View>
      </View>
      <View style={styles.doneActions}>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryWide,
            pressed && styles.pressed,
          ]}
          onPress={() => startSession(session.routine)}
        >
          <Text style={styles.secondaryText}>Go again</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.primaryWide,
            { backgroundColor: c },
            pressed && styles.pressed,
          ]}
          onPress={dismiss}
        >
          <Text style={styles.primaryText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.meta}>{label}</Text>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  rotate,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  rotate?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <View style={rotate ? styles.rotate : undefined}>
        <Icon name={icon} size={22} color={color.text} />
      </View>
    </Pressable>
  );
}

function roundText(session: Session, snap: Snapshot): string {
  const total =
    session.routine.spec.type === 'interval'
      ? session.routine.spec.rounds
      : session.routine.spec.cycles;
  if (snap.phase.round === undefined)
    return formatDuration(snap.phase.durationMs);
  return `Round ${snap.phase.round} of ${total}`;
}

/** Buzzes when the phase changes while the screen is open. */
function usePhaseCue(snap: Snapshot) {
  const last = useRef(snap.phaseIndex);
  useEffect(() => {
    if (snap.phaseIndex !== last.current && snap.status === 'running') {
      Vibration.vibrate(
        snap.phase.kind === 'work' || snap.phase.kind === 'focus'
          ? [0, 120, 80, 120]
          : 200,
      );
    }
    last.current = snap.phaseIndex;
  }, [snap.phaseIndex, snap.status, snap.phase.kind]);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  routineName: {
    flex: 1,
    textAlign: 'center',
    ...type.body,
    fontWeight: '600',
    color: color.muted,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceRaised,
  },
  rotate: { transform: [{ rotate: '90deg' }] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  phase: { ...type.label, letterSpacing: 3, marginBottom: space.xl },
  clock: {
    fontSize: 76,
    fontWeight: '300',
    color: color.text,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  clockPaused: { opacity: 0.45 },
  round: { ...type.caption, color: color.muted, marginTop: space.xs },
  next: { ...type.body, color: color.muted, marginTop: space.xl },
  footer: { paddingHorizontal: space.xl, gap: space.xxl },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meta: {
    ...type.caption,
    color: color.faint,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxl,
  },
  primary: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finished: { paddingHorizontal: space.xl },
  doneTitle: { ...type.display, color: color.text },
  stats: { flexDirection: 'row', gap: space.xl, marginTop: space.xxl },
  stat: { alignItems: 'center', minWidth: 80 },
  statValue: {
    fontSize: 28,
    fontWeight: '300',
    color: color.text,
    fontVariant: ['tabular-nums'],
  },
  doneBar: { alignSelf: 'stretch', marginTop: space.xxl },
  doneActions: { flexDirection: 'row', gap: space.md },
  secondaryWide: {
    flex: 1,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceRaised,
  },
  secondaryText: { ...type.body, fontWeight: '600', color: color.text },
  primaryWide: {
    flex: 1,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...type.body, fontWeight: '600', color: color.bg },
});
