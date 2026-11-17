import React, { useEffect, useId, useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Path, Polyline, Circle, G } from 'react-native-svg';
import Animated, { SharedValue, useSharedValue, useAnimatedProps, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useReduceMotion } from '../hooks/useReduceMotion';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const AnimatedPath     = Animated.createAnimatedComponent(Path);
const AnimatedG        = Animated.createAnimatedComponent(G);

/** Linie, die sich über `draw` (0 → 1) von links nach rechts einzeichnet. */
function AnimatedLine({ len, draw, ...rest }: { len: number; draw: SharedValue<number> } & Record<string, any>) {
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - draw.value) }));
  return <AnimatedPolyline {...rest} strokeDasharray={`${len} ${len}`} animatedProps={props} />;
}

/**
 * Score-Verlauf (Entwurf 5): volle Kartenbreite, Höhe 92, drei waagrechte
 * Hilfslinien, Fläche mit Verlauf accentData 0.22 → 0, Linie 2 pt, Punkte
 * r 3 (Kartenfarbe innen, Rand accentData), letzter Punkt gefüllt (4.5) mit
 * Hof (9, Deckkraft 0.16). Keine Achsenbeschriftung.
 *
 * x folgt der Zeit (wie in der Vorlage), y skaliert auf den Wertebereich.
 */
export interface ChartPoint { score: number; time: number }

const H = 92;
const PAD_X = 8;
const GRID = [8, 35.75, 63.5];
const Y_TOP = 16;      // höchster Wert
const Y_BOTTOM = 62;   // niedrigster Wert
const AREA_BOTTOM = 88;
const MIN_SPAN = 12;   // kleine Schwankungen nicht übertreiben

const ScoreLineChart: React.FC<{ points: ChartPoint[] }> = ({ points }) => {
  const { T } = useTheme();
  const reduceMotion = useReduceMotion();
  // Beim ersten Anzeigen: Linie zeichnet sich ein (600 ms), Fläche + Punkte blenden danach ein.
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const fade = useSharedValue(0);
  const dataKey = points.map((p) => `${p.time}:${p.score}`).join('|');
  useEffect(() => {
    if (reduceMotion) {
      draw.value = 1;
      fade.value = 0;
      fade.value = withTiming(1, { duration: 220 });
      return;
    }
    draw.value = 0;
    fade.value = 0;
    draw.value = withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) });
    fade.value = withDelay(300, withTiming(1, { duration: 300 }));
  }, [dataKey, reduceMotion, draw, fade]);
  const fadeProps = useAnimatedProps(() => ({ opacity: fade.value }));
  // "Bewegung reduzieren": das ganze Diagramm blendet nur ein
  const wrapStyle = useAnimatedStyle(() => ({ opacity: reduceMotion ? fade.value : 1 }));
  const id = `area${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const nw = Math.round(e.nativeEvent.layout.width);
    if (nw !== w) setW(nw);
  };

  let content: React.ReactNode = null;
  if (w > 0 && points.length > 0) {
    const t0 = points[0].time;
    const t1 = points[points.length - 1].time;
    const scores = points.map((p) => p.score);
    let lo = Math.min(...scores);
    let hi = Math.max(...scores);
    if (hi - lo < MIN_SPAN) {
      const mid = (hi + lo) / 2;
      lo = mid - MIN_SPAN / 2;
      hi = mid + MIN_SPAN / 2;
    }
    const xs = points.map((p, i) => {
      if (points.length === 1) return w - PAD_X;
      const frac = t1 > t0 ? (p.time - t0) / (t1 - t0) : i / (points.length - 1);
      return PAD_X + frac * (w - PAD_X * 2);
    });
    const ys = scores.map((s) => Y_BOTTOM - ((s - lo) / (hi - lo)) * (Y_BOTTOM - Y_TOP));
    const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`);
    const lastX = xs[xs.length - 1];
    const lastY = ys[ys.length - 1];
    const area = `M${xs[0].toFixed(1)},${AREA_BOTTOM} L${pts.join(' L')} L${lastX.toFixed(1)},${AREA_BOTTOM} Z`;
    let lineLen = 0;
    for (let i = 1; i < xs.length; i++) lineLen += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    lineLen = Math.ceil(lineLen) + 2;

    content = (
      <Svg width={w} height={H}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={T.accentData} stopOpacity={0.22} />
            <Stop offset="1" stopColor={T.accentData} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {GRID.map((y) => (
          <Line key={y} x1={0} x2={w} y1={y} y2={y} stroke={T.hairline} strokeWidth={1} />
        ))}
        {points.length > 1 && (
          <>
            <AnimatedPath d={area} fill={`url(#${id})`} animatedProps={fadeProps} />
            <AnimatedLine
              len={lineLen}
              draw={draw}
              points={pts.join(' ')}
              fill="none"
              stroke={T.accentData}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        <AnimatedG animatedProps={fadeProps}>
          {xs.slice(0, -1).map((x, i) => (
            <Circle key={i} cx={x} cy={ys[i]} r={3} fill={T.card} stroke={T.accentData} strokeWidth={1.8} />
          ))}
          <Circle cx={lastX} cy={lastY} r={9} fill={T.accentData} fillOpacity={0.16} />
          <Circle cx={lastX} cy={lastY} r={4.5} fill={T.accentData} />
        </AnimatedG>
      </Svg>
    );
  }

  return (
    <Animated.View onLayout={onLayout} style={[{ height: H, alignSelf: 'stretch' }, wrapStyle]} accessible={false}>
      {content}
    </Animated.View>
  );
};

export default ScoreLineChart;
