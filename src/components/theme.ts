import { darkPalette, lightPalette } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

export function useColors(mode?: 'light' | 'dark') {
  const { isDark } = useTheme();
  const resolved = mode ?? (isDark ? 'dark' : 'light');
  const palette = resolved === 'dark' ? darkPalette : lightPalette;
  return {
    ...palette,
    shadowOpacity: resolved === 'dark' ? 0.9 : 0.12,
    muted: palette.textMuted,
    faint: palette.textFaint,
  };
}
