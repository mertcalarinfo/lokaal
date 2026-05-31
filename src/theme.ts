/**
 * PREZENCE — Design Tokens (Quelle: DESIGN_SYSTEM.html)
 * Ausschließlich diese Werte verwenden. Nichts erfinden.
 */

// ─── Farben ──────────────────────────────────────────────────────────────────

export const C = {
  // Backgrounds
  bg:             '#0A1422',                    // App-Canvas, jeder Screen
  bgDeep:         '#070F1B',                    // Bottom-Nav, Scrims
  surface:        '#121C2B',                    // Cards, Panels, Inputs
  surface2:       '#17222F',                    // Pressed / Hover
  surfaceAccent:  'rgba(226,211,176,0.12)',      // Icon-Chips, Accent-Tints

  // Linien
  hairline:       'rgba(255,255,255,0.12)',      // Card-Ränder, starke Trennlinien
  line:           'rgba(255,255,255,0.07)',      // Subtile Trenner in Listen

  // Text
  text:           '#F2EFE9',                    // Primär — warmweiß
  textMuted:      '#8B93A1',                    // Sekundär — Body
  textFaint:      '#5D6573',                    // Tertiär — Captions

  // Accent (Sand) — NUR für Scores, Progress, aktive Zustände
  accent:         '#E2D3B0',
  accentDim:      '#CAB88F',                    // Pressed / Alt-Balken
  onAccent:       '#1A1305',                    // Text/Icon auf Accent-Flächen

  // Status
  success:        '#76C49B',
  successBg:      'rgba(118,196,155,0.12)',
  error:          '#E8927C',
  errorBg:        'rgba(232,146,124,0.10)',
} as const;

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
