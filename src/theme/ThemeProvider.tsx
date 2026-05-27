import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mode, Palette, palettes } from './tokens';

type ThemeCtx = {
  mode: Mode;
  palette: Palette;
  toggle: () => void;
  setMode: (m: Mode) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);
const THEME_KEY = 'vibegym_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() =>
    (Appearance.getColorScheme() ?? 'dark') === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') setModeState(saved);
    });
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem(THEME_KEY, m).catch(() => {});
  }, []);

  const toggle = useCallback(() => setMode(mode === 'dark' ? 'light' : 'dark'), [mode, setMode]);

  const value = useMemo<ThemeCtx>(
    () => ({ mode, palette: palettes[mode], toggle, setMode }),
    [mode, toggle, setMode]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}
