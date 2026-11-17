/**
 * PREZENCE — Design-Tokens (Entwurf 5, einzige Theme-Datei)
 *
 * Quelle: Design-Auftrag v5 + HTML-Entwürfe (1 CSS-px = 1 pt).
 * Farben kommen immer aus der aktiven Palette: useTheme() → T.
 * F (Schrift), R (Radien), S (Abstände) und TY (Textstile) sind modusunabhängig.
 *
 * Regeln: Blau (#0A6CFF) ist die einzige Akzentfarbe. Kein Grün/Rot für Scores —
 * Verbesserung = accentText, Verschlechterung = textSecondary.
 */

import { TextStyle } from 'react-native';

// ─── Farbpaletten ─────────────────────────────────────────────────────────────

export const lightPalette = {
  bg:             '#F3F5F9',
  card:           '#FFFFFF',
  cardBorder:     'rgba(11,18,32,0.07)',
  text:           '#0B1220',
  textSecondary:  '#566074',
  /** Buttons, Haupt-Ring, Linien */
  accent:         '#0A6CFF',
  /** Balken, Diagrammlinie, Ring in Daten-Darstellungen */
  accentData:     '#0A6CFF',
  /** Links und Werte in Blau */
  accentText:     '#0A5BD8',
  /** Aktiver Tab, Icon-Kacheln */
  accentTint:     'rgba(10,108,255,0.10)',
  /** Weiß auf accent (Kontrast ca. 4,6:1) */
  onAccent:       '#FFFFFF',
  track:          'rgba(11,18,32,0.08)',
  hairline:       'rgba(11,18,32,0.07)',
  disabledBg:     'rgba(11,18,32,0.07)',
  disabledText:   '#7A8599',
  glassBg:        'rgba(255,255,255,0.66)',
  /** Fallback ohne Blur: etwas deckender */
  glassBgSolid:   'rgba(255,255,255,0.92)',
  glassBorder:    'rgba(255,255,255,0.9)',
  glassHighlight: '#FFFFFF',
  /** Leichte Abdunklung hinter Modals */
  scrim:          'rgba(11,18,32,0.32)',

  // Schatten (RN boxShadow, New Architecture)
  shadowCard:     '0 1px 2px rgba(11,18,32,0.04), 0 14px 34px rgba(11,18,32,0.07)',
  shadowGlass:    '0 14px 34px rgba(11,18,32,0.14)',
  shadowGlassSm:  '0 8px 24px rgba(11,18,32,0.08)',
  shadowButton:   '0 6px 18px rgba(10,108,255,0.32)',
  shadowButtonLg: '0 10px 26px rgba(10,108,255,0.36)',
  shadowPrice:    '0 10px 28px rgba(10,108,255,0.14)',

  // Hintergrund (AmbientBackground)
  ambientBlob:        '#0A6CFF',
  ambientBlobOpacity: '0.16',
  ambientLine:        '#0A6CFF',
  ambientLineOpacity: '0.5',
} as const;

export const darkPalette: ThemeColors = {
  bg:             '#0A0D14',
  card:           '#121823',
  cardBorder:     'rgba(255,255,255,0.07)',
  text:           '#F2F5FA',
  textSecondary:  '#9AA6BA',
  accent:         '#0A6CFF',
  accentData:     '#2F86FF',
  accentText:     '#5CA5FF',
  accentTint:     'rgba(10,108,255,0.22)',
  onAccent:       '#FFFFFF',
  track:          'rgba(255,255,255,0.09)',
  hairline:       'rgba(255,255,255,0.07)',
  disabledBg:     'rgba(255,255,255,0.08)',
  disabledText:   '#6F7B90',
  glassBg:        'rgba(34,42,58,0.58)',
  glassBgSolid:   'rgba(30,37,51,0.94)',
  glassBorder:    'rgba(255,255,255,0.12)',
  glassHighlight: 'rgba(255,255,255,0.14)',
  scrim:          'rgba(0,0,0,0.5)',

  shadowCard:     '0 14px 34px rgba(0,0,0,0.40)',
  shadowGlass:    '0 14px 34px rgba(0,0,0,0.45)',
  shadowGlassSm:  '0 8px 24px rgba(0,0,0,0.35)',
  shadowButton:   '0 6px 18px rgba(10,108,255,0.45)',
  shadowButtonLg: '0 10px 28px rgba(10,108,255,0.45)',
  shadowPrice:    '0 10px 30px rgba(10,108,255,0.22)',

  ambientBlob:        '#0A6CFF',
  ambientBlobOpacity: '0.30',
  ambientLine:        '#2F86FF',
  ambientLineOpacity: '0.75',
};

