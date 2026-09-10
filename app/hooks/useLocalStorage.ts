"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * SSR-safe localStorage-backed state. Returns `defaultValue` on the server
 * and on first client render, then hydrates from storage in an effect --
 * a v1/v2 key suffix (chosen by the caller) is the migration strategy: a
 * future incompatible shape ships under a new key and simply stops reading
 * the old one, rather than any real migration logic living here.
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    // Deferred on purpose: localStorage doesn't exist during SSR, so reading
    // it during render (even via a lazy useState initializer) would make the
    // client's first render disagree with the server-rendered HTML. Hydrating
    // one tick later in an effect is the correct fix, not a rule violation.
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // Malformed JSON or storage unavailable (private mode, quota) --
      // fall back to the default rather than throwing.
    }
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage unavailable (private mode, quota) -- state still updates in memory.
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, update] as const;
}
