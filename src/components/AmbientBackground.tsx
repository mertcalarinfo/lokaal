import React, { useEffect, useId, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Circle, Path } from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Hintergrund (Entwurf 5): zwei weiche blaue Flecken + eine dünne Linie über `bg`.
 * Koordinaten der Vorlage gelten für 390 × 844 und werden relativ skaliert
 * (Fleck A bleibt oben rechts, Fleck B unten links).
 *
 * `animated` nur auf Home, Verlauf und Paywall. Bei iOS "Bewegung reduzieren"
 * bewegt sich nichts. Deckkraft bleibt immer gleich, es ändern sich nur Position
 * und Größe. Kein Live-Blur — die Radialverläufe reichen.
 */

const BASE_W = 390;
const BASE_H = 844;
// CSS ease-in-out
const EASE = Easing.bezier(0.42, 0, 0.58, 1);

type Variant = 'default' | 'paywall';

interface BlobSpec { cx: number; cy: number; r: number; dx: number; dy: number; scale: number; duration: number }
interface LineSpec { d: number[]; dy: number; duration: number }

const SPECS: Record<Variant, { blobs: BlobSpec[]; line: LineSpec; blobOpacityLight?: number }> = {
  default: {
    blobs: [
      { cx: 340, cy: 60,  r: 190, dx: -70, dy: 90,  scale: 1.18, duration: 16000 },
      { cx: 60,  cy: 800, r: 170, dx: 80,  dy: -70, scale: 1.15, duration: 20000 },
    ],
    // M -30 330 C 110 190, 300 140, 430 210
    line: { d: [-30, 330, 110, 190, 300, 140, 430, 210], dy: 26, duration: 18000 },
  },
  paywall: {
    blobs: [{ cx: 195, cy: 130, r: 210, dx: -60, dy: 70, scale: 1.15, duration: 16000 }],
    // M -30 300 C 110 170, 300 120, 430 190
    line: { d: [-30, 300, 110, 170, 300, 120, 430, 190], dy: 26, duration: 18000 },
    blobOpacityLight: 0.18, // Wert aus 03-paywall-hell.html
  },
};

/** true, solange iOS/Android "Bewegung reduzieren" aktiv ist (reagiert auf Änderungen). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduce;
}

/** Endlos hin und zurück 0 → 1, oder fest auf 0, wenn nicht animiert. */
function useDrift(active: boolean, duration: number) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (active) {
      p.value = withRepeat(withTiming(1, { duration, easing: EASE }), -1, true);
    } else {
      cancelAnimation(p);
      p.value = 0;
    }
    return () => cancelAnimation(p);
  }, [active, duration, p]);
  return p;
}

const svgId = (raw: string, suffix: string) => `amb${raw.replace(/[^a-zA-Z0-9]/g, '')}${suffix}`;

function Blob({
  spec, sx, sy, color, opacity, active,
}: { spec: BlobSpec; sx: number; sy: number; color: string; opacity: number; active: boolean }) {
  const id = svgId(useId(), 'b');
  const r  = spec.r * sx;
  const p  = useDrift(active, spec.duration);
  const dx = spec.dx * sx;
  const dy = spec.dy * sy;
  const s  = spec.scale - 1;
  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateX: dx * p.value },
      { translateY: dy * p.value },
      { scale: 1 + s * p.value },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: spec.cx * sx - r, top: spec.cy * sy - r, width: r * 2, height: r * 2 }, anim]}
    >
      <Svg width={r * 2} height={r * 2}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

function Streak({
  spec, sx, sy, width, height, color, opacity, active,
}: { spec: LineSpec; sx: number; sy: number; width: number; height: number; color: string; opacity: number; active: boolean }) {
  const id = svgId(useId(), 'l');
  const p  = useDrift(active, spec.duration);
  const dy = spec.dy * sy;
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: dy * p.value }] }));
  const [x0, y0, c1x, c1y, c2x, c2y, x1, y1] = spec.d;
  const d = `M ${x0 * sx} ${y0 * sy} C ${c1x * sx} ${c1y * sy}, ${c2x * sx} ${c2y * sy}, ${x1 * sx} ${y1 * sy}`;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, anim]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={id} gradientUnits="userSpaceOnUse" x1={-20 * sx} y1="0" x2={420 * sx} y2="0">
            <Stop offset="0"   stopColor={color} stopOpacity={0} />
            <Stop offset="0.5" stopColor={color} stopOpacity={opacity} />
            <Stop offset="1"   stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

interface Props {
  animated?: boolean;
  /** paywall: nur Fleck A (Mitte oben) + Linie */
  variant?: Variant;
}

/** Liegt hinter dem Inhalt über die volle Fläche. Als erstes Kind eines Screens rendern. */
const AmbientBackground: React.FC<Props> = ({ animated = false, variant = 'default' }) => {
  const { T, isDark } = useTheme();
  const reduceMotion  = useReduceMotion();
  const win = useWindowDimensions();
  const [size, setSize] = useState({ w: win.width, h: win.height });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== size.w || height !== size.h)) setSize({ w: width, h: height });
  };

  const spec   = SPECS[variant];
  const active = animated && !reduceMotion;
  const sx = size.w / BASE_W;
  const sy = size.h / BASE_H;
  const blobOpacity = !isDark && spec.blobOpacityLight ? spec.blobOpacityLight : Number(T.ambientBlobOpacity);

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, { backgroundColor: T.bg, overflow: 'hidden' }]}
    >
      {spec.blobs.map((b, i) => (
        <Blob key={i} spec={b} sx={sx} sy={sy} color={T.ambientBlob} opacity={blobOpacity} active={active} />
      ))}
      <Streak
        spec={spec.line}
        sx={sx}
        sy={sy}
        width={size.w}
        height={size.h}
        color={T.ambientLine}
        opacity={Number(T.ambientLineOpacity)}
        active={active}
      />
    </View>
  );
};

export default AmbientBackground;
