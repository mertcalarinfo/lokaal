import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withDelay, withTiming, Easing,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const W = 320, H = 150, PAD = 26;

function cubicAt(p0: number, c0: number, c1: number, p1: number, t: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * c0 + 3 * u * t * t * c1 + t * t * t * p1;
}

function smooth(pts: { x: number; y: number }[]) {
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], n = pts[i + 1], cx = (p.x + n.x) / 2;
    d += ` C${cx} ${p.y} ${cx} ${n.y} ${n.x} ${n.y}`;
  }
  return d;
}

function pathLength(pts: { x: number; y: number }[]) {
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], n = pts[i + 1], cx = (p.x + n.x) / 2;
    let px = p.x, py = p.y;
    for (let s = 1; s <= 24; s++) {
      const t = s / 24;
      const x = cubicAt(p.x, cx, cx, n.x, t);
      const y = cubicAt(p.y, p.y, n.y, n.y, t);
      len += Math.hypot(x - px, y - py);
      px = x; py = y;
    }
  }
  return Math.ceil(len) + 2;
}

type ChartColors = { accent: string; gridLine: string; bg: string; faint: string };
type XMarker = { frac: number; label: string };
type Props = {
  scores: number[]; labels?: string[]; max?: number; mode?: 'light' | 'dark';
  /** Override colors (e.g. Register palette) instead of the dark/light theme hook. */
  colors?: ChartColors;
  /** Zeigt 3 Y-Achsen-Marker (0 / 50 / 100) links am Chart. */
  showYAxis?: boolean;
  /** X-Achsen-Datumsmarker, positioniert über `frac` (0..1 der Zeitspanne, nicht des Index). */
  xMarkers?: XMarker[];
};

export default function ProgressChart({ scores, max = 10, mode, colors, showYAxis = false, xMarkers }: Props) {
  const { T } = useTheme();
  const themeColors: ChartColors = { accent: T.accentData, gridLine: T.hairline, bg: T.card, faint: T.textSecondary };
  const c = colors ?? themeColors;
  const step = (W - PAD * 2) / Math.max(1, scores.length - 1);
  const pts = scores.map((s, i) => ({
    x: PAD + i * step,
    y: PAD + (1 - s / max) * (H - PAD * 2),
  }));
  const line = smooth(pts);
  const area = `${line} L${pts[pts.length - 1].x} ${H - PAD} L${pts[0].x} ${H - PAD} Z`;
  const LEN  = pathLength(pts);

  const prog = useSharedValue(0);
  // Re-spielt den Draw-In bei jeder Datenänderung (z.B. erneuter Tab-Besuch) ab, nicht nur beim ersten Mount.
  const scoresKey = scores.join(',');
  useEffect(() => {
    prog.value = 0;
    prog.value = withDelay(150, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [scoresKey]);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: LEN * (1 - prog.value) }));

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.accent} stopOpacity="0.28" />
            <Stop offset="1" stopColor={c.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {[0.25, 0.5, 0.75].map((t) => (
          <Line key={t}
            x1={PAD} y1={PAD + t * (H - PAD * 2)}
            x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
            stroke={c.gridLine} strokeWidth={1}
          />
        ))}

        <Path d={area} fill="url(#areaFill)" />

        <AnimatedPath
          d={line} fill="none" stroke={c.accent} strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={LEN} animatedProps={lineProps}
        />

        {pts.map((p, i) => {
          const last = i === pts.length - 1;
          return (
            <Circle key={i} cx={p.x} cy={p.y} r={last ? 5 : 4}
              fill={last ? c.accent : c.bg}
              stroke={c.accent} strokeWidth={2.5}
            />
          );
        })}

        {showYAxis && [
          { v: '100', y: PAD },
          { v: '50',  y: PAD + 0.5 * (H - PAD * 2) },
          { v: '0',   y: H - PAD },
        ].map(({ v, y }) => (
          <SvgText
            key={v}
            x={PAD - 8}
            y={y + 3}
            textAnchor="end"
            fontSize={9}
            fill={c.faint}
          >
            {v}
          </SvgText>
        ))}

        {/* X-Achse — zeitbasierte Datums-Marker (frac = Anteil der Zeitspanne, 0..1) */}
        {(xMarkers ?? []).map((m, i) => {
          const x = PAD + Math.min(Math.max(m.frac, 0), 1) * (W - PAD * 2);
          const anchor = m.frac <= 0.001 ? 'start' : m.frac >= 0.999 ? 'end' : 'middle';
          return (
            <SvgText
              key={`${i}-${m.label}`}
              x={x}
              y={H - 7}
              textAnchor={anchor}
              fontSize={9}
              fill={c.faint}
            >
              {m.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
