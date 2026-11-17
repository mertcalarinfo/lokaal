import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, LayoutAnimation, Platform, UIManager, AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from './theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  index: number; name: string; score: number; feedback: string;
  animate?: boolean; mode?: 'light' | 'dark';
};

export default function CategoryRow({ index, name, score, feedback, animate = true, mode }: Props) {
  const c = useColors(mode);
  const [open, setOpen] = useState(false);
  const w = useSharedValue(0);
  const enter = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!animate || reduce) { w.value = score / 10; enter.value = 1; return; }
      const d = 150 + index * 70;
      enter.value = withDelay(d, withTiming(1, { duration: 450 }));
      w.value = withDelay(d, withTiming(score / 10, {
        duration: 900, easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      }));
    });
  }, [animate, score]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` as any }));

  return (
    <Animated.View style={[rowStyle, {
      borderRadius: 16, borderWidth: 1, borderColor: c.line,
      marginBottom: 10, overflow: 'hidden',
    }]}>
      <Pressable onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen(!open);
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 15, paddingBottom: 13 }}>
          <Text style={{ fontSize: 11, color: c.faint, fontWeight: '600', width: 18, fontVariant: ['tabular-nums'] }}>
            {String(index + 1).padStart(2, '0')}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: c.text, flex: 1 }}>{name}</Text>
          <Text style={{ fontSize: 19, fontWeight: '800', color: c.accent, fontVariant: ['tabular-nums'] }}>
            {score}<Text style={{ fontSize: 11, color: c.muted, fontWeight: '500' }}>/10</Text>
          </Text>
        </View>

        <View style={{ height: 6, borderRadius: 6, backgroundColor: c.cardTrack, marginHorizontal: 16, overflow: 'hidden' }}>
          <Animated.View style={barStyle}>
            <LinearGradient
              colors={[c.accentDeep, c.accent]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: 6, borderRadius: 6 }}
            />
          </Animated.View>
        </View>

        {open && feedback ? (
          <Text style={{ color: c.muted, fontSize: 13.5, lineHeight: 21, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 16 }}>
            {feedback}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
