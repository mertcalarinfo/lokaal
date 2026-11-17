import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  SharedValue, useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';

/**
 * Gleitende Markierung im iOS-26-Stil ("Liquid Glass"): EIN Element, das per
 * Spring zum neuen Eintrag gleitet und sich unterwegs wie ein Tropfen um bis zu
 * 12 % in die Breite zieht. Alles auf dem UI-Thread.
 *
 * Genutzt von der Tab-Leiste und vom Umschalter "Analysen | Vergleiche".
 */

export const LIQUID_SPRING = { damping: 18, stiffness: 220, mass: 1 };
const STRETCH = 0.12;
const COLOR_MS = 200;

export interface LiquidState {
  /** Position der Markierung in Einträgen (0 … count-1, auch Zwischenwerte) */
  pos: SharedValue<number>;
  from: SharedValue<number>;
  to: SharedValue<number>;
  /** 1 während des Ziehens (Markierung bleibt gedehnt) */
  dragging: SharedValue<number>;
  /** Für Farbwechsel von Icon/Label (weich, ca. 200 ms) */
  colorPos: SharedValue<number>;
}

export function useLiquidState(index: number, reduceMotion: boolean): LiquidState {
  const pos = useSharedValue(index);
  const from = useSharedValue(index);
  const to = useSharedValue(index);
  const dragging = useSharedValue(0);
  const colorPos = useSharedValue(index);

  useEffect(() => {
    from.value = pos.value;
    to.value = index;
    pos.value = reduceMotion ? index : withSpring(index, LIQUID_SPRING);
    colorPos.value = withTiming(index, { duration: COLOR_MS });
  }, [index, reduceMotion, pos, from, to, colorPos]);

  return { pos, from, to, dragging, colorPos };
}

/** Zurück zur aktuellen Position (z. B. wenn Ziehen abgebrochen oder Tab gesperrt ist). */
export function settleLiquid(state: LiquidState, index: number, reduceMotion: boolean) {
  'worklet';
  state.from.value = state.pos.value;
  state.to.value = index;
  state.pos.value = reduceMotion ? index : withSpring(index, LIQUID_SPRING);
  state.colorPos.value = withTiming(index, { duration: COLOR_MS });
  state.dragging.value = withTiming(0, { duration: 160 });
}

/** Deckkraft der "aktiven" Ebene von Eintrag i (1 = aktiv, 0 = inaktiv). */
export function useActiveOpacity(state: LiquidState, i: number) {
  return useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - Math.abs(state.colorPos.value - i)),
  }));
}

interface IndicatorProps {
  state: LiquidState;
  index: number;
  count: number;
  /** Breite eines Eintrags */
  itemWidth: number;
  gap: number;
  /** Abstand links/oben (Innenabstand des Containers) */
  inset: number;
  height: number;
  radius: number;
  color: string;
  reduceMotion: boolean;
}

export const LiquidIndicator: React.FC<IndicatorProps> = ({
  state, index, count, itemWidth, gap, inset, height, radius, color, reduceMotion,
}) => {
  const step = itemWidth + gap;

  const moving = useAnimatedStyle(() => {
    const span = Math.abs(state.to.value - state.from.value);
    const progress = span > 0.001 ? Math.min(1, Math.abs(state.pos.value - state.from.value) / span) : 1;
    const s = Math.max(Math.sin(Math.PI * progress) * STRETCH, state.dragging.value * STRETCH);
    return {
      transform: [
        { translateX: inset + state.pos.value * step },
        { scaleX: 1 + s },
        { scaleY: 1 - s * 0.25 },
      ],
    };
  });

  if (itemWidth <= 0) return null;

  // "Bewegung reduzieren": keine Bewegung, nur Überblenden zwischen festen Markierungen
  if (reduceMotion) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: count }, (_, i) => (
          <FadingPill
            key={i}
            visible={i === index}
            style={{ position: 'absolute', top: inset, left: inset + i * step, width: itemWidth, height, borderRadius: radius, backgroundColor: color }}
          />
        ))}
      </View>
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: inset, left: 0, width: itemWidth, height, borderRadius: radius, backgroundColor: color },
        moving,
      ]}
    />
  );
};

const FadingPill: React.FC<{ visible: boolean; style: any }> = ({ visible, style }) => {
  const o = useSharedValue(visible ? 1 : 0);
  useEffect(() => { o.value = withTiming(visible ? 1 : 0, { duration: COLOR_MS }); }, [visible, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[style, a]} />;
};
