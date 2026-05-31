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
import { C, F, R, S } from '../theme';

const Tab  = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

const HomeStackNavigator: React.FC = () => (
  <HomeStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: C.bg },
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

// Tab navigator is a separate component so useSafeAreaInsets works as a hook.
const TabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // ── Tab Bar — exact spec from DESIGN_SYSTEM.html ──────────────────
        tabBarStyle: {
          backgroundColor: C.bgDeep,
          borderTopColor: C.line,
          borderTopWidth: 1,
          // Height: icon (22) + label + paddingTop (12) + paddingBottom (14) + system inset
          height: 60 + insets.bottom,
          paddingTop: 12,
          paddingBottom: insets.bottom + 14,
        },
        tabBarActiveTintColor:   C.accent,
        tabBarInactiveTintColor: C.textFaint,
        tabBarLabelStyle: {
          fontSize:   10.5,
          fontWeight: '500',
          fontFamily: F.medium,
          marginTop:  4,
        },

        // ── Icons — Lucide, stroke 1.7, round ────────────────────────────
        tabBarIcon: ({ focused, color }) => {
          const s = 1.7;
          if (route.name === 'HomeTab') {
            return <Mic size={22} color={color} strokeWidth={s} />;
          }
          if (route.name === 'ProgressTab') {
            return <TrendingUp size={22} color={color} strokeWidth={s} />;
          }
          return <Settings2 size={22} color={color} strokeWidth={s} />;
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

// Root stack — Paywall and EditGoals as root-level modals.
const MainNavigator: React.FC = () => (
  <MainStack.Navigator screenOptions={{ headerShown: false }}>
    <MainStack.Screen name="Tabs"      component={TabNavigator} />
    <MainStack.Screen
      name="Paywall"
      component={PaywallScreen}
      options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
    />
    <MainStack.Screen
      name="EditGoals"
      component={OnboardingScreen}
      options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
    />
  </MainStack.Navigator>
);

export default MainNavigator;
