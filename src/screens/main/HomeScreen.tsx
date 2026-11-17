import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

import { HomeStackParamList, OnboardingAnswers, AnalysisReport } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import { getUserReports, getMonthlyUsage } from '../../services/storage';
import { useTabBarSpace } from '../../navigation/tabBarSpace';
import AmbientBackground from '../../components/AmbientBackground';
import Card, { IconTile } from '../../components/Card';
import Button from '../../components/Button';
import ScoreRing from '../../components/ScoreRing';
import VideoThumbnail from '../../components/VideoThumbnail';
import PrezenceLogo from '../../components/PrezenceLogo';
import { ChevronRight, UploadIcon, CameraIcon, TrendUpIcon, TrendDownIcon } from '../../components/Icons';
import { ThemeColors, F, R, S as SP, TY } from '../../theme';

type HomeNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const MAX_VIDEO_DURATION_SECONDS = 300;

function getVideoDurationSeconds(raw?: number | null): number | undefined {
  if (!raw || raw <= 0) return undefined;
  let seconds = raw / 1000;
  if (seconds > 6 * 3600) seconds = seconds / 1000;
  return seconds;
}

type TFn = (key: string, opts?: any) => string;

function score100(s: number): number {
  return Math.round(s * 10);
}

function getGreeting(t: TFn, firstName: string): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? t('home.greetingMorning') : hour < 18 ? t('home.greetingDay') : t('home.greetingEvening');
  return firstName ? `${time}, ${firstName}` : time;
}

function formatRelative(t: TFn, d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  // Kleinschreibung wie in der Vorlage ("vor 3 Tagen")
  return days <= 0 ? t('common.today') : days === 1 ? t('common.yesterday') : t('common.daysAgo', { count: days });
}

