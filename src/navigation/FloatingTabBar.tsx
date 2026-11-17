import React, { useContext, useCallback } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { BottomTabBarProps, BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, withTiming } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';

import { useTheme } from '../contexts/ThemeContext';
import Glass from '../components/Glass';
import Pressable3D from '../components/Pressable3D';
import { LiquidIndicator, useLiquidState, useActiveOpacity, settleLiquid, LiquidState } from '../components/LiquidIndicator';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { hapticLight } from '../utils/native';
import { F, R, S, SIZE } from '../theme';

/**
 * Schwebende Tab-Leiste (Entwurf 5): 3 Tabs mit Beschriftung, Glas,
 * links/rechts 24, unten Safe Area + 8, Höhe 64, Radius 20, Innenabstand 6.
 *
 * Liquid-Glass-Verhalten: die Markierung des aktiven Tabs ist EIN Element, das
 * per Spring gleitet und sich unterwegs dehnt; Icon/Label blenden weich um.
 * Ziehen über die Leiste führt die Markierung mit und wählt beim Loslassen den
 * nächstgelegenen Tab (gesperrte Tabs — Verlauf für Free — federn zurück).
 *
 * Der Abstand zum Home-Indicator kommt aus der NATIVEN SafeAreaView (der
 * useSafeAreaInsets-Hook lieferte unter der New Architecture auf iOS 0).
 */

type TabName = 'HomeTab' | 'ProgressTab' | 'SettingsTab';

const LABEL_KEY: Record<TabName, string> = {
  HomeTab:     'tabs.home',
  ProgressTab: 'tabs.history',
  SettingsTab: 'tabs.profile',
};

const PAD = 6;
const GAP = 2;

function TabIcon({ name, color }: { name: TabName; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24">
      {name === 'HomeTab' && <Path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...common} />}
      {name === 'ProgressTab' && <Path d="M5 20v-7M12 20V5M19 20v-11" {...common} />}
      {name === 'SettingsTab' && (
        <>
          <Circle cx={12} cy={8} r={4} {...common} />
          <Path d="M4 21c0-4 4-6 8-6s8 2 8 6" {...common} />
        </>
      )}
    </Svg>
  );
}

/** Icon + Label in zwei Ebenen: inaktiv (grau) darunter, aktiv (blau) darüber, weich überblendet. */
function TabContent({ name, label, state, i }: { name: TabName; label: string; state: LiquidState; i: number }) {
  const { T } = useTheme();
  const activeStyle = useActiveOpacity(state, i);
  return (
    <View style={styles.tabInner}>
      <View style={styles.layer}>
        <TabIcon name={name} color={T.textSecondary} />
        <Text style={[styles.label, { color: T.textSecondary }]} numberOfLines={1}>{label}</Text>
      </View>
      <Animated.View style={[styles.layer, StyleSheet.absoluteFill, activeStyle]} pointerEvents="none">
        <TabIcon name={name} color={T.accentText} />
        <Text style={[styles.label, { color: T.accentText }]} numberOfLines={1}>{label}</Text>
      </Animated.View>
    </View>
  );
}

const FloatingTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const { T } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  // Leiste ist immer volle Breite minus 2 × Seitenrand — keine Messung nötig
  const { width: windowWidth } = useWindowDimensions();
  const barWidth = windowWidth - S.screen * 2;

  const count = state.routes.length;
  const itemWidth = barWidth > 0 ? (barWidth - PAD * 2 - GAP * (count - 1)) / count : 0;
  const liquid = useLiquidState(state.index, reduceMotion);

  /** Wechsel auslösen; true, wenn wirklich gewechselt wurde (Verlauf kann für Free gesperrt sein). */
  const selectTab = useCallback((target: number): boolean => {
    const route = state.routes[target];
    if (!route) return false;
    const focused = state.index === target;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) {
      hapticLight();
      navigation.dispatch({ ...CommonActions.navigate({ name: route.name, merge: true }), target: state.key });
      return true;
    }
    return false;
  }, [navigation, state]);

  const onDragEnd = useCallback((target: number) => {
    const changed = target !== state.index && selectTab(target);
    if (!changed) settleLiquid(liquid, state.index, reduceMotion);
    else liquid.dragging.value = withTiming(0, { duration: 160 });
  }, [state.index, selectTab, liquid, reduceMotion]);

  // Ziehen über die Leiste: Markierung folgt dem Finger, Loslassen wählt den nächsten Tab
  const step = itemWidth + GAP;
  const pan = Gesture.Pan()
    .enabled(itemWidth > 0 && !reduceMotion)
    .activeOffsetX([-10, 10])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      'worklet';
      const p = Math.min(count - 1, Math.max(0, (e.x - PAD - itemWidth / 2) / step));
      liquid.dragging.value = 1;
      liquid.from.value = liquid.pos.value;
      liquid.to.value = liquid.pos.value;
      liquid.pos.value = p;
      liquid.colorPos.value = p;
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onDragEnd)(Math.round(liquid.pos.value));
    });

  return (
    <SafeAreaView
      edges={['bottom']}
      pointerEvents="box-none"
      style={styles.wrap}
      onLayout={(e) => reportHeight?.(e.nativeEvent.layout.height)}
    >
      <GestureDetector gesture={pan}>
        <View style={styles.barOuter}>
          <Glass radius={R.tabBar} style={styles.bar} interactive>
            <LiquidIndicator
              state={liquid}
              index={state.index}
              count={count}
              itemWidth={itemWidth}
              gap={GAP}
              inset={PAD}
              height={SIZE.tabBarH - PAD * 2}
              radius={R.tab}
              color={T.accentTint}
              reduceMotion={reduceMotion}
            />
            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const name = route.name as TabName;
              const label = t(LABEL_KEY[name] ?? route.name);
              return (
                <Pressable3D
                  key={route.key}
                  onPress={() => selectTab(index)}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={label}
                  pressedScale={0.94}
                  style={styles.tab}
                >
                  <TabContent name={name} label={label} state={liquid} i={index} />
                </Pressable3D>
              );
            })}
          </Glass>
        </View>
      </GestureDetector>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  barOuter: {
    marginHorizontal: S.screen,
    marginBottom:     SIZE.tabBarGap,
  },
  bar: {
    height:        SIZE.tabBarH,
    padding:       PAD,
    flexDirection: 'row',
    gap:           GAP,
  },
  tab: {
    flex:         1,
    borderRadius: R.tab,
  },
  tabInner: { flex: 1 },
  layer: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            3,
  },
  label: {
    fontFamily:    F.semiBold,
    fontSize:      10.5,
    letterSpacing: 0.4,
  },
});

export default FloatingTabBar;
