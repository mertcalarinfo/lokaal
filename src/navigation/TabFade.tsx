import React, { useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useReduceMotion } from '../hooks/useReduceMotion';

/**
 * Tab-Wechsel: neuer Inhalt blendet kurz ein (180 ms, 6 pt von unten) statt hart
 * aufzupoppen. Hängt am Fokus des TABS — Push-Screens im Stack (Report, Alle
 * Analysen, Vergleich) behalten ihre native iOS-Slide-Animation.
 * "Bewegung reduzieren": nur Überblenden.
 */
export function withTabFade<P extends object>(Screen: React.ComponentType<P>): React.FC<P> {
  const Faded: React.FC<P> = (props) => {
    const focused = useIsFocused();
    const reduceMotion = useReduceMotion();
    const o = useSharedValue(0);
    const y = useSharedValue(reduceMotion ? 0 : 6);

    useEffect(() => {
      if (!focused) return;
      o.value = 0;
      y.value = reduceMotion ? 0 : 6;
      const cfg = { duration: 180, easing: Easing.out(Easing.cubic) };
      o.value = withTiming(1, cfg);
      y.value = withTiming(0, cfg);
    }, [focused, reduceMotion, o, y]);

    const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
    return (
      <Animated.View style={[{ flex: 1 }, style]}>
        <Screen {...props} />
      </Animated.View>
    );
  };
  Faded.displayName = `TabFade(${Screen.displayName || Screen.name || 'Screen'})`;
  return Faded;
}
