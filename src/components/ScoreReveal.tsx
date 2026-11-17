import React, { useEffect, useState } from 'react';
import { View, Text, AccessibilityInfo } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction,
  withDelay, withTiming, Easing, runOnJS,
} from 'react-native-reanimated';
import { useColors } from './theme';

type Props = {
  score: number; verdict: string; date: string;
  label?: string; mode?: 'light' | 'dark';
};

export default function ScoreReveal({ score, verdict, date, label = 'GESAMTBEWERTUNG', mode }: Props) {
  const c = useColors(mode);
  const p = useSharedValue(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) { p.value = 1; setShown(score); return; }
      p.value = withDelay(180, withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) }));
    });
  }, [score]);

  useAnimatedReaction(() => p.value, (v) => { runOnJS(setShown)(score * v); });

  const glow = useAnimatedStyle(() => ({ opacity: p.value }));
  const meta = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 6 }],
  }));

  return (
    <View style={{ alignItems: 'center', paddingVertical: 34 }}>
      <Animated.View style={[{ position: 'absolute', top: 0, width: 240, height: 240 }, glow]}>
        <Svg width={240} height={240}>
          <Defs>
            <RadialGradient id="scoreGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c.accent} stopOpacity="0.20" />
              <Stop offset="0.62" stopColor={c.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="240" height="240" fill="url(#scoreGlow)" />
        </Svg>
      </Animated.View>

      <Text style={{ fontSize: 11, letterSpacing: 3, color: c.muted, fontWeight: '600' }}>
        {label}
      </Text>
      <Text style={{
        fontSize: 104, lineHeight: 108, fontWeight: '700', color: c.accent,
        letterSpacing: -5, fontVariant: ['tabular-nums'], marginTop: 8,
      }}>
        {shown.toFixed(1)}
        <Text style={{ fontSize: 26, color: c.muted, fontWeight: '500' }}>/10</Text>
      </Text>

      <Animated.Text style={[{ fontSize: 15, fontWeight: '600', color: c.accent, marginTop: 10 }, meta]}>
        {verdict}
      </Animated.Text>
      <Animated.Text style={[{ fontSize: 12, color: c.faint, marginTop: 5 }, meta]}>
        {date}
      </Animated.Text>
    </View>
  );
}
