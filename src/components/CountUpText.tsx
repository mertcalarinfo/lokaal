import React, { useEffect } from 'react';
import { TextInput, TextStyle, StyleProp, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { useReduceMotion } from '../hooks/useReduceMotion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * Große Zahl, die beim ersten Anzeigen kurz hochzählt (ca. 600 ms) — die Ziffern
 * werden auf dem UI-Thread gesetzt (nicht editierbares TextInput, bewährtes
 * Reanimated-Muster). "Bewegung reduzieren": sofort der Endwert, kein Zählen.
 */
export default function CountUpText({
  value, style, duration = 600,
}: { value: number; style?: StyleProp<TextStyle>; duration?: number }) {
  const reduceMotion = useReduceMotion();
  const v = useSharedValue(reduceMotion ? value : 0);

  useEffect(() => {
    v.value = reduceMotion ? value : withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, reduceMotion, duration, v]);

  const animatedProps = useAnimatedProps(() => {
    const txt = String(Math.round(v.value));
    return { text: txt, defaultValue: txt } as any;
  });

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={String(Math.round(value))}>
      <AnimatedTextInput
        editable={false}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        underlineColorAndroid="transparent"
        defaultValue={String(Math.round(reduceMotion ? value : 0))}
        animatedProps={animatedProps}
        style={[{ padding: 0, margin: 0 }, style]}
      />
    </View>
  );
}