const formatDuration = (s: number) =>
  `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

function OptionCard({
  icon, label, sub, onPress, styles, T,
}: {
  icon: 'upload' | 'record'; label: string; sub: string; onPress: () => void;
  styles: ReturnType<typeof createStyles>; T: ThemeColors;
}) {
  return (
    <Card onPress={onPress} style={styles.rowCard} accessibilityLabel={`${label}, ${sub}`}>
      <IconTile size={44}>
        {icon === 'upload' ? <UploadIcon color={T.accentText} /> : <CameraIcon color={T.accentText} />}
      </IconTile>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <ChevronRight color={T.textSecondary} />
    </Card>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const HomeScreen: React.FC = () => {
  const { t }      = useTranslation();
  const tabSpace   = useTabBarSpace();
  const navigation = useNavigation<HomeNavigationProp>();
  const { T }      = useTheme();
  const styles     = useMemo(() => createStyles(T), [T]);
  const { user }   = useAuth();
  const { canAnalyze, monthlyLimit, analysesThisMonth, isPro } = useSubscription(user?.uid || null);

  const [selectedVideo, setSelectedVideo] = useState<{ uri: string; duration?: number } | null>(null);
  const [lastReport,    setLastReport]    = useState<AnalysisReport | null>(null);
  const [prevReport,    setPrevReport]    = useState<AnalysisReport | null>(null);
  // Frischer Monatszähler bei jedem Fokus (der Hook lädt nur beim Mounten).
  const [usedFresh,     setUsedFresh]     = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user?.uid) return;
    getUserReports(user.uid).then((reports) => {
      setLastReport(reports[0] ?? null);
      setPrevReport(reports[1] ?? null);
    }).catch(() => {});
    getMonthlyUsage(user.uid).then(setUsedFresh).catch(() => {});
  }, [user?.uid]));

  const greeting = getGreeting(t, (user?.displayName ?? '').split(' ')[0] ?? '');
  const used     = usedFresh ?? analysesThisMonth;
  const left     = Math.max(0, monthlyLimit - used);
  const usedFrac = monthlyLimit > 0 ? Math.min(1, used / monthlyLimit) : 0;
  const limitReached = !canAnalyze || used >= monthlyLimit;

  // ── Handlers (unverändert) ────────────────────────────────────────────────────
  const handlePickVideo = useCallback(async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(t('common.error'), t('home.mediaPermission'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
          ]);
        } else {
          Alert.alert(t('common.error'), t('home.pickError'));
        }
        return;
      }
      await new Promise<void>((r) => setTimeout(r, 300));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const dur = getVideoDurationSeconds(asset.duration);
        if (dur && dur > MAX_VIDEO_DURATION_SECONDS) {
          Alert.alert(t('common.error'), t('home.maxDuration', { minutes: Math.ceil(dur / 60) }));
          return;
        }
        setSelectedVideo({ uri: asset.uri, duration: dur });
      }
    } catch {
      Alert.alert(t('common.error'), t('home.pickError'));
    }
  }, [t]);

  const handleRecordVideo = useCallback(async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(t('common.error'), t('home.cameraPermission'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
          ]);
        } else {
          Alert.alert(t('common.error'), t('home.recordError'));
        }
        return;
      }
      await new Promise<void>((r) => setTimeout(r, 300));
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'videos',
        allowsEditing: false,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
        quality: 0.5,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const dur = getVideoDurationSeconds(asset.duration);
        if (dur && dur > MAX_VIDEO_DURATION_SECONDS) {
          Alert.alert(t('common.error'), t('home.maxDuration', { minutes: Math.ceil(dur / 60) }));
          return;
        }
        setSelectedVideo({ uri: asset.uri, duration: dur });
      }
    } catch {
      Alert.alert(t('common.error'), t('home.recordError'));
    }
  }, [t]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedVideo) { Alert.alert(t('common.error'), t('home.noVideoSelected')); return; }
    if (limitReached) {
      // Pro-Nutzer haben schon Pro → kein "Pro freischalten" anbieten.
      if (isPro) {
        Alert.alert(t('pro.limitTitle'), t('pro.limitBodyPro', { limit: monthlyLimit }), [{ text: t('common.ok') }]);
      } else {
        Alert.alert(
          t('pro.limitTitle'),
          t('pro.limitBody', { limit: monthlyLimit }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('pro.unlockButton'), onPress: () => navigation.navigate('Paywall') },
          ],
        );
      }
      return;
    }
    const answers: OnboardingAnswers = user?.onboardingAnswers ?? {
      purpose: 'personal_improvement',
      experienceLevel: 'beginner',
      biggestChallenge: 'nervousness',
      focusArea: 'everything',
      feedbackStyle: 'balanced',
    };
    navigation.navigate('AnalysisLoading', { videoUri: selectedVideo.uri, answers });
  }, [selectedVideo, limitReached, isPro, monthlyLimit, navigation, t, user?.onboardingAnswers]);

  // ── Letzte Analyse: Veränderung zur vorherigen ─────────────────────────────
  const lastScore = lastReport ? score100(lastReport.averageScore) : null;
  const delta = lastReport && prevReport ? score100(lastReport.averageScore) - score100(prevReport.averageScore) : null;

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <AmbientBackground animated />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabSpace }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1 · Kopf */}
          <PrezenceLogo />

          {/* 2 · Begrüßung */}
          <View style={styles.hero}>
            <Text style={styles.label}>{greeting}</Text>
            <Text style={styles.title} accessibilityRole="header">{t('home.analyzeTitle')}</Text>
          </View>

          {/* 3 · Optionen bzw. gewähltes Video */}
          {selectedVideo ? (
            <Card style={styles.rowCard}>
              <VideoThumbnail uri={selectedVideo.uri} size={56} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t('home.videoReady')}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {selectedVideo.duration !== undefined
                    ? t('home.videoInfo', { duration: formatDuration(selectedVideo.duration) })
                    : t('home.readyToAnalyze')}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedVideo(null)}
                accessibilityRole="button"
                style={styles.removeHit}
                hitSlop={6}
              >
                <Text style={styles.removeTxt}>{t('common.remove')}</Text>
              </Pressable>
            </Card>
          ) : (
            <View style={styles.options}>
              <OptionCard
                icon="upload"
                label={t('home.uploadVideo')}
                sub={t('home.uploadVideoSub')}
                onPress={handlePickVideo}
                styles={styles}
                T={T}
              />
              <OptionCard
                icon="record"
                label={t('home.recordNow')}
                sub={t('home.recordNowSub')}
                onPress={handleRecordVideo}
                styles={styles}
                T={T}
              />
            </View>
          )}

          {/* 4 · Analysieren */}
          <View>
            <Button
              label={t('home.analyzeButton')}
              onPress={handleAnalyze}
              disabled={!selectedVideo}
              fullWidth
            />
            <Text style={styles.footnote}>{t('home.heroFootnote')}</Text>
          </View>

          {/* 5 · Letzte Analyse */}
          {lastReport && lastScore !== null && (
            <Card
              style={styles.rowCard}
              onPress={() => navigation.navigate('Report', { report: lastReport, saved: true })}
              accessibilityLabel={`${t('home.lastAnalysisLabel')}, ${lastScore}`}
            >
              <ScoreRing score={lastScore} size={60} />
              <View style={[styles.rowText, { gap: 3 }]}>
                <Text style={styles.label}>{t('home.lastAnalysisLabel')}</Text>
                <Text style={styles.rowTitle}>{formatRelative(t, lastReport.createdAt)}</Text>
                {delta !== null && (
                  <View style={styles.deltaRow}>
                    {delta > 0 && <TrendUpIcon color={T.accentText} />}
                    {delta < 0 && <TrendDownIcon color={T.textSecondary} />}
                    <Text style={[styles.delta, { color: delta > 0 ? T.accentText : T.textSecondary }]}>
                      {delta > 0
                        ? t('home.deltaUp', { count: delta })
                        : delta < 0
                          ? t('home.deltaDown', { count: Math.abs(delta) })
                          : t('home.deltaSame')}
                    </Text>
                  </View>
                )}
              </View>
              <ChevronRight color={T.textSecondary} />
            </Card>
          )}

          {/* 6 · Nutzung */}
          <Card radius={R.cardSm} style={[styles.usage, isPro && styles.usagePro]}>
            <View style={styles.usageText}>
              <Text style={[styles.usageLabel, isPro && { fontSize: 15 }]}>
                {t('home.usageLeft', { left, limit: monthlyLimit })}
              </Text>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${usedFrac * 100}%` }]} />
              </View>
            </View>
            {!isPro && (
              <Button
                label={t('home.getPro')}
                size="sm"
                onPress={() => navigation.navigate('Paywall')}
              />
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default HomeScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (T: ThemeColors) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.bg },
  safe:   { flex: 1 },
  scroll: { paddingHorizontal: SP.screen, paddingTop: SP.top, gap: 14 },

  hero:  { gap: 4 },
  label: { ...TY.label, color: T.textSecondary },
  title: { ...TY.pageTitle, color: T.text },

  options: { gap: 10 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowText:  { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { ...TY.rowTitle, color: T.text },
  rowSub:   { ...TY.caption, color: T.textSecondary },

  removeHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  removeTxt: { fontFamily: F.semiBold, fontSize: 14, color: T.accentText },

  footnote: { marginTop: 8, textAlign: 'center', fontFamily: F.regular, fontSize: 12.5, color: T.textSecondary },

  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  delta:    { fontFamily: F.semiBold, fontSize: 13, fontVariant: ['tabular-nums'] },

  usage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
    paddingRight: 8,
    paddingLeft: 16,
  },
  usagePro:   { paddingVertical: 16, paddingRight: 16 },
  usageText:  { flex: 1, gap: 7 },
  usageLabel: { fontFamily: F.medium, fontSize: 14, color: T.text, fontVariant: ['tabular-nums'] },
  bar:        { height: 4, borderRadius: 2, backgroundColor: T.track, overflow: 'hidden' },
  barFill:    { height: 4, borderRadius: 2, backgroundColor: T.accentData },
});
