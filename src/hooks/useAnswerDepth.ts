import { useCallback, useEffect, useState } from 'react';

/**
 * Answer depth ("data intensity & length") — one shared preference that scales
 * how hard Cardy thinks, how much live data it pulls, and how long answers run.
 * Persisted to localStorage and synced across every mounted control so the
 * chat and the deep-dive panel always agree.
 */
export type AnswerDepth = 'quick' | 'balanced' | 'deep';

export const DEPTHS: { key: AnswerDepth; label: string; hint: string }[] = [
  { key: 'quick', label: 'Brief', hint: 'Fast, concise answers with lighter research.' },
  { key: 'balanced', label: 'Balanced', hint: 'A useful read across the key dimensions.' },
  { key: 'deep', label: 'Deep', hint: 'Thorough, longer answers with deeper web research.' },
];

const KEY = 'collectiq:answerDepth';
const EVENT = 'collectiq:answerDepth:changed';

const read = (): AnswerDepth => {
  if (typeof window === 'undefined') return 'balanced';
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'quick' || v === 'deep' ? v : 'balanced';
  } catch {
    return 'balanced';
  }
};

export function useAnswerDepth(): [AnswerDepth, (d: AnswerDepth) => void] {
  const [depth, setDepth] = useState<AnswerDepth>(read);

  // Keep every mounted instance in lock-step (same-tab event + cross-tab storage).
  useEffect(() => {
    const onChange = () => setDepth(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const set = useCallback((d: AnswerDepth) => {
    try {
      window.localStorage.setItem(KEY, d);
    } catch {
      /* storage unavailable — keep in-memory only */
    }
    setDepth(d);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [depth, set];
}
