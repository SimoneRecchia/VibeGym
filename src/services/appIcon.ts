/** Home screen icon color, read from and applied to the system. */
import { useEffect, useState } from 'react';
import { appIconAvailable, getAppIcon, setAppIcon } from 'vibe-app-icon';
import { DEFAULT_APP_ICON } from '../ui/AppIcon';

export { appIconAvailable };

export function useAppIcon() {
  const [icon, setIcon] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getAppIcon(DEFAULT_APP_ICON)
      .then(k => alive && setIcon(k ?? DEFAULT_APP_ICON))
      .catch(() => alive && setIcon(DEFAULT_APP_ICON));
    return () => {
      alive = false;
    };
  }, []);
  const change = async (key: string) => {
    const prev = icon;
    setIcon(key);
    try {
      await setAppIcon(key, DEFAULT_APP_ICON);
    } catch (e) {
      setIcon(prev);
      throw e;
    }
  };
  return { icon, change };
}
