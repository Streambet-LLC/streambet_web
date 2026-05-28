/**
 * Global toggle for the admin Analytics views: when ON, components hide
 * anything that is currently sourced from `@/mocks/analytics` and only
 * render fields backed by real CardCade data (buy/sell, seller socials,
 * category mix). Persisted to localStorage so refreshes keep the choice.
 */

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'analytics:realDataOnly';

const readInitial = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

// Lightweight cross-component sync — every hook instance subscribes to the
// same event so flipping the toggle in the page header instantly updates
// every analytics surface without prop drilling.
const EVENT = 'analytics:realDataOnly:changed';

export const useRealDataOnly = (): [boolean, (next: boolean) => void] => {
  const [value, setValue] = useState<boolean>(readInitial);

  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<boolean>).detail;
      setValue(next);
    };
    window.addEventListener(EVENT, handler as EventListener);
    return () => window.removeEventListener(EVENT, handler as EventListener);
  }, []);

  const update = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore storage failures */
    }
    window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: next }));
    setValue(next);
  }, []);

  return [value, update];
};

/** Read-only accessor for components that only need the current value. */
export const useIsRealDataOnly = (): boolean => {
  const [value] = useRealDataOnly();
  return value;
};
