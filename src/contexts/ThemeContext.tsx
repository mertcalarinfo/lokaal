/**
 * ThemeContext — zentrale Theme-Verwaltung für Dark / Light / System.
 *
 * Preference wird in AsyncStorage gespeichert und überschreibt das System-Theme.
 * Komponenten beziehen Farben via useTheme() → T (aktive Palette).
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkPalette, lightPalette, ThemeColors } from '../theme';

// ─── Typen ────────────────────────────────────────────────────────────────────

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  /** Gespeicherte Nutzer-Präferenz ('system' | 'light' | 'dark'). */
  themePreference: ThemePreference;
  /** Ändert Präferenz und persistiert in AsyncStorage. */
  setThemePreference: (p: ThemePreference) => Promise<void>;
  /** Aktive Farbpalette — immer verwenden statt direktem Import von C. */
  T: ThemeColors;
  /** true wenn das aktive Theme dunkel ist. */
  isDark: boolean;
}

const THEME_KEY = '@prezence:theme_preference';

const ThemeContext = createContext<ThemeContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [hydrated, setHydrated] = useState(false);

  // Gespeicherte Präferenz laden
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((val) => {
        if (val === 'light' || val === 'dark' || val === 'system') {
          setPreference(val);
        }
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const setThemePreference = useCallback(async (p: ThemePreference) => {
    setPreference(p);
    try {
      await AsyncStorage.setItem(THEME_KEY, p);
    } catch {
      // ignore — state ist bereits aktualisiert
    }
  }, []);

  const isDark = useMemo(() => {
    if (preference === 'light') return false;
    if (preference === 'dark') return true;
    // System: fehlende Erkennung → Dark als Default
    return systemScheme !== 'light';
  }, [preference, systemScheme]);

  const T: ThemeColors = isDark ? darkPalette : lightPalette;

  const value = useMemo<ThemeContextType>(
    () => ({ themePreference: preference, setThemePreference, T, isDark }),
    [preference, setThemePreference, T, isDark]
  );

  // Render erst nach AsyncStorage-Hydration, damit kein Farb-Flash auftritt.
  if (!hydrated) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      'useTheme must be used within a <ThemeProvider>. ' +
        'Wrap the root component (App.tsx) with <ThemeProvider>.'
    );
  }
  return ctx;
};
