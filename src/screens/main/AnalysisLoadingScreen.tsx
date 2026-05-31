import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Upload, Sparkles } from 'lucide-react-native';

import { HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAnalysis } from '../../hooks/useAnalysis';
import Button from '../../components/Button';
import { C, F, R, S } from '../../theme';

type LoadingRoute = RouteProp<HomeStackParamList, 'AnalysisLoading'>;
type LoadingNav   = NativeStackNavigationProp<HomeStackParamList, 'AnalysisLoading'>;

const TIP_INTERVAL_MS = 4000;

const AnalysisLoadingScreen: React.FC = () => {
  const { t }          = useTranslation();
  const navigation     = useNavigation<LoadingNav>();
  const route          = useRoute<LoadingRoute>();
  const { user }       = useAuth();
  const { videoUri, answers } = route.params;

  const {
    state, uploadProgress, progress: realProgress,
    report, error, rawError, startAnalysis, cancel,
  } = useAnalysis();

  const [tipIndex,    setTipIndex]    = useState(0);
  const [displayPct,  setDisplayPct]  = useState(0);
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const hasStarted = useRef(false);

  const secondsRemaining = Math.max(1, Math.round(((100 - displayPct) / 100) * 60));

  const rawTips = t('analysis.loading.tips', { returnObjects: true });
  const tips: string[] = Array.isArray(rawTips) && rawTips.length > 0
    ? rawTips
    : ['Analyzing…', 'Processing…', 'Generating insights…'];

  // Pulse logo
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

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
        setDisplayPct(100);
        setTimeout(() => navigation.replace('Report', { report: result }), 300);
      }
    })();
  }, []);

  // Error alert
  useEffect(() => {
    if (state === 'error' && error) {
      const msg = t(`analysis.errors.${error}`, { defaultValue: t('analysis.errors.generic') });
      const full = rawError ? `${msg}\n\n— Debug —\n${rawError}` : msg;
      Alert.alert(t('common.error'), full, [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
    }
  }, [state, error]);

  const handleCancel = useCallback(() => {
    Alert.alert(t('common.cancel'), t('analysis.loading.cancelButton') + '?', [
      { text: t('common.no'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: () => { cancel(); navigation.goBack(); } },
    ]);
  }, [cancel, navigation, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>

        {/* Logo */}
        <View style={styles.logoSection}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Image source={require('../../../assets/logo.png')} style={styles.logoImg} resizeMode="contain" />
          </Animated.View>
          <Text style={styles.wordmark}>PREZENCE</Text>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{t('analysis.loading.title')}</Text>
          <Text style={styles.subtitle}>{t('analysis.loading.subtitle')}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.barSection}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${displayPct}%` }]} />
          </View>
          <View style={styles.barLabels}>
            <Text style={styles.barPct}>{displayPct}%</Text>
            <Text style={styles.barEta}>
              {t('analysis.loading.estimatedTime', { seconds: secondsRemaining })}
            </Text>
          </View>
        </View>

        {/* Rotating tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipDot} />
          <Text style={styles.tipText}>{tips[tipIndex]}</Text>
        </View>

        {/* Status */}
        <View style={styles.statusRow}>
          {state === 'uploading' && (
            <>
              <Upload size={14} color={C.textFaint} strokeWidth={1.7} />
              <Text style={styles.statusText}>Uploading… {uploadProgress}%</Text>
            </>
          )}
          {state === 'analyzing' && (
            <>
              <Sparkles size={14} color={C.accent} strokeWidth={1.7} />
              <Text style={styles.statusText}>AI analysiert…</Text>
            </>
          )}
        </View>

        {/* Cancel */}
        <Button
          label={t('analysis.loading.cancelButton')}
          onPress={handleCancel}
          variant="ghost"
          size="sm"
          style={styles.cancelBtn}
        />

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: S.s8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: S.s10,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: S.s6,
  },
  logoImg: {
    width: 56,
    height: 56,
    marginBottom: S.s3,
  },
  wordmark: {
    fontFamily:    F.xBold,
    fontSize:      16,
    fontWeight:    '800',
    color:         C.text,
    letterSpacing: 5,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: S.s6,
  },
  title: {
    fontFamily:  F.bold,
    fontSize:    20,
    fontWeight:  '700',
    color:       C.text,
    marginBottom: S.s2,
    textAlign:   'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: F.regular,
    fontSize:   14.5,
    color:      C.textMuted,
    textAlign:  'center',
    lineHeight: 21,
  },
  barSection: {
    width: '100%',
    marginBottom: S.s8,
  },
  barTrack: {
    height:          2,
    backgroundColor: C.line,
    borderRadius:    2,
    overflow:        'hidden',
    marginBottom:    S.s2,
  },
  barFill: {
    height:          4,
    marginTop:       -1,
    backgroundColor: C.accent,
    borderRadius:    2,
  },
  barLabels: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  barPct: {
    fontFamily: F.semiBold,
    fontSize:   13,
    fontWeight: '600',
    color:      C.accent,
  },
  barEta: {
    fontFamily: F.regular,
    fontSize:   12,
    color:      C.textFaint,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems:    'center',
    backgroundColor: C.surface,
    borderRadius:  R.md,
    padding:       S.s4,
    marginBottom:  S.s6,
    width:         '100%',
    borderWidth:   1,
    borderColor:   C.hairline,
    minHeight:     52,
  },
  tipDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginRight:  S.s3,
    flexShrink:   0,
  },
  tipText: {
    flex:       1,
    fontFamily: F.regular,
    fontSize:   14,
    color:      C.textMuted,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    minHeight:     24,
    marginBottom:  S.s4,
  },
  statusText: {
    fontFamily: F.regular,
    fontSize:   12,
    color:      C.textFaint,
  },
  cancelBtn: {
    marginTop: S.s4,
  },
});

export default AnalysisLoadingScreen;
