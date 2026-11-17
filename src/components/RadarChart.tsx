import React, { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, withDelay, Easing, SharedValue,
} from 'react-native-reanimated';
import Svg, { Polygon, Line, Circle, Path, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../theme';

const AnimatedPath   = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Geometrie-Konstanten ─────────────────────────────────────────────────────
// viewBox: -72 -22 384 300 → logisches Koordinatensystem: Zentrum (120,120), MaxR=100
const CX = 120, CY = 120, MAX_R = 100;

// Exakte, handjustierte Label-Positionen aus der Spec (§2.5) — NUR für die volle
// 9-Achsen-Ansicht (Pro). Für andere Achsenzahlen (z.B. das 3-Achsen-Dreieck bei
// Free) werden die Positionen unten dynamisch aus dem Winkel berechnet.
const LABEL_POS_9 = [
  { x: 120, y: -8,  anchor: 'middle' as const },   // 0°   → Index 0
  { x: 200, y: 30,  anchor: 'start'  as const },   // 40°  → Index 1
  { x: 240, y: 103, anchor: 'start'  as const },   // 80°  → Index 2
  { x: 226, y: 186, anchor: 'start'  as const },   // 120° → Index 3
  { x: 160, y: 247, anchor: 'middle' as const },   // 160° → Index 4
  { x: 80,  y: 247, anchor: 'middle' as const },   // 200° → Index 5
  { x: 12,  y: 186, anchor: 'end'    as const },   // 240° → Index 6
  { x: 0,   y: 103, anchor: 'end'    as const },   // 280° → Index 7
  { x: 40,  y: 30,  anchor: 'end'    as const },   // 320° → Index 8
];

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function pt(r: number, i: number, n: number): [number, number] {
  const theta = (i * 360 / n) * (Math.PI / 180);
  return [CX + r * Math.sin(theta), CY - r * Math.cos(theta)];
}

function polyPoints(r: number, n: number): string {
  return Array.from({ length: n }, (_, i) => pt(r, i, n).join(',')).join(' ');
}

function spokeCoords(i: number, n: number): { x1: number; y1: number; x2: number; y2: number } {
  const [x2, y2] = pt(MAX_R, i, n);
  return { x1: CX, y1: CY, x2, y2 };
}

type LabelAnchor = 'start' | 'middle' | 'end';

/** Label-Position für beliebige Achsenzahl — dynamisch aus dem Winkel berechnet. */
function computeLabelPos(i: number, n: number): { x: number; y: number; anchor: LabelAnchor } {
  const deg = (i * 360 / n) % 360;
  const theta = deg * (Math.PI / 180);
  const labelR = 128;
  const x = CX + labelR * Math.sin(theta);
  const y = CY - labelR * Math.cos(theta);
  let anchor: LabelAnchor = 'middle';
  if (deg > 8 && deg < 172) anchor = 'start';
  else if (deg > 188 && deg < 352) anchor = 'end';
  return { x, y, anchor };
}

function labelPosFor(i: number, n: number) {
  if (n === 9) return LABEL_POS_9[i];
  return computeLabelPos(i, n);
}

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface RadarCategory {
  label: string;   // kurzes Uppercase-Label für den Radar
  value: number;   // 0–100
}

interface RadarChartProps {
  categories: RadarCategory[];
  focusIndex: number;
}

// ─── Animierter Wertpunkt (baut sich Punkt-für-Punkt entlang seiner Achse auf) ──

function RadarDot({
  growth, index, total, value, dotR, fill,
}: {
  growth: SharedValue<number>; index: number; total: number;
  value: number; dotR: number; fill: string;
}) {
  const animatedProps = useAnimatedProps(() => {
    const localT = Math.min(Math.max(total * growth.value - index, 0), 1);
    const theta = (index * 360 / total) * (Math.PI / 180);
    const r = value * localT;
    return {
      cx: CX + r * Math.sin(theta),
      cy: CY - r * Math.cos(theta),
      r: dotR * localT,
    };
  });
  return <AnimatedCircle animatedProps={animatedProps} fill={fill} />;
}

// ─── Komponente ───────────────────────────────────────────────────────────────
// Die Achsenzahl ergibt sich IMMER aus categories.length — bei 9 Kategorien ein
// volles Neuneck (Pro), bei 3 ein gleichseitiges Dreieck (Free). Es werden nur
// so viele Ringe/Speichen/Achsen gezeichnet wie übergebene Kategorien — gesperrte
// Achsen existieren in der SVG schlicht nicht.

const RadarChart: React.FC<RadarChartProps> = ({ categories, focusIndex }) => {
  const { T } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const svgW = screenW - 8;                 // nur 4 Padding je Seite
  const svgH = svgW * (300 / 384);

  const cats = categories;
  const N = Math.max(cats.length, 1);

  // ── Reveal-Animation: Datenform baut sich langsam Punkt-für-Punkt auf ──
  const growth = useSharedValue(0);

  useEffect(() => {
    growth.value = 0;
    growth.value = withDelay(200, withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.cubic) }));
  }, [categories, focusIndex]);

  // Baut einen geschlossenen Pfad (M…L…L…Z) statt eines Polygon-"points"-Strings —
  // AnimatedPath ist das erprobte Muster (siehe ProgressChart) und aktualisiert
  // zuverlässig, während ein animiertes Polygon-"points"-Attribut auf manchen
  // Geräten nach der Animation leer/eingefroren bleiben kann.
  const dataAnimatedProps = useAnimatedProps(() => {
    let d = '';
    for (let i = 0; i < cats.length; i++) {
      const localT = Math.min(Math.max(cats.length * growth.value - i, 0), 1);
      const theta = (i * 360 / N) * (Math.PI / 180);
      const r = cats[i].value * localT;
      const x = CX + r * Math.sin(theta);
      const y = CY - r * Math.cos(theta);
      d += (i === 0 ? `M${x.toFixed(2)},${y.toFixed(2)}` : ` L${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return { d: d + ' Z' };
  });

  return (
    <Svg
      width={svgW}
      height={svgH}
      viewBox="-72 -22 384 300"
    >
      {/* ── Speichen (statisch) — nur für vorhandene Achsen ── */}
      <G>
        {Array.from({ length: N }, (_, i) => {
          const s = spokeCoords(i, N);
          return (
            <Line
              key={`spoke-${i}`}
              x1={s.x1} y1={s.y1}
              x2={s.x2} y2={s.y2}
              stroke={T.hairline}
              strokeWidth={1}
            />
          );
        })}
      </G>

      {/* ── Äußerer Ring (r=100, statisch) ── */}
      <Polygon
        points={polyPoints(MAX_R, N)}
        fill="none"
        stroke={T.track}
        strokeWidth={1}
      />

      {/* ── Innerer Ring (r=50, statisch) ── */}
      <Polygon
        points={polyPoints(50, N)}
        fill="none"
        stroke={T.hairline}
        strokeWidth={1}
      />

      {/* ── Datenfläche (animiert: baut sich Punkt-für-Punkt auf) — nur über die übergebenen Kategorien ── */}
      {cats.length >= 3 && (
        <AnimatedPath
          animatedProps={dataAnimatedProps}
          fill={T.accentTint}
          stroke={T.accentData}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}

      {/* ── Wertpunkte (jeder baut sich einzeln entlang seiner Achse auf) ── */}
      {cats.map((c, i) => (
        <RadarDot
          key={`dot-${i}`}
          growth={growth}
          index={i}
          total={cats.length}
          value={c.value}
          dotR={i === focusIndex ? 3.5 : 2.5}
          fill={T.accentData}
        />
      ))}

      {/* ── Achsenbeschriftung (statisch) — nur für übergebene Kategorien, keine gesperrten Achsen ── */}
      {cats.map((c, i) => {
        const pos = labelPosFor(i, N);
        if (!pos) return null;
        const isFocus = i === focusIndex;
        return (
          <SvgText
            key={`label-${i}`}
            x={pos.x}
            y={pos.y}
            textAnchor={pos.anchor}
            fontFamily={F.regular}
            fontSize={7.5}
            letterSpacing={0.4}
            fill={isFocus ? T.accentText : T.textSecondary}
          >
            {c.label}
          </SvgText>
        );
      })}
    </Svg>
  );
};

export default RadarChart;
