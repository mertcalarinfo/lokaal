import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, TrendingUp, Settings2 } from 'lucide-react-native';

import { MainTabParamList, MainStackParamList } from '../types';
import HomeScreen from '../screens/main/HomeScreen';
import AnalysisLoadingScreen from '../screens/main/AnalysisLoadingScreen';
import ReportScreen from '../screens/main/ReportScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import PaywallScreen from '../screens/paywall/PaywallScreen';
import { HomeStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { F } from '../theme';

const Tab      = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

const HomeStackNavigator: React.FC = () => {
  const { T } = useTheme();

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: T.bg },
        animation: 'slide_from_right',
      }}
    >
      <HomeStack.Screen name="Home"           component={HomeScreen} />
      <HomeStack.Screen name="Onboarding"     component={OnboardingScreen} />
      <HomeStack.Screen
        name="AnalysisLoading"
        component={AnalysisLoadingScreen}
        options={{ gestureEnabled: false }}
      />
      <HomeStack.Screen name="Report"         component={ReportScreen} />
    </HomeStack.Navigator>
  );
};

// Tab navigator ist ein separates Component, damit useSafeAreaInsets als Hook funktioniert.
const TabNavigator: React.FC = () => {
  const { t }    = useTranslation();
  const insets   = useSafeAreaInsets();
  const { T }    = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // ── Tab Bar — exakt aus DESIGN_SYSTEM.html ──────────────────────────
        tabBarStyle: {
          backgroundColor: T.bgDeep,
          borderTopColor:  T.line,
          borderTopWidth:  1,
          height:          60 + insets.bottom,
          paddingTop:      12,
          paddingBottom:   insets.bottom + 14,
        },
        tabBarActiveTintColor:   T.accent,
        tabBarInactiveTintColor: T.textFaint,
        tabBarLabelStyle: {
          fontSize:   10.5,
          fontWeight: '500',
          fontFamily: F.medium,
          marginTop:  4,
        },

        // ── Icons — Lucide, stroke 1.7, round ──────────────────────────────
        tabBarIcon: ({ color }) => {
          const s = 1.7;
          if (route.name === 'HomeTab')     return <Mic        size={22} color={color} strokeWidth={s} />;
          if (route.name === 'ProgressTab') return <TrendingUp size={22} color={color} strokeWidth={s} />;
          return                                   <Settings2  size={22} color={color} strokeWidth={s} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Analyze' }}
      />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressScreen}
        options={{ tabBarLabel: t('progress.title') }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ tabBarLabel: t('settings.title') }}
      />
    </Tab.Navigator>
  );
};

// Root-Stack — Paywall und EditGoals als Root-Level-Modals.
const MainNavigator: React.FC = () => {
  const { T } = useTheme();

  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Tabs"      component={TabNavigator} />
      <MainStack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: T.bg },
        }}
      />
      <MainStack.Screen
        name="EditGoals"
        component={OnboardingScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: T.bg },
        }}
      />
    </MainStack.Navigator>
  );
};

export default MainNavigator;
