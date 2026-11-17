import React from 'react';
import { Pressable, ViewStyle, StyleProp, AccessibilityRole, AccessibilityState, Insets } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from 'react-native-reanimated';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { hapticLight } from '../utils/native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface Pressable3DProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  hitSlop?: number | Insets;
  /** Leichtes Antippen beim Auslösen (Haupt-Buttons, Tabs, Umschalter) */
  haptic?: boolean;
  /** Kleinste Skalierung beim Drücken (Standard 0.97) */
  pressedScale?: number;
}

// Loslassen: federnd zurück, kurz und ohne großes Nachschwingen
const RELEASE_SPRING = { damping: 15, stiffness: 320, mass: 0.6 };

/**
 * Zentrales Drück-Feedback (Entwurf 5 / iOS-26-Stil) für alles Tippbare:
 * beim Drücken auf 0.97, beim Loslassen mit Spring zurück — auf dem UI-Thread.
 * "Bewegung reduzieren": keine Skalierung, nur leichtes Abblenden.
 */
export default function Pressable3D({
  children, onPress, onLongPress, style, disabled, accessibilityLabel,
  accessibilityRole = 'button', accessibilityState, hitSlop, haptic, pressedScale = 0.97,
}: Pressable3DProps) {
  const reduceMotion = useReduceMotion();
  const p = useSharedValue(0); // 0 = ruhig, 1 = gedrückt

  const animated = useAnimatedStyle(() => (
    reduceMotion
      ? { opacity: 1 - 0.25 * p.value }
      : { transform: [{ scale: 1 - (1 - pressedScale) * p.value }] }
  ));

  return (
    <AnimatedPressable
      onPress={() => { if (haptic) hapticLight(); onPress?.(); }}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      hitSlop={hitSlop}
      onPressIn={() => { p.value = withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }); }}
      onPressOut={() => { p.value = reduceMotion ? withTiming(0, { duration: 140 }) : withSpring(0, RELEASE_SPRING); }}
      style={[style, animated] as any}
    >
      {children}
    </AnimatedPressable>
  );
}
