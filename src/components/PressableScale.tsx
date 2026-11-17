import React from 'react';
import { Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  hitSlop?: number;
};

export default function PressableScale({ children, onPress, style, disabled, accessibilityLabel, hitSlop }: Props) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={hitSlop}
      onPressIn={() => {
        scale.value   = withTiming(0.98, { duration: 120 });
        opacity.value = withTiming(0.94, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value   = withTiming(1, { duration: 140 });
        opacity.value = withTiming(1, { duration: 140 });
      }}
      style={[style, animated] as any}
    >
      {children}
    </AnimatedPressable>
  );
}
