import {
  AppState,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { formatDuration, upcomingBoundaries, type Session } from './engine';
import { useStore } from './store';
import { phaseLabel } from './theme';

interface Alert {
  id: string;
  at: number;
  title: string;
  body: string;
}

interface PhaseAlertsModule {
  requestPermission(): Promise<boolean>;
  schedule(alerts: Alert[]): void;
  cancelAll(): void;
}

// iOS keeps at most 64 pending local notifications per app.
const MAX_ALERTS = 60;

export function alertsFor(session: Session, now: number): Alert[] {
  const rounds =
    session.routine.spec.type === 'interval'
      ? session.routine.spec.rounds
      : session.routine.spec.cycles;
  return upcomingBoundaries(session, now)
    .slice(0, MAX_ALERTS)
    .map(({ at, phase, index }) => ({
      id: `phase-${index}`,
      at,
      title: phase
        ? phaseLabel[phase.kind] +
          (phase.round !== undefined
            ? ` · Round ${phase.round} of ${rounds}`
            : '')
        : `${session.routine.name} complete`,
      body: phase ? formatDuration(phase.durationMs) : 'Nice work.',
    }));
}

/**
 * Phase changes are announced in-app while the app is open. Once it goes to
 * the background, every remaining change is handed to the OS as a scheduled
 * local notification, so cues arrive on time even if the process is
 * suspended or killed. Returning to the app, or any change to the session,
 * replaces the schedule.
 */
async function requestPermission(native: PhaseAlertsModule) {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  }
  return native.requestPermission();
}

export function startPhaseAlerts(): () => void {
  const native: PhaseAlertsModule | undefined = NativeModules.PhaseAlerts;
  if (!native) return () => {};

  let appState: string | null | undefined = AppState.currentState;

  const sync = () => {
    native.cancelAll();
    const { session } = useStore.getState();
    // Only schedule once the app is known to be away; at launch the state
    // can briefly be unknown, and scheduling then would double up with the
    // in-app cue.
    const away = appState === 'background' || appState === 'inactive';
    if (!away || !session) return;
    const alerts = alertsFor(session, Date.now());
    if (alerts.length > 0) native.schedule(alerts);
  };

  const appSub = AppState.addEventListener('change', next => {
    appState = next;
    sync();
  });
  const storeSub = useStore.subscribe((state, prev) => {
    if (state.session !== prev.session) {
      if (state.session && !prev.session) requestPermission(native);
      sync();
    }
  });

  return () => {
    appSub.remove();
    storeSub();
    native.cancelAll();
  };
}
