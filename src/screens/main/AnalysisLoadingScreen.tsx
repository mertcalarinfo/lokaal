import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAnalysis } from '../../hooks/useAnalysis';
import Button from '../../components/Button';

const COLORS = {
  background: '#0a1628',
  surface: '#0d1b2e',
  surfaceElevated: '#111d30',
  primary: '#3B7FE8',
  primaryLight: '#5B9AFF',
  accent: '#FF6B6B',
  success: '#4ECDC4',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.35)',
  border: 'rgba(59,127,232,0.3)',
};

type AnalysisLoadingRouteProp = RouteProp<HomeStackParamList, 'AnalysisLoading'>;
type AnalysisLoadingNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'AnalysisLoading'>;

const TIP_INTERVAL_MS = 4000;

const AnalysisLoadingScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<AnalysisLoadingNavigationProp>();
  const route = useRoute<AnalysisLoadingRouteProp>();
  const { user } = useAuth();

  const { videoUri, answers } = route.params;

  const { state, uploadProgress, progress: realProgress, report, error, rawError, startAnalysis, cancel } = useAnalysis();

  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  // Displayed percentage — eased toward the real progress, with a gentle creep
  // during long server-side stages so the bar never looks frozen.
  const [displayPct, setDisplayPct] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tipTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStarted = useRef(false);

  // Estimate remaining time from real progress (nominal 60s full run).
  const secondsRemaining = Math.max(1, Math.round(((100 - displayPct) / 100) * 60));

  // `returnObjects: true` can return undefined when i18n hasn't loaded the
  // namespace yet (common on Android before the first render cycle completes).
  // Fall back to a non-empty array so `tips.length` never throws.
  const rawTips = t('analysis.loading.tips', { returnObjects: true });
  const tips: string[] = Array.isArray(rawTips) && rawTips.length > 0
    ? rawTips
    : ['Analyzing your presentation...', 'Processing video frames...', 'Generating insights...'];

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Rotate through tips
  useEffect(() => {
    tipTimer.current = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, TIP_INTERVAL_MS);

    return () => {
      if (tipTimer.current) clearInterval(tipTimer.current);
    };
  }, [tips.length]);

  // Ease the displayed bar toward the real progress value. While a server-side
  // stage plateaus (e.g. the model is generating), creep slowly upward — but
  // never past a ceiling just above the last real checkpoint, so the number
  // still reflects genuine progress rather than a pure animation.
  useEffect(() => {
    const id = setInterval(() => {
      setDisplayPct((prev) => {
        if (realProgress >= 100) return Math.min(100, prev + 4);
        const creepCeil = Math.min(realProgress + 18, 95);
        if (realProgress > prev) {
          // Catch up to a real checkpoint quickly
          return Math.min(prev + Math.max(1, Math.ceil((realProgress - prev) / 3)), creepCeil);
        }
        if (state === 'analyzing' && prev < creepCeil) {
          return prev + 1; // gentle creep during the long wait
        }
        return prev;
      });
    }, 250);
    return () => clearInterval(id);
  }, [realProgress, state]);

  // Start analysis
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const run = async () => {
      const result = await startAnalysis(
        videoUri,
        answers,
        user?.uid || 'anonymous',
        user?.language || 'en'
      );

      if (result) {
        // Snap the bar to 100% then hand off to the report screen.
        setDisplayPct(100);
        setTimeout(() => {
          navigation.replace('Report', { report: result });
        }, 300);
      }
    };

    run();
  }, []);

  // Handle errors — show the exact raw error so failures are diagnosable
  // even without a dev console (e.g. preview / TestFlight builds).
  useEffect(() => {
    if (state === 'error' && error) {
      const errorKey = `analysis.errors.${error}`;
      const friendlyMessage = t(errorKey, { defaultValue: t('analysis.errors.generic') });

      // Always append the raw technical error so you can see exactly what went
      // wrong from the app itself — no Expo logs / Metro needed.
      const fullMessage = rawError
        ? `${friendlyMessage}\n\n— Debug —\n${rawError}`
        : friendlyMessage;

      Alert.alert(
        t('common.error'),
        fullMessage,
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [state, error]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('common.cancel'),
      t('analysis.loading.cancelButton') + '?',
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: () => {
            cancel();
            navigation.goBack();
          },
        },
      ]
    );
  }, [cancel, navigation, t]);

  const displayProgress = displayPct;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Animated logo */}
        <View style={styles.logoSection}>
          <Animated.View style={[styles.logoOuter, { transform: [{ scale: pulseAnim }] }]}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
          <Text style={styles.logoText}>PREZENCE</Text>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{t('analysis.loading.title')}</Text>
          <Text style={styles.subtitle}>{t('analysis.loading.subtitle')}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${displayProgress}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>{displayProgress}%</Text>
            <Text style={styles.timeRemaining}>
              {t('analysis.loading.estimatedTime', { seconds: secondsRemaining })}
            </Text>
          </View>
        </View>

        {/* Rotating tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipDot} />
          <Text style={styles.tipText}>{tips[currentTipIndex]}</Text>
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          {state === 'uploading' && (
            <View style={styles.statusRow}>
              <Ionicons name="cloud-upload-outline" size={16} color={COLORS.primary} />
              <Text style={styles.statusText}>Uploading video... {uploadProgress}%</Text>
            </View>
          )}
          {state === 'analyzing' && (
            <View style={styles.statusRow}>
              <Ionicons name="sparkles-outline" size={16} color={COLORS.primaryLight} />
              <Text style={styles.statusText}>AI analysis in progress...</Text>
            </View>
          )}
        </View>

        {/* Cancel button */}
        <View style={styles.cancelSection}>
          <Button
            label={t('analysis.loading.cancelButton')}
            onPress={handleCancel}
            variant="ghost"
            size="sm"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoOuter: {
    marginBottom: 12,
  },
  logoImage: {
    width: 64,
    height: 64,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 4,
    fontFamily: 'DMSans_700Bold',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
  },
  progressSection: {
    width: '100%',
    marginBottom: 32,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  timeRemaining: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 56,
  },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 12,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
  },
  statusContainer: {
    minHeight: 30,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  cancelSection: {
    marginTop: 16,
  },
});

export default AnalysisLoadingScreen;
