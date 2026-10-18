import { useEffect, useState } from 'react';

/** Current time, refreshed every `ms` while `enabled`. */
export const useNow = (ms = 1000, enabled = true): number => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
  return now;
};
