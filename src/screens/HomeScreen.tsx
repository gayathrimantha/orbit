import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { TimelineBar } from '../components/TimelineBar';
import { describe } from '../describe';
import {
  expand,
  formatClock,
  formatDuration,
  snapshot,
  totalDurationMs,
  type Routine,
} from '../engine';
import { useNow } from '../hooks/useNow';
import type { ScreenProps } from '../navigation';
import { useStore, type HistoryEntry } from '../store';
import { color, phaseColor, phaseLabel, radius, space, type } from '../theme';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const insets = useSafeAreaInsets();
  const routines = useStore(s => s.routines);
  const history = useStore(s => s.history);
  const session = useStore(s => s.session);
  const startSession = useStore(s => s.startSession);

  const workouts = routines.filter(r => r.spec.type === 'interval');
  const focus = routines.filter(r => r.spec.type === 'focus');

  const play = (r: Routine) => {
    startSession(r);
    navigation.navigate('Timer');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + space.xl,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: space.xl,
        }}
      >
        <Text style={styles.brand}>CADENCE</Text>
        <Text style={styles.title}>What are we doing?</Text>
        <WeekSummary history={history} />

        {session && session.finishedAt === null && (
          <ActiveBanner onPress={() => navigation.navigate('Timer')} />
        )}

        <Section title="Workouts">
          {workouts.map(r => (
            <RoutineCard
              key={r.id}
              routine={r}
              onPress={() => navigation.navigate('Editor', { routineId: r.id })}
              onPlay={() => play(r)}
            />
          ))}
        </Section>

        <Section title="Focus">
          {focus.map(r => (
            <RoutineCard
              key={r.id}
              routine={r}
              onPress={() => navigation.navigate('Editor', { routineId: r.id })}
              onPlay={() => play(r)}
            />
          ))}
        </Section>
      </ScrollView>

      <View style={[styles.fabRow, { bottom: insets.bottom + space.lg }]}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Editor', { kind: 'interval' })}
        >
          <Icon name="plus" size={20} color={color.bg} />
          <Text style={styles.fabText}>New routine</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WeekSummary({ history }: { history: HistoryEntry[] }) {
  const { count, activeMs } = useMemo(() => {
    const since = Date.now() - WEEK_MS;
    const recent = history.filter(h => h.finishedAt >= since);
    return {
      count: recent.length,
      activeMs: recent.reduce((n, h) => n + h.activeMs, 0),
    };
  }, [history]);

  if (count === 0) {
    return <Text style={styles.subtitle}>Pick a routine to get started.</Text>;
  }
  return (
    <Text style={styles.subtitle}>
      This week: {count} {count === 1 ? 'session' : 'sessions'} ·{' '}
      {formatDuration(activeMs)} active
    </Text>
  );
}

function ActiveBanner({ onPress }: { onPress: () => void }) {
  const session = useStore(s => s.session)!;
  const now = useNow(session.pausedAt === null, 500);
  const snap = snapshot(session, now);
  const c = phaseColor[snap.phase.kind];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.banner,
        { borderColor: c },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: c }]} />
      <View style={styles.flex}>
        <Text style={styles.bannerTitle}>{session.routine.name}</Text>
        <Text style={styles.caption}>
          {snap.status === 'paused' ? 'Paused' : phaseLabel[snap.phase.kind]} ·{' '}
          {formatClock(snap.phaseRemainingMs)} left
        </Text>
      </View>
      <Icon name="chevron" size={20} color={color.muted} />
    </Pressable>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

function RoutineCard({
  routine,
  onPress,
  onPlay,
}: {
  routine: Routine;
  onPress: () => void;
  onPlay: () => void;
}) {
  const phases = useMemo(() => expand(routine.spec), [routine.spec]);
  const accent =
    phaseColor[routine.spec.type === 'interval' ? 'work' : 'focus'];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{routine.name}</Text>
          <Text style={styles.caption}>{describe(routine.spec)}</Text>
        </View>
        <Text style={styles.duration}>
          {formatDuration(totalDurationMs(phases))}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Start ${routine.name}`}
          hitSlop={8}
          onPress={onPlay}
          style={({ pressed }) => [
            styles.play,
            { backgroundColor: accent },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="play" size={18} color={color.bg} />
        </Pressable>
      </View>
      <TimelineBar phases={phases} height={5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  brand: { ...type.label, color: color.faint, letterSpacing: 2.4 },
  title: { ...type.display, color: color.text, marginTop: space.sm },
  subtitle: { ...type.body, color: color.muted, marginTop: space.sm },
  caption: { ...type.caption, color: color.muted, marginTop: 2 },
  section: { marginTop: space.xxl },
  sectionTitle: {
    ...type.label,
    color: color.faint,
    letterSpacing: 1.6,
    marginBottom: space.md,
  },
  list: { gap: space.md },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    padding: space.lg,
    gap: space.lg,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardTitle: { ...type.title, color: color.text },
  duration: {
    ...type.caption,
    color: color.muted,
    fontVariant: ['tabular-nums'],
  },
  play: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  banner: {
    marginTop: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: color.surface,
  },
  bannerTitle: { ...type.body, fontWeight: '600', color: color.text },
  dot: { width: 10, height: 10, borderRadius: 5 },
  fabRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.text,
    paddingHorizontal: space.xl,
    height: 52,
    borderRadius: radius.pill,
  },
  fabText: { ...type.body, fontWeight: '600', color: color.bg },
});
