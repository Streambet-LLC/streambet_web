import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useRef, useCallback } from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function useDebounce<T extends (...args: any[]) => any>(func: T, wait: number = 700) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const resultRef = useRef<ReturnType<T>>();

  return useCallback(
    (...args: Parameters<T>): ReturnType<T> => {
      const later = () => {
        timeoutRef.current = undefined;
        resultRef.current = func(...args);
      };

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(later, wait);
      return resultRef.current;
    },
    [func, wait]
  );
}
