/**
 * PREZENCE — Design Tokens (Quelle: DESIGN_SYSTEM.html)
 * Ausschließlich diese Werte verwenden. Nichts erfinden.
 *
 * Farb-Tokens gibt es in zwei Paletten: darkPalette und lightPalette.
 * Komponenten beziehen Farben über useTheme() → T (aktive Palette).
 * F, R, S sind theme-unabhängig und können direkt importiert werden.
 */

// ─── Farbpaletten ─────────────────────────────────────────────────────────────

export const darkPalette = {
  // Backgrounds
  bg:             '#0A1422',                      // App-Canvas, jeder Screen
  bgDeep:         '#070F1B',                      // Bottom-Nav, Scrims
  surface:        '#121C2B',                      // Cards, Panels, Inputs
  surface2:       '#17222F',                      // Pressed / Hover
  surfaceAccent:  'rgba(226,211,176,0.12)',        // Icon-Chips, Accent-Tints
  surfaceAlt:     'rgba(255,255,255,0.025)',       // Minimale Streifenfarbe (Compare-Tabelle)

  // Linien
  hairline:       'rgba(255,255,255,0.12)',        // Card-Ränder, starke Trennlinien
  line:           'rgba(255,255,255,0.07)',        // Subtile Trenner in Listen

  // Text
  text:           '#F2EFE9',                      // Primär — warmweiß
  textMuted:      '#8B93A1',                      // Sekundär — Body
  textFaint:      '#5D6573',                      // Tertiär — Captions

  // Accent (Sand) — NUR für Scores, Progress, aktive Zustände
  accent:         '#E2D3B0',
  accentDim:      '#CAB88F',                      // Pressed / Alt-Balken
  accentRgb:      '226,211,176',                  // Für Chart rgba()-Konstrukte
  onAccent:       '#1A1305',                      // Text/Icon auf Accent-Flächen

  // Status
  success:        '#76C49B',
  successBg:      'rgba(118,196,155,0.12)',
  error:          '#E8927C',
  errorBg:        'rgba(232,146,124,0.10)',
} as const;

export const lightPalette = {
  // Backgrounds
  bg:             '#F4F1EA',
  bgDeep:         '#EDE9E0',
  surface:        '#FFFFFF',
  surface2:       '#F0ECE3',
  surfaceAccent:  'rgba(168,136,78,0.12)',
  surfaceAlt:     'rgba(15,27,45,0.03)',

  // Linien
  hairline:       'rgba(15,27,45,0.14)',
  line:           'rgba(15,27,45,0.08)',

  // Text
  text:           '#0F1B2D',                      // Navy — Logo im UI
  textMuted:      '#5C6675',
  textFaint:      '#8A93A1',

  // Accent (Bronze) — NUR für Scores, Progress, aktive Zustände
  accent:         '#A8884E',
  accentDim:      '#8F7140',
  accentRgb:      '168,136,78',
  onAccent:       '#FFFFFF',

  // Status
  success:        '#3F9B6E',
  successBg:      'rgba(63,155,110,0.12)',
  error:          '#C75B43',
  errorBg:        'rgba(199,91,67,0.10)',
} as const;

/**
 * Typdefinition der aktiven Farbpalette.
 * Als gemappter Typ auf string geweitet, damit dark- und lightPalette beide zuweisbar sind.
 * Komponenten erhalten T: ThemeColors via useTheme().
 */
export type ThemeColors = { [K in keyof typeof darkPalette]: string };

/**
 * C — Dark-Palette als Legacy-Konstante.
 * Neue Screens sollen T aus useTheme() verwenden.
 * Nur für statische, nicht-theme-sensitive Referenzen (z. B. Splash) weiterhin nutzbar.
 */
export const C = darkPalette;

// ─── Radius ───────────────────────────────────────────────────────────────────

export const R = {
  xs:   6,    // Chips
  sm:   10,   // Buttons
  md:   14,   // Inputs, kleine Cards
  lg:   16,   // Cards, Panels
  xl:   22,   // Große Container
  pill: 999,  // Credits, Tags
} as const;

// ─── Spacing (4-basiert) ──────────────────────────────────────────────────────

export const S = {
  s1:  4,
  s2:  8,
  s3:  12,
  s4:  16,
  s5:  20,
  s6:  24,
  s8:  32,
  s10: 40,
  screen: 22, // horizontales Screen-Padding
} as const;

// ─── Schriftarten (in App.tsx geladen) ───────────────────────────────────────

export const F = {
  regular:   'HankenGrotesk_400Regular',
  medium:    'HankenGrotesk_500Medium',
  semiBold:  'HankenGrotesk_600SemiBold',
  bold:      'HankenGrotesk_700Bold',
  xBold:     'HankenGrotesk_800ExtraBold',
  mono:      'JetBrainsMono_400Regular',
  monoMd:    'JetBrainsMono_500Medium',
} as const;
