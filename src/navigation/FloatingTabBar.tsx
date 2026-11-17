import React, { useContext } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { BottomTabBarProps, BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle } from 'react-native-svg';

import { useTheme } from '../contexts/ThemeContext';
import Glass from '../components/Glass';
import { F, R, S, SIZE } from '../theme';

/**
 * Schwebende Tab-Leiste (Entwurf 5): 3 Tabs mit Beschriftung, Glas,
 * links/rechts 24, unten Safe Area + 8, Höhe 64, Radius 20, Innenabstand 6.
 *
 * Der Abstand zum Home-Indicator kommt aus der NATIVEN SafeAreaView (der
 * useSafeAreaInsets-Hook lieferte unter der New Architecture auf iOS 0).
 * Die gemessene Gesamthöhe geht an React Navigation, damit Screens über
 * useTabBarSpace() genug Abstand nach unten halten.
 */

type TabName = 'HomeTab' | 'ProgressTab' | 'SettingsTab';

const LABEL_KEY: Record<TabName, string> = {
  HomeTab:     'tabs.home',
  ProgressTab: 'tabs.history',
  SettingsTab: 'tabs.profile',
};

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

const FloatingTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const { T } = useTheme();
  const { t } = useTranslation();
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);

  return (
    <SafeAreaView
      edges={['bottom']}
      pointerEvents="box-none"
      style={styles.wrap}
      onLayout={(e) => reportHeight?.(e.nativeEvent.layout.height)}
    >
      <Glass radius={R.tabBar} style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const name = route.name as TabName;
          const color = focused ? T.accentText : T.textSecondary;
          const label = t(LABEL_KEY[name] ?? route.name);

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.dispatch({ ...CommonActions.navigate({ name: route.name, merge: true }), target: state.key });
            }
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={[styles.tab, focused && { backgroundColor: T.accentTint }]}
            >
              <TabIcon name={name} color={color} />
              <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </Glass>
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
  bar: {
    marginHorizontal: S.screen,
    marginBottom:     SIZE.tabBarGap,
    height:           SIZE.tabBarH,
    padding:          6,
    flexDirection:    'row',
    gap:              2,
  },
  tab: {
    flex:           1,
    borderRadius:   R.tab,
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
