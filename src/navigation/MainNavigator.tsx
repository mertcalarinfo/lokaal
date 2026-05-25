import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MainTabParamList, MainStackParamList, HomeStackParamList } from '../types';
import HomeScreen from '../screens/main/HomeScreen';
import AnalysisLoadingScreen from '../screens/main/AnalysisLoadingScreen';
import ReportScreen from '../screens/main/ReportScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import PaywallScreen from '../screens/paywall/PaywallScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

const COLORS = {
  background: '#0a1628',
  surface: '#0d1b2e',
  primary: '#3B7FE8',
  textMuted: 'rgba(255,255,255,0.35)',
  border: 'rgba(59,127,232,0.3)',
};

const HomeStackNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Onboarding" component={OnboardingScreen} />
      <HomeStack.Screen
        name="AnalysisLoading"
        component={AnalysisLoadingScreen}
        options={{ gestureEnabled: false }}
      />
      <HomeStack.Screen name="Report" component={ReportScreen} />
      <HomeStack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </HomeStack.Navigator>
  );
};

// Inner tab navigator — separated so useSafeAreaInsets can be called as a hook
const TabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          // Extend height by the system navigation bar inset so nothing is hidden
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          fontFamily: 'DMSans_700Bold',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'mic' : 'mic-outline';
          } else if (route.name === 'ProgressTab') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName as any} size={22} color={color} />;
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

// Outer stack — exposes Paywall as a root-level modal accessible from any tab
const MainNavigator: React.FC = () => {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Tabs" component={TabNavigator} />
      <MainStack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </MainStack.Navigator>
  );
};

export default MainNavigator;