/** Typ der aktiven Palette (hell und dunkel haben dieselben Schlüssel). */
export type ThemeColors = { [K in keyof typeof lightPalette]: string };

// ─── Schrift (Inter, in App.tsx geladen) ──────────────────────────────────────
// Auf iOS mit eigener Schrift nur fontFamily setzen, kein fontWeight.

export const F = {
  light:    'Inter_300Light',
  regular:  'Inter_400Regular',
  medium:   'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
} as const;

const NUM: TextStyle['fontVariant'] = ['tabular-nums'];

/** Textstile ohne Farbe — Farbe kommt aus T. */
export const TY = {
  /** Seitentitel 32/38, 500 */
  pageTitle: { fontFamily: F.medium, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  /** Label in Großbuchstaben 11/600, Abstand 2.2 (Farbe textSecondary) */
  label:     { fontFamily: F.semiBold, fontSize: 11, lineHeight: 14, letterSpacing: 2.2, textTransform: 'uppercase' },
  rowTitle:  { fontFamily: F.semiBold, fontSize: 16, lineHeight: 21 },
  rowTitleSm:{ fontFamily: F.semiBold, fontSize: 15, lineHeight: 20 },
  body:      { fontFamily: F.regular, fontSize: 15, lineHeight: 22 },
  bodySm:    { fontFamily: F.regular, fontSize: 14, lineHeight: 20 },
  bodyMedium:{ fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
  caption:   { fontFamily: F.regular, fontSize: 13, lineHeight: 18 },
  captionSm: { fontFamily: F.regular, fontSize: 12, lineHeight: 16 },
  /** Große dünne Zahl (Score) */
  scoreLg:   { fontFamily: F.light, fontSize: 40, lineHeight: 44, letterSpacing: -1.5, fontVariant: NUM },
  scoreMd:   { fontFamily: F.light, fontSize: 36, lineHeight: 40, letterSpacing: -1.4, fontVariant: NUM },
  button:    { fontFamily: F.semiBold, fontSize: 16, letterSpacing: 0.16 },
  buttonSm:  { fontFamily: F.semiBold, fontSize: 14 },
  num:       { fontVariant: NUM },
} satisfies Record<string, TextStyle>;

// ─── Radien ───────────────────────────────────────────────────────────────────

export const R = {
  card:     18,
  cardSm:   16,
  button:   14,
  buttonSm: 12,
  tile:     12,
  tabBar:   20,
  tab:      14,
  segment:  14,
  segmentItem: 10,
} as const;

// ─── Abstände ─────────────────────────────────────────────────────────────────

export const S = {
  s1:  4,
  s2:  8,
  s3:  12,
  s4:  16,
  s5:  20,
  s6:  24,
  s8:  32,
  s10: 40,
  /** Seitenrand links/rechts */
  screen: 24,
  /** Oberkante Inhalt unter der Statusleiste (Vorlage: 58 ab Bildschirmrand) */
  top: 12,
  /** Mindestgröße tippbarer Elemente */
  hit: 44,
} as const;

// ─── Maße ─────────────────────────────────────────────────────────────────────

export const SIZE = {
  buttonH:   56,
  buttonSmH: 44,
  tabBarH:   64,
  /** Abstand der schwebenden Tab-Leiste über der Safe Area */
  tabBarGap: 8,
} as const;
