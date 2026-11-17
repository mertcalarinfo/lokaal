import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useReduceMotion } from '../hooks/useReduceMotion';
import CountUpText from './CountUpText';
import { F } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreRingProps {
  /** 0–100 */
  score: number;
  size?: number;
  strokeWidth?: number;
  fontSize?: number;
}

/**
 * Score-Ring (Entwurf 5): track + accentData, beginnt oben, runde Enden,
 * Zahl dünn (300) und mit fester Ziffernbreite in der Mitte.
 * Beim ersten Anzeigen zeichnet sich der Ring ein (600 ms) und die Zahl zählt hoch.
 */
const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 60, strokeWidth = 4, fontSize = 21 }) => {
  const { T } = useTheme();
  const reduceMotion = useReduceMotion();
  const r = size / 2 - strokeWidth / 2 - 3; // 60 → r 25 wie in der Vorlage
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));

  const p = useSharedValue(reduceMotion ? clamped : 0);
  useEffect(() => {
    p.value = reduceMotion ? clamped : withTiming(clamped, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [clamped, reduceMotion, p]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value / 100) }));

  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${Math.round(clamped)} / 100`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.track} strokeWidth={strokeWidth} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={T.accentData}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          animatedProps={ringProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <CountUpText
          value={clamped}
          style={{
            fontFamily: F.light, fontSize, letterSpacing: -fontSize * 0.03,
            color: T.text, fontVariant: ['tabular-nums'], textAlign: 'center',
          }}
        />
      </View>
    </View>
  );
};

export default ScoreRing;
