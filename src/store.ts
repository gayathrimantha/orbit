import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  back,
  pause,
  resume,
  settle,
  skip,
  snapshot,
  start,
  stop,
  type Routine,
  type Session,
} from './engine';
import { presets } from './presets';

export interface HistoryEntry {
  id: string;
  routineName: string;
  kind: Routine['spec']['type'];
  startedAt: number;
  finishedAt: number;
  activeMs: number;
  completed: boolean;
}

interface State {
  ready: boolean;
  routines: Routine[];
  session: Session | null;
  history: HistoryEntry[];
  hydrate: () => Promise<void>;
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  startSession: (r: Routine) => void;
  /** `at` lets a control tapped on the watch apply at the moment it was tapped. */
  control: (
    action: 'pause' | 'resume' | 'skip' | 'back' | 'stop',
    at?: number,
  ) => void;
  tick: (now: number) => void;
  dismissSession: () => void;
}

const KEYS = {
  routines: 'orbit.routines.v1',
  session: 'orbit.session.v1',
  history: 'orbit.history.v1',
} as const;

const HISTORY_LIMIT = 500;

export const newId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function persist(key: string, value: unknown) {
  const write =
    value === null
      ? AsyncStorage.removeItem(key)
      : AsyncStorage.setItem(key, JSON.stringify(value));
  write.catch(err => console.warn(`persist ${key} failed`, err));
}

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Time spent in work or focus phases, up to where the session got to. */
export function activeMs(s: Session): number {
  const elapsed = snapshot(s, s.finishedAt ?? Date.now()).totalElapsedMs;
  const active = s.routine.spec.type === 'interval' ? 'work' : 'focus';
  let t = 0;
  let total = 0;
  for (const p of s.phases) {
    if (p.kind === active) {
      total += Math.max(0, Math.min(elapsed, t + p.durationMs) - t);
    }
    t += p.durationMs;
  }
  return total;
}

function toHistory(s: Session): HistoryEntry {
  const snap = snapshot(s, s.finishedAt ?? Date.now());
  return {
    id: newId(),
    routineName: s.routine.name,
    kind: s.routine.spec.type,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt ?? Date.now(),
    activeMs: activeMs(s),
    completed: snap.totalRemainingMs === 0,
  };
}

export const useStore = create<State>((set, get) => {
  /** Applies a session change, recording history the moment it finishes. */
  function commit(next: Session | null) {
    const prev = get().session;
    set({ session: next });
    persist(KEYS.session, next);
    if (next && next.finishedAt !== null && prev?.finishedAt === null) {
      const history = [toHistory(next), ...get().history].slice(
        0,
        HISTORY_LIMIT,
      );
      set({ history });
      persist(KEYS.history, history);
    }
  }

  return {
    ready: false,
    routines: presets,
    session: null,
    history: [],

    hydrate: async () => {
      const [routines, session, history] = await Promise.all([
        read<Routine[]>(KEYS.routines),
        read<Session>(KEYS.session),
        read<HistoryEntry[]>(KEYS.history),
      ]);
      set({
        ready: true,
        routines: routines ?? presets,
        history: history ?? [],
        session: null,
      });
      // A session that ran out while the app was closed is finished, not
      // resumed. Restoring it first lets commit() see the transition and log it.
      if (session) {
        set({ session });
        commit(settle(session, Date.now()));
      }
    },

    saveRoutine: r => {
      const routines = get().routines.some(x => x.id === r.id)
        ? get().routines.map(x => (x.id === r.id ? r : x))
        : [...get().routines, r];
      set({ routines });
      persist(KEYS.routines, routines);
    },

    deleteRoutine: id => {
      const routines = get().routines.filter(r => r.id !== id);
      set({ routines });
      persist(KEYS.routines, routines);
    },

    startSession: r => commit(start(r, Date.now())),

    control: (action, at = Date.now()) => {
      const s = get().session;
      if (!s) return;
      const fn = { pause, resume, skip, back, stop }[action];
      commit(fn(s, at));
    },

    tick: now => {
      const s = get().session;
      if (!s || s.finishedAt !== null) return;
      const settled = settle(s, now);
      if (settled !== s) commit(settled);
    },

    dismissSession: () => commit(null),
  };
});
