import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { withTiming, ReduceMotion } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { hapticLight } from '../utils/native';
import Card from './Card';
import Pressable3D from './Pressable3D';
import { LiquidIndicator, useLiquidState, useActiveOpacity, LiquidState } from './LiquidIndicator';
import { F, R, S } from '../theme';

/**
 * Umschalter (Entwurf 5): Karte Radius 14, Innenabstand 4, gleich breite Felder
 * (Höhe 36, Radius 10). Aktiv: accentTint + accentText 600 — die Markierung
 * gleitet wie in der Tab-Leiste, Text blendet weich um.
 */
const PAD = 4;
const GAP = 4;
const ITEM_H = 36;

function Label({ text, state, i }: { text: string; state: LiquidState; i: number }) {
  const { T } = useTheme();
  const active = useActiveOpacity(state, i);
  return (
    <View style={styles.labelWrap}>
      <Text style={[styles.text, { color: T.textSecondary }]} numberOfLines={1}>{text}</Text>
      <Animated.View style={[StyleSheet.absoluteFill, styles.labelWrap, active]} pointerEvents="none">
        <Text style={[styles.text, styles.textActive, { color: T.accentText }]} numberOfLines={1}>{text}</Text>
      </Animated.View>
    </View>
  );
}

interface Props<K extends string> {
  items: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}

export default function SegmentedControl<K extends string>({ items, value, onChange }: Props<K>) {
  const { T } = useTheme();
  const reduceMotion = useReduceMotion();
  // Umschalter liegt immer über die volle Inhaltsbreite (Bildschirm minus 2 × 24)
  const { width: windowWidth } = useWindowDimensions();
  const width = windowWidth - S.screen * 2;
  const index = Math.max(0, items.findIndex((it) => it.key === value));
  const liquid = useLiquidState(index, reduceMotion);
  const itemWidth = width > 0 ? (width - PAD * 2 - GAP * (items.length - 1)) / items.length : 0;

  return (
    <Card radius={R.segment} style={styles.card}>
      <View style={styles.row}>
        <LiquidIndicator
          state={liquid}
          index={index}
          count={items.length}
          itemWidth={itemWidth}
          gap={GAP}
          inset={0}
          height={ITEM_H}
          radius={R.segmentItem}
          color={T.accentTint}
          reduceMotion={reduceMotion}
        />
        {items.map((it, i) => (
          <Pressable3D
            key={it.key}
            onPress={() => { if (it.key !== value) { hapticLight(); onChange(it.key); } }}
            accessibilityRole="tab"
            accessibilityState={{ selected: it.key === value }}
            accessibilityLabel={it.label}
            style={styles.item}
          >
            <Label text={it.label} state={liquid} i={i} />
          </Pressable3D>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card:  { padding: PAD },
  row:   { flexDirection: 'row', gap: GAP },
  item:  { flex: 1, height: ITEM_H, borderRadius: R.segmentItem },
  labelWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text:       { fontFamily: F.medium, fontSize: 13.5 },
  textActive: { fontFamily: F.semiBold },
});

/**
 * Inhalt unter dem Umschalter: wechselt mit kurzem Überblenden + 8 pt seitlichem
 * Versatz (Richtung = Richtung des Wechsels). "Bewegung reduzieren": nur Überblenden.
 * Über `key` neu einhängen, damit die Einblend-Animation bei jedem Wechsel läuft.
 */
export function SegmentContent({ direction, children, style }: { direction: 1 | -1; children: React.ReactNode; style?: any }) {
  const reduceMotion = useReduceMotion();
  const dx = reduceMotion ? 0 : 8 * direction;
  const entering = () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateX: dx }] },
      animations: {
        opacity: withTiming(1, { duration: 180, reduceMotion: ReduceMotion.Never }),
        transform: [{ translateX: withTiming(0, { duration: 180 }) }],
      },
    };
  };
  return <Animated.View entering={entering} style={style}>{children}</Animated.View>;
}
