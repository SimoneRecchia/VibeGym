import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useStore } from '../data/store';
import { buildPalette, Palette } from './colors';

interface Theme {
  c: Palette;
  dark: boolean;
}

const Ctx = createContext<Theme>({
  c: buildPalette(false, 'blue'),
  dark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useStore(s => s.settings.theme);
  const accent = useStore(s => s.settings.accent);
  const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
  const value = useMemo(
    () => ({ c: buildPalette(dark, accent), dark }),
    [dark, accent],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
