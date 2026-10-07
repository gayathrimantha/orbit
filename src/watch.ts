import { NativeEventEmitter, NativeModules } from 'react-native';
import { useStore } from './store';

type WatchControl = {
  action: 'pause' | 'resume' | 'skip' | 'back';
  at: number;
};

const ACTIONS = new Set(['pause', 'resume', 'skip', 'back']);

/**
 * Keeps the watch in step with the phone. The session record is the whole
 * protocol: the watch renders it locally, so nothing is sent per tick.
 */
export function startWatchSync(): () => void {
  const bridge = NativeModules.WatchBridge;
  if (!bridge) return () => {};

  const send = () => {
    const { session } = useStore.getState();
    bridge.sendSession(session ? JSON.stringify(session) : null);
  };

  const emitter = new NativeEventEmitter<{ watchControl: [WatchControl] }>(
    bridge,
  );
  const controls = emitter.addListener('watchControl', (e: WatchControl) => {
    if (ACTIONS.has(e.action) && Number.isFinite(e.at)) {
      useStore.getState().control(e.action, e.at);
    }
  });
  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.session !== prev.session) send();
  });
  send();

  return () => {
    controls.remove();
    unsubscribe();
  };
}
