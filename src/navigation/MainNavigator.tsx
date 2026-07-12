import React, { useState } from 'react';
import { createBottomTabNavigator, BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, TrendingUp, Settings2, GitCompare } from 'lucide-react-native';

import { MainTabParamList, MainStackParamList } from '../types';
import HomeScreen from '../screens/main/HomeScreen';
import AnalysisLoadingScreen from '../screens/main/AnalysisLoadingScreen';
import ReportScreen from '../screens/main/ReportScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import CompareScreen from '../screens/main/CompareScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import PaywallScreen from '../screens/paywall/PaywallScreen';
import { HomeStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import ProPreviewModal from '../components/ProPreviewModal';
import { RC, MONO_MED } from '../theme/register';

const Tab      = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

// Custom tab bar: apply the bottom safe-area inset via the NATIVE SafeAreaView
// component instead of the useSafeAreaInsets() hook. Under the New Architecture
// the hook returned bottom: 0 on iOS, so the tab icons sat flush against the
// home indicator. The native SafeAreaView measures the inset reliably. The
// tabBarStyle below uses fixed paddingBottom so BottomTabBar never adds an
// inset of its own — the wrapper is the single source of the home-indicator gap.
const SafeTabBar: React.FC<BottomTabBarProps> = (props) => (
  <SafeAreaView edges={['bottom']} style={{ backgroundColor: RC.bg }}>
    <BottomTabBar {...props} />
  </SafeAreaView>
);

const HomeStackNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: RC.bg },
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
  const navigation  = useNavigation<any>();   // hier: Parent-Stack (MainStack) → navigate('Paywall')
  const { user }    = useAuth();
  const { isPro }   = useSubscription(user?.uid || null);
  const [showProModal, setShowProModal] = useState(false);

  return (
    <>
    <Tab.Navigator
      tabBar={(props) => <SafeTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,

        // ── Tab Bar — Register-Design (Cremeweiß, Kobalt aktiv, dezenter Hairline-Trenner) ──
        // Feste Werte: der Home-Indicator-Abstand kommt aus dem nativen
        // SafeAreaView-Wrapper (SafeTabBar), nicht aus insets im Style.
        tabBarStyle: {
          backgroundColor: RC.bg,
          borderTopColor:  RC.lineFaint,
          borderTopWidth:  1,
          height:          60,
          paddingTop:      12,
          paddingBottom:   8,
        },
        tabBarActiveTintColor:   RC.accent,
        tabBarInactiveTintColor: RC.muted,
        tabBarLabelStyle: {
          fontSize:   10.5,
          fontWeight: '500',
          fontFamily: MONO_MED,
          marginTop:  4,
        },

        // ── Icons — Lucide, stroke 1.7, round; 4 Tabs → keine Labels ──────
        tabBarShowLabel: false,
        tabBarIcon: ({ color }) => {
          const s = 1.7;
          if (route.name === 'HomeTab')     return <Mic        size={22} color={color} strokeWidth={s} />;
          if (route.name === 'CompareTab')  return <GitCompare size={22} color={color} strokeWidth={s} />;
          if (route.name === 'ProgressTab') return <TrendingUp size={22} color={color} strokeWidth={s} />;
          return                                   <Settings2  size={22} color={color} strokeWidth={s} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab"     component={HomeStackNavigator} />
      <Tab.Screen name="CompareTab"  component={CompareScreen} />
      <Tab.Screen
        name="ProgressTab"
        component={ProgressScreen}
        listeners={{
          tabPress: (e) => {
            // Free-Nutzer: Navigation abfangen, bevor der Screen erscheint → Pro-Modal.
            if (!isPro) {
              e.preventDefault();
              setShowProModal(true);
            }
          },
        }}
      />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} />
    </Tab.Navigator>

    <ProPreviewModal
      visible={showProModal}
      onClose={() => setShowProModal(false)}
      onUnlock={() => { setShowProModal(false); navigation.navigate('Paywall'); }}
    />
    </>
  );
};

// Root-Stack — Paywall und EditGoals als Root-Level-Modals.
const MainNavigator: React.FC = () => {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Tabs"      component={TabNavigator} />
      <MainStack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: RC.bg },
        }}
      />
      <MainStack.Screen
        name="EditGoals"
        component={OnboardingScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: RC.bg },
        }}
      />
    </MainStack.Navigator>
  );
};

export default MainNavigator;
