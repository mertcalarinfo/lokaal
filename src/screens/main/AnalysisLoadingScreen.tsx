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
import { HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAnalysis } from '../../hooks/useAnalysis';
import Button from '../../components/Button';

const COLORS = {
  background: '#000000',
  surface: '#0a0f1e',
  surfaceElevated: '#111827',
  primary: '#3B7FE8',
  primaryLight: '#5B9AFF',
  accent: '#FF6B6B',
  success: '#4ECDC4',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8EA0',
  textMuted: '#4a5568',
  border: '#1a2235',
};

type AnalysisLoadingRouteProp = RouteProp<HomeStackParamList, 'AnalysisLoading'>;
type AnalysisLoadingNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'AnalysisLoading'>;

const TIP_INTERVAL_MS = 4000;
const SIMULATED_DURATION_MS = 50000;

const AnalysisLoadingScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<AnalysisLoadingNavigationProp>();
  const route = useRoute<AnalysisLoadingRouteProp>();
  const { user } = useAuth();

  const { videoUri, answers } = route.params;

  const { state, uploadProgress, report, error, startAnalysis, cancel } = useAnalysis();

  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tipTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStarted = useRef(false);

  const tips = t('analysis.loading.tips', { returnObjects: true }) as string[];

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

  // Simulated progress (0–95%)
  useEffect(() => {
    const startTime = Date.now();
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const frac = Math.min(elapsed / SIMULATED_DURATION_MS, 0.95);
      const pct = Math.round(frac * 100);
      setProgress(pct);
      setSecondsRemaining(Math.max(0, Math.round((SIMULATED_DURATION_MS - elapsed) / 1000)));

      Animated.timing(progressAnim, {
        toValue: frac,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }, 500);

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

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
        // Complete progress bar
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          navigation.replace('Report', { report: result });
        });
      }
    };

    run();
  }, []);

  // Handle errors
  useEffect(() => {
    if (state === 'error' && error) {
      const errorKey = `analysis.errors.${error}`;
      const message = t(errorKey, { defaultValue: t('analysis.errors.generic') });

      Alert.alert(
        t('common.error'),
        message,
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

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const displayProgress = state === 'uploading'
    ? Math.min(uploadProgress * 0.3, 30) // Upload takes 0-30%
    : progress;

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
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressBarWidth },
              ]}
            />
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
    marginBottom: 40,
  },
  logoOuter: {
    marginBottom: 16,
  },
  logoImage: {
    width: 88,
    height: 88,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 4,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
