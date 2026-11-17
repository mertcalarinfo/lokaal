import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';

import { HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAnalysis } from '../../hooks/useAnalysis';
import { incrementMonthlyUsage } from '../../services/storage';
import PressableScale from '../../components/PressableScale';
import { RC, MONO, MONO_MED, RS } from '../../theme/register';

import { useTabBarSpace } from '../../navigation/tabBarSpace';
type LoadingRoute = RouteProp<HomeStackParamList, 'AnalysisLoading'>;
type LoadingNav   = NativeStackNavigationProp<HomeStackParamList, 'AnalysisLoading'>;

const TIP_INTERVAL_MS = 4000;

const AnalysisLoadingScreen: React.FC = () => {
  const { t }      = useTranslation();
  const tabSpace   = useTabBarSpace(0);
  const navigation = useNavigation<LoadingNav>();
  const route      = useRoute<LoadingRoute>();
  const { user }   = useAuth();
  const { videoUri, answers } = route.params;
  const {
    state, uploadProgress, progress: realProgress,
    report, error, rawError, startAnalysis, cancel,
  } = useAnalysis();

  const [tipIndex,   setTipIndex]   = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  const hasStarted = useRef(false);

  const rawTips = t('analysis.loading.tips', { returnObjects: true });
  const tips: string[] = Array.isArray(rawTips) && rawTips.length > 0
    ? rawTips
    : ['Analyzing…', 'Processing…', 'Generating insights…'];

  // Pulsierendes Lade-Icon (identisch mit CompareScreen)
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1,    { duration: 700, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1, true,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // Cycle tips
  useEffect(() => {
    const id = setInterval(() => setTipIndex((p) => (p + 1) % tips.length), TIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tips.length]);

  // Ease display bar toward real progress
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayPct((prev) => {
        if (realProgress >= 100) return Math.min(100, prev + 4);
        const ceil = Math.min(realProgress + 18, 95);
        if (realProgress > prev)
          return Math.min(prev + Math.max(1, Math.ceil((realProgress - prev) / 3)), ceil);
        if (state === 'analyzing' && prev < ceil) return prev + 1;
        return prev;
      });
    }, 250);
    return () => clearInterval(id);
  }, [realProgress, state]);

  // Kick off analysis
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    (async () => {
      const result = await startAnalysis(videoUri, answers, user?.uid || 'anonymous', user?.language || 'en');
      if (result) {
        // Monatszähler nur bei erfolgreich abgeschlossener Analyse hochzählen.
        if (user?.uid) incrementMonthlyUsage(user.uid).catch(() => {});
        setDisplayPct(100);
        setTimeout(() => navigation.replace('Report', { report: result }), 300);
      }
    })();
  }, []);

  // Error alert — show only the i18n message; raw technical details stay in console only
  useEffect(() => {
    if (state === 'error' && error) {
      const msg = t(`analysis.errors.${error}`, { defaultValue: t('analysis.errors.generic') });
      Alert.alert(t('common.error'), msg, [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
    }
  }, [state, error]);

  const handleCancel = useCallback(() => {
    Alert.alert(t('common.cancel'), t('analysis.loading.cancelButton') + '?', [
      { text: t('common.no'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: () => { cancel(); navigation.goBack(); } },
    ]);
  }, [cancel, navigation, t]);

  return (
    <SafeAreaView style={[S.safe, { paddingBottom: tabSpace }]} edges={['top', 'left', 'right']}>

      {/* ── AKTENKOPF ── */}
      <View style={S.head}>
        <Text style={S.headTitle}>{t('analysis.headerTitle').toUpperCase()}</Text>
      </View>

      {/* ── LOADING (identische Struktur wie CompareScreen) ── */}
      <View style={S.loadingBox}>
        <Animated.View style={[S.loadingIconCircle, pulseStyle]}>
          <Sparkles size={30} color={RC.accent} strokeWidth={1.6} />
        </Animated.View>

        <View style={{ height: 22 }} />
        <Text style={S.loadingTitle}>{t('analysis.loading.title')}</Text>
        <View style={{ height: 8 }} />
        <Text style={S.loadingSubtitle}>{t('analysis.loading.subtitle')}</Text>

        <View style={{ height: 30 }} />
        <View style={S.barTrack}>
          <View style={[S.barFill, { width: `${displayPct}%` }]} />
        </View>
        <View style={S.barRow}>
          <Text style={S.barPct}>{displayPct}%</Text>
          <Text style={S.barStatus} numberOfLines={1}>
            {state === 'uploading' ? `${t('analysis.loading.uploadStatus')} ${uploadProgress}%` : tips[tipIndex]}
          </Text>
        </View>

        <View style={{ height: 30 }} />
        <PressableScale onPress={handleCancel}>
          <Text style={S.cancelTxt}>{t('analysis.loading.cancelButton')}</Text>
        </PressableScale>
      </View>

    </SafeAreaView>
  );
};

export default AnalysisLoadingScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: RC.bg },

  // Aktenkopf — im Lade-Screen ohne Trennlinie (zu dominant bei transientem Vollbild)
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: RS.headTop,
    paddingHorizontal: RS.screenH,
    paddingBottom: RS.headPadB,
  },
  headTitle: {
    fontFamily: MONO_MED,
    fontSize: 12,
    letterSpacing: 2,
    color: RC.text,
  },

  // Loading (identisch mit CompareScreen)
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: RS.screenH,
    paddingBottom: 40,
  },
  loadingIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: RC.accentWash,
    borderWidth: 1.5,
    borderColor: RC.accentLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: RC.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: RC.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  barTrack: {
    width: '100%',
    height: 2,
    backgroundColor: RC.line,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: 4,
    marginTop: -1,
    backgroundColor: RC.accent,
    borderRadius: 2,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  barPct: {
    fontFamily: MONO_MED,
    fontSize: 13,
    color: RC.accent,
  },
  barStatus: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 12,
    color: RC.faint,
    textAlign: 'right',
  },
  cancelTxt: {
    fontFamily: MONO,
    fontSize: 13,
    color: RC.faint,
    textDecorationLine: 'underline',
  },
});
