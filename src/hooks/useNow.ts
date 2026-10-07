import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Re-renders on a steady cadence while `active`. The interval only drives
 * repaints; displayed values are always computed from Date.now(), so a late
 * or dropped tick can never make the timer drift.
 */
export function useNow(active: boolean, intervalMs = 200): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [active, intervalMs]);

  return now;
}
