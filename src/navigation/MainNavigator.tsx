import React, { useState, useRef, useCallback, useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { MainTabParamList, MainStackParamList, ProgressStackParamList, HomeStackParamList } from '../types';
import HomeScreen from '../screens/main/HomeScreen';
import AnalysisLoadingScreen from '../screens/main/AnalysisLoadingScreen';
import ReportScreen from '../screens/main/ReportScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import CompareScreen from '../screens/main/CompareScreen';
import AnalysesListScreen from '../screens/main/AnalysesListScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import PaywallScreen from '../screens/paywall/PaywallScreen';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../contexts/ThemeContext';
import { MODAL_TRANSITION_SETTLE_MS } from '../contexts/AuthContext';
import ProPreviewModal from '../components/ProPreviewModal';
import FloatingTabBar from './FloatingTabBar';

const Tab           = createBottomTabNavigator<MainTabParamList>();
const HomeStack     = createNativeStackNavigator<HomeStackParamList>();
const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();
const MainStack     = createNativeStackNavigator<MainStackParamList>();

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

// Verlauf: Übersicht + KI-Vergleich (früher eigener Tab "Vergleich").
// Erreichbar nur über den Verlauf-Tab, der für Free-Nutzer gesperrt ist —
// damit ist der Vergleich ebenfalls Pro.
const ProgressStackNavigator: React.FC = () => {
  const { T } = useTheme();
  return (
    <ProgressStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: T.bg },
        animation: 'slide_from_right',
      }}
    >
      <ProgressStack.Screen name="Progress"    component={ProgressScreen} />
      <ProgressStack.Screen name="AllAnalyses" component={AnalysesListScreen} />
      <ProgressStack.Screen name="Compare"     component={CompareScreen} />
    </ProgressStack.Navigator>
  );
};

const TabNavigator: React.FC = () => {
  const navigation  = useNavigation<any>();   // hier: Parent-Stack (MainStack) → navigate('Paywall')
  const { user }    = useAuth();
  const { isPro }   = useSubscription(user?.uid || null);
  const [showProModal, setShowProModal] = useState(false);

  // ProPreviewModal (RN-Modal) schließt, die Paywall ist ein natives Stack-Modal.
  // Beides in einem Zug zu wechseln kann auf iOS eine Taps blockierende Ebene
  // hinterlassen — daher erst navigieren, wenn das Schließen abgeschlossen ist.
  const paywallTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paywallInteraction = useRef<{ cancel: () => void } | null>(null);
  const cancelPendingPaywall = useCallback(() => {
    paywallInteraction.current?.cancel();
    paywallInteraction.current = null;
    if (paywallTimer.current) clearTimeout(paywallTimer.current);
    paywallTimer.current = null;
  }, []);
  useEffect(() => cancelPendingPaywall, [cancelPendingPaywall]);

  const handleUnlock = useCallback(() => {
    setShowProModal(false);
    cancelPendingPaywall();
    paywallInteraction.current = InteractionManager.runAfterInteractions(() => {
      paywallTimer.current = setTimeout(() => {
        paywallTimer.current = null;
        navigation.navigate('Paywall');
      }, MODAL_TRANSITION_SETTLE_MS);
    });
  }, [navigation, cancelPendingPaywall]);

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
        <Tab.Screen
          name="ProgressTab"
          component={ProgressStackNavigator}
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
        onUnlock={handleUnlock}
      />
    </>
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
