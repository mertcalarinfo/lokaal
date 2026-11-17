import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
import AmbientBackground from '../../components/AmbientBackground';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../../theme';

import { useTabBarSpace } from '../../navigation/tabBarSpace';
type LoadingRoute = RouteProp<HomeStackParamList, 'AnalysisLoading'>;
type LoadingNav   = NativeStackNavigationProp<HomeStackParamList, 'AnalysisLoading'>;

const TIP_INTERVAL_MS = 4000;

const AnalysisLoadingScreen: React.FC = () => {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
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
    <View style={S.safe}>
      <AmbientBackground animated={false} />
      <SafeAreaView style={{ flex: 1, paddingBottom: tabSpace }} edges={['top', 'left', 'right']}>
        <View style={S.head}>
          <Text style={S.label}>{t('analysis.headerTitle')}</Text>
        </View>

        <View style={S.loadingBox}>
          <Card style={S.card}>
            <Animated.View style={[S.loadingIconCircle, pulseStyle]}>
              <Sparkles size={26} color={T.accentText} strokeWidth={1.6} />
            </Animated.View>

            <Text style={S.loadingTitle}>{t('analysis.loading.title')}</Text>
            <Text style={S.loadingSubtitle}>{t('analysis.loading.subtitle')}</Text>

            <View style={S.barTrack}>
              <View style={[S.barFill, { width: `${displayPct}%` }]} />
            </View>
            <View style={S.barRow}>
              <Text style={S.barPct}>{displayPct}%</Text>
              <Text style={S.barStatus} numberOfLines={1}>
                {state === 'uploading' ? `${t('analysis.loading.uploadStatus')} ${uploadProgress}%` : tips[tipIndex]}
              </Text>
            </View>
          </Card>

          <Button label={t('analysis.loading.cancelButton')} variant="ghost" onPress={handleCancel} />
        </View>
      </SafeAreaView>
    </View>
  );
};

export default AnalysisLoadingScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:  { flex: 1, backgroundColor: T.bg },
  head:  { paddingHorizontal: SP.screen, paddingTop: SP.top, minHeight: 44, justifyContent: 'center' },
  label: { ...TY.label, color: T.textSecondary },

  loadingBox: { flex: 1, justifyContent: 'center', paddingHorizontal: SP.screen, paddingBottom: 40, gap: 12 },
  card:       { padding: 22, alignItems: 'center' },
  loadingIconCircle: {
    width: 56, height: 56, borderRadius: R.tile, backgroundColor: T.accentTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  loadingTitle:    { ...TY.rowTitle, fontSize: 19, lineHeight: 24, color: T.text, textAlign: 'center' },
  loadingSubtitle: { ...TY.bodySm, color: T.textSecondary, textAlign: 'center', marginTop: 6 },
  barTrack: {
    alignSelf: 'stretch', height: 4, backgroundColor: T.track, borderRadius: 2,
    overflow: 'hidden', marginTop: 24, marginBottom: 8,
  },
  barFill:   { height: 4, backgroundColor: T.accentData, borderRadius: 2 },
  barRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', gap: 12 },
  barPct:    { fontFamily: F.semiBold, fontSize: 13, color: T.accentText, fontVariant: ['tabular-nums'] },
  barStatus: { flex: 1, ...TY.captionSm, color: T.textSecondary, textAlign: 'right' },
});
