import { useEffect, useState } from 'react';

/** Milliseconds until `target`, ticking every second (stops at 0). */
export function useCountdown(target: string | Date | null | undefined): number {
  const t = target ? new Date(target).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!t) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [t]);
  return t ? Math.max(0, t - now) : 0;
}
