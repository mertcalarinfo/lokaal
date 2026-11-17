import React, { useEffect } from 'react';
import { View, Text, AccessibilityInfo } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withDelay, withTiming, Easing,
} from 'react-native-reanimated';
import { useColors } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R = 27;
const CIRC = 2 * Math.PI * R;

type Props = { value: number; max?: number; delay?: number; mode?: 'light' | 'dark' };

export default function ScoreRing({ value, max = 10, delay = 0, mode }: Props) {
  const c = useColors(mode);
  const p = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) { p.value = value / max; return; }
      p.value = withDelay(delay, withTiming(value / max, {
        duration: 1000, easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      }));
    });
  }, [value]);

  const props = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - p.value) }));

  return (
    <View style={{ width: 62, height: 62, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={62} height={62} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={31} cy={31} r={R} stroke={c.ringTrack} strokeWidth={4.5} fill="none" />
        <AnimatedCircle
          cx={31} cy={31} r={R} stroke={c.accent} strokeWidth={4.5} fill="none"
          strokeLinecap="round" strokeDasharray={CIRC} animatedProps={props}
        />
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: c.text, fontVariant: ['tabular-nums'] }}>
          {value.toFixed(1)}
        </Text>
        <Text style={{ fontSize: 9, color: c.faint, fontWeight: '500', marginTop: -2 }}>/{max}</Text>
      </View>
    </View>
  );
}
