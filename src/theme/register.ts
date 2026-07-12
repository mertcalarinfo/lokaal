/**
 * Design-Tokens — Variante "Register"
 * Quelle: Prezence-Design-Spec-V3-Register.md
 * Einheitlicher Look (ersetzt Dark/Light-Varianten temporär).
 * Alle px-Werte 1:1 aus dem Mockup als React-Native-dp übernommen.
 */

// ─── Farben ───────────────────────────────────────────────────────────────────

export const RC = {
  bg:             '#FCFBF9',  // helleres, fast neutrales Weiß (Option B) statt warmem Cremeweiß
  bgElevated:     '#FFFFFF',  // erhöhte Flächen leicht heller als bg, konsistent zum neuen Grund
  text:           '#211F1B',
  muted:          '#6E685D',
  faint:          '#8A8478',
  ghost:          '#BEB7A8',  // leicht abgedunkelt, damit Registernummern/Platzhalter auf hellerem Grund sichtbar bleiben
  accent:         '#1E3AE0',
  onAccent:       '#F6F1E8',
  line:           'rgba(33,31,27,0.18)',
  lineFaint:      'rgba(33,31,27,0.09)',
  lineStrong:     '#211F1B',
  lineTable:      'rgba(33,31,27,0.14)',
  accentLine:     'rgba(30,58,224,0.25)',
  accentWash:     'rgba(30,58,224,0.07)',  // +0.01, damit die Fokus-/Auswahl-Tönung auf hellerem Grund sichtbar bleibt
  accentFill:     'rgba(30,58,224,0.11)',
  radarRing:      'rgba(33,31,27,0.16)',
  radarRingInner: 'rgba(33,31,27,0.10)',
} as const;

// ─── Typografie ───────────────────────────────────────────────────────────────

/** Hanken Grotesk Regular — alle Metadaten, Labels, Tabellen, Rubriken */
export const MONO     = 'HankenGrotesk_400Regular';
/** Hanken Grotesk Medium — Button-Label, Wortmarke, Fokus-Zeilen */
export const MONO_MED = 'HankenGrotesk_500Medium';
// Sans (Score-Zahlen, Body): System-Default → fontFamily weglassen

// ─── Schatten ─────────────────────────────────────────────────────────────────
// Einziger Schatten: Primary-Button

export const BTN_SHADOW = {
  shadowColor:   '#1E3AE0',
  // Softer cobalt lift: the previous opacity 0.5 / radius 30 produced a glow
  // strong enough to bleed over the text below the button (iOS). Reduced so the
  // footnote under the analyze button stays readable.
  shadowOpacity: 0.25,
  shadowRadius:  18,
  shadowOffset:  { width: 0, height: 12 },
  elevation:     8,
} as const;

// ─── Radien ───────────────────────────────────────────────────────────────────

export const RR = {
  button: 15,
  pill:   20,
} as const;

// ─── Haarlinien ───────────────────────────────────────────────────────────────

export const HL = {
  strong: 1.5,  // Aktenkopf-Unterstrich, Tabellenkopf
  std:    1,    // Home-Registerzeilen
  faint:  1,    // Analyse-Legendenzeilen
  table:  1,    // Verlaufstabellenzeilen
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const RS = {
  screenH:    24,   // horizontaler Screen-Rand
  headTop:    12,   // Aktenkopf marginTop
  headPadB:   9,    // Aktenkopf paddingBottom
  gap34:      34,   // Aktenkopf → erster Inhalt (Home/Fortschritt)
  gap12:      12,   // Aktenkopf → erster Inhalt (Analyse)
  gap30:      30,   // Aktenkopf → Score (Fortschritt)
  gap36:      36,   // Score → Register/Tabelle darunter
  rowV:       13,   // vertikales Padding Register-Zeile (Home/Tabelle)
  rowVDense:  5.5,  // vertikales Padding Legende (Analyse, dicht)
  btnBottom:  30,   // Primary-Button Außenrand unten
} as const;

// ─── Typ-Styles (Kurzreferenz) ────────────────────────────────────────────────
// Nicht als StyleSheet — nur als Datentabelle für Inline-Nutzung.

export const RT = {
  scoreHero:   { fontSize: 128, fontWeight: '600' as const, lineHeight: 102.4, letterSpacing: -6 },
  scoreLg:     { fontSize: 110, fontWeight: '600' as const, lineHeight: 85.8,  letterSpacing: -5 },
  scoreMd:     { fontSize: 62,  fontWeight: '600' as const, lineHeight: 48.4,  letterSpacing: -3 },
  unit:        { fontFamily: MONO, fontSize: 16, lineHeight: 16 },
  unitSm:      { fontFamily: MONO, fontSize: 10, lineHeight: 10, letterSpacing: 1 },
  rubric:      { fontFamily: MONO, fontSize: 10, lineHeight: 10, letterSpacing: 4 },
  kicker:      { fontFamily: MONO_MED, fontSize: 12, lineHeight: 12, letterSpacing: 2 },
  metaR:       { fontFamily: MONO, fontSize: 11, lineHeight: 11, letterSpacing: 1 },
  headTitle:   { fontFamily: MONO, fontSize: 12, lineHeight: 12, letterSpacing: 1 },
  deltaAccent: { fontFamily: MONO, fontSize: 12, lineHeight: 12, letterSpacing: 1 },
  tableHead:   { fontFamily: MONO, fontSize: 9,  lineHeight: 9,  letterSpacing: 1 },
  legendRow:   { fontFamily: MONO, fontSize: 11.5, lineHeight: 11.5 },
  tableRow:    { fontFamily: MONO, fontSize: 12.5, lineHeight: 12.5 },
  regLabel:    { fontFamily: MONO, fontSize: 12, lineHeight: 12, letterSpacing: 1 },
  regValue:    { fontFamily: MONO, fontSize: 13, lineHeight: 13 },
  regNum:      { fontFamily: MONO, fontSize: 11, lineHeight: 11 },
  btn:         { fontFamily: MONO_MED, fontSize: 14, lineHeight: 14, letterSpacing: 2 },
} as const;

// ─── Demo-Daten ───────────────────────────────────────────────────────────────
// Werden in Screens als Platzhalter genutzt — alle Felder aus Props/State überschreiben.

export type RadarCategory = {
  key:   string;
  label: string;
  value: number;
  delta: number;
};

export const DEMO_CATEGORIES: RadarCategory[] = [
  { key: 'koerper',  label: 'KÖRPERSPRACHE', value: 74, delta: +3 },
  { key: 'blick',    label: 'BLICKKONTAKT',  value: 81, delta: +5 },
  { key: 'stimme',   label: 'STIMME',        value: 70, delta: +1 },
  { key: 'tempo',    label: 'SPRECHTEMPO',   value: 52, delta: -2 },
  { key: 'fueller',  label: 'FÜLLWÖRTER',    value: 58, delta: +2 },
  { key: 'mimik',    label: 'MIMIK',         value: 66, delta: +1 },
  { key: 'gestik',   label: 'GESTIK',        value: 71, delta: +4 },
  { key: 'struktur', label: 'STRUKTUR',      value: 77, delta: +2 },
  { key: 'ueber',    label: 'ÜBERZEUGUNG',   value: 69, delta: +3 },
];
