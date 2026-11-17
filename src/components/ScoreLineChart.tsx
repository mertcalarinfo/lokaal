import React, { useId, useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Path, Polyline, Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

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
            <Path d={area} fill={`url(#${id})`} />
            <Polyline
              points={pts.join(' ')}
              fill="none"
              stroke={T.accentData}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        {xs.slice(0, -1).map((x, i) => (
          <Circle key={i} cx={x} cy={ys[i]} r={3} fill={T.card} stroke={T.accentData} strokeWidth={1.8} />
        ))}
        <Circle cx={lastX} cy={lastY} r={9} fill={T.accentData} fillOpacity={0.16} />
        <Circle cx={lastX} cy={lastY} r={4.5} fill={T.accentData} />
      </Svg>
    );
  }

  return (
    <View onLayout={onLayout} style={{ height: H, alignSelf: 'stretch' }} accessible={false}>
      {content}
    </View>
  );
};

export default ScoreLineChart;
