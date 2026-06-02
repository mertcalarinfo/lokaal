import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Upload, Video, Infinity, BarChart2, CheckCircle2, Check } from 'lucide-react-native';

import { HomeStackParamList, OnboardingAnswers } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/Button';
import VideoThumbnail from '../../components/VideoThumbnail';
import PrezenceLogo from '../../components/PrezenceLogo';
import { ThemeColors, F, R, S } from '../../theme';

type HomeNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;
type UploadOption = 'upload' | 'record';

const MAX_VIDEO_DURATION_SECONDS = 300;

function getVideoDurationSeconds(raw?: number | null): number | undefined {
  if (!raw || raw <= 0) return undefined;
  let seconds = raw / 1000;
  if (seconds > 6 * 3600) seconds = seconds / 1000;
  console.log('[Home] video duration raw:', raw, '→ seconds:', Math.round(seconds));
  return seconds;
}

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: S.screen,
    paddingBottom: S.s8,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: S.s4,
  },
  usagePill: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: T.surface,
    borderRadius:    R.pill,
    paddingHorizontal: S.s3,
    paddingVertical:   6,
    borderWidth:     1,
    borderColor:     T.hairline,
    gap:             5,
  },
  usagePillText: {
    fontFamily: F.semiBold,
    fontSize:   11,
    fontWeight: '600',
  },

  // ── Hero — frei, kein Surface-Container (§04) ──
  // Logo-Header → Hero: 40px (S.s10) per Spec
  hero: {
    borderTopWidth:  1,
    borderTopColor:  T.hairline,
    marginTop:       S.s10,    // 40px Abstand vom Header zur Hairline
    paddingTop:      S.s4,     // 16px Hairline → Eyebrow
    paddingBottom:   S.s6,     // 24px Body → Upload-Liste (Spec: ~26px)
    marginBottom:    0,
  },
  heroEyebrow: {
    fontFamily:    F.semiBold,
    fontSize:      10,
    fontWeight:    '600',
    color:         T.textMuted,
    letterSpacing: 3,          // .3em of 10px
    textTransform: 'uppercase',
    marginBottom:  S.s3,       // 12px Eyebrow → H1 (Spec)
  },
  heroTitle: {
    fontFamily:    F.xBold,
    fontSize:      38,
    fontWeight:    '800',
    color:         T.text,
    lineHeight:    38,         // 1.0
    letterSpacing: -1.33,
    marginBottom:  14,         // 14px H1 → Body (Spec)
  },
  heroBody: {
    fontFamily: F.regular,
    fontSize:   14.5,
    color:      T.textMuted,
    lineHeight: 22,
  },

  // ── Upload-Liste — gestapelte Hairline-Reihen (§04 + Don'ts) ──
  uploadList: {
    borderTopWidth:    1,
    borderTopColor:    T.hairline,
    borderBottomWidth: 1,
    borderBottomColor: T.hairline,
    marginBottom:      30,     // letzte Option → Button: 30px (Spec)
  },
  uploadRow: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 18,       // je 18px vertikales Padding (Spec)
    gap:             S.s4,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },

  // Icon-Kreis — nicht ausgewählt
  uploadIconCircle: {
    width:          46,
    height:         46,
    borderRadius:   R.pill,
    borderWidth:    1,
    borderColor:    T.hairline,
    alignItems:     'center',
    justifyContent: 'center',
  },
  // Icon-Kreis — ausgewählt: Accent-Outline + surfaceAccent Tint (§04 Auswahl-Liste)
  uploadIconCircleSel: {
    width:           46,
    height:          46,
    borderRadius:    R.pill,
    borderWidth:     1.5,
    borderColor:     T.accent,
    backgroundColor: T.surfaceAccent,
    alignItems:      'center',
    justifyContent:  'center',
  },

  uploadText:  { flex: 1 },
  uploadTitle: {
    fontFamily:   F.semiBold,
    fontSize:     15,
    fontWeight:   '600',
    color:        T.text,
    marginBottom: 2,
  },
  uploadSub: {
    fontFamily: F.regular,
    fontSize:   12,
    color:      T.textFaint,
  },

  // Radio nicht ausgewählt — leerer Outline-Kreis (§04)
  radioOutline: {
    width:        24,
    height:       24,
    borderRadius: R.pill,
    borderWidth:  1.5,
    borderColor:  T.hairline,
  },
  // Radio ausgewählt — gefüllter Sand-Kreis + dunkles Häkchen (§04 / §06 DO)
  radioFilled: {
    width:           24,
    height:          24,
    borderRadius:    R.pill,
    backgroundColor: T.accent,
    alignItems:      'center',
    justifyContent:  'center',
  },

  previewCard: {
    backgroundColor: T.surface,
    borderRadius:    R.lg,
    padding:         S.s4,
    marginBottom:    S.s5,
    borderWidth:     1,
    borderColor:     T.hairline,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  S.s3,
    gap:           S.s2,
  },
  previewLabel: {
    fontFamily: F.semiBold,
    fontSize:   14,
    fontWeight: '600',
    color:      T.success,
  },
  duration: {
    fontFamily: F.regular,
    fontSize:   12,
    color:      T.textFaint,
    marginTop:  S.s2,
    textAlign:  'center',
  },
  upgradeCard: {
    backgroundColor: T.surface,
    borderRadius:    R.md,
    padding:         S.s5,
    marginBottom:    S.s5,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     T.errorBg,
  },
  upgradeText: {
    fontFamily: F.regular,
    fontSize:   14,
    color:      T.textMuted,
    textAlign:  'center',
    lineHeight: 20,
  },

  // CTA + Subtext
  cta: {
    marginTop: 0,   // Abstand kommt von uploadList.marginBottom
  },
  // Subtext unter dem Button: „Eine Aufnahme. Ein ehrliches Urteil." (Spec Punkt 4)
  ctaSubtext: {
    fontFamily:  F.regular,
    fontSize:    11.5,
    color:       T.textFaint,
    textAlign:   'center',
    marginTop:   16,
  },
});

const HomeScreen: React.FC = () => {
  const { t }       = useTranslation();
  const navigation  = useNavigation<HomeNavigationProp>();
  const { user }    = useAuth();
  const { subscription, canAnalyze, isSubscribed } = useSubscription(user?.uid || null);
  const { T }       = useTheme();
  const styles      = useMemo(() => createStyles(T), [T]);

  const [selectedVideo, setSelectedVideo] = useState<{ uri: string; duration?: number } | null>(null);
  // Vorauswahl: „Video hochladen" ist per Default aktiv (§04 Spec)
  const [selectedOption, setSelectedOption] = useState<UploadOption>('upload');

  const handlePickVideo = useCallback(async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(t('common.error'), 'Media library access required. Enable it in Settings.', [
            { text: t('common.cancel'), style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
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
          Alert.alert(t('common.error'), 'Camera access required. Enable it in Settings.', [
            { text: t('common.cancel'), style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
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
    if (!canAnalyze) { navigation.navigate('Paywall'); return; }
    const answers: OnboardingAnswers = user?.onboardingAnswers ?? {
      purpose: 'personal_improvement',
      experienceLevel: 'beginner',
      biggestChallenge: 'nervousness',
      focusArea: 'everything',
      feedbackStyle: 'balanced',
    };
    navigation.navigate('AnalysisLoading', { videoUri: selectedVideo.uri, answers });
  }, [selectedVideo, canAnalyze, navigation, t, user?.onboardingAnswers]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const renderUsagePill = () => {
    if (isSubscribed) {
      return (
        <View style={styles.usagePill}>
          <Infinity size={14} color={T.success} strokeWidth={1.7} />
          <Text style={[styles.usagePillText, { color: T.success }]} numberOfLines={1}>
            {t('home.usageUnlimited')}
          </Text>
        </View>
      );
    }
    const used = subscription.analysesThisMonth;
    const over = used >= 1;
    return (
      <View style={styles.usagePill}>
        <BarChart2 size={13} color={over ? T.error : T.textMuted} strokeWidth={1.7} />
        <Text style={[styles.usagePillText, { color: over ? T.error : T.textMuted }]} numberOfLines={1}>
          {t('home.usageFree', { used, total: 1 })}
        </Text>
      </View>
    );
  };

  // Upload-Optionen mit Selektions-Zustand (§04 Auswahl-Liste)
  const OPTIONS: Array<{
    key:     UploadOption;
    onPress: () => void;
    Icon:    React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
    label:   string;
    sub:     string;
  }> = [
    {
      key:     'upload',
      onPress: handlePickVideo,
      Icon:    Upload,
      label:   t('home.uploadVideo'),
      sub:     t('home.uploadVideoSub'),
    },
    {
      key:     'record',
      onPress: handleRecordVideo,
      Icon:    Video,
      label:   t('home.recordNow'),
      sub:     t('home.recordNowSub'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <PrezenceLogo size="sm" layout="horizontal" />
          {renderUsagePill()}
        </View>

        {/* Hero — frei auf dem Screen, kein Container/Card (§04) */}
        <View style={styles.hero}>
          {/* Eyebrow: „Heutige Session" — 10/600, UPPER, ls .3em, --text-muted (§02/§04) */}
          <Text style={styles.heroEyebrow}>{t('home.analyzeEyebrow')}</Text>
          <Text style={styles.heroTitle}>{t('home.analyzeTitle')}</Text>
          <Text style={styles.heroBody}>{t('home.analyzeSubtitle')}</Text>
        </View>

        {/* Video area */}
        {selectedVideo ? (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <CheckCircle2 size={17} color={T.success} strokeWidth={1.7} />
              <Text style={styles.previewLabel}>{t('home.videoSelected')}</Text>
            </View>
            <VideoThumbnail
              uri={selectedVideo.uri}
              duration={selectedVideo.duration}
              size="lg"
              onRemove={() => setSelectedVideo(null)}
            />
            {selectedVideo.duration !== undefined && (
              <Text style={styles.duration}>
                {t('home.videoInfo', { duration: formatDuration(selectedVideo.duration) })}
              </Text>
            )}
          </View>
        ) : (
          /*
           * Gestapelte Hairline-Reihen (§04 + Don'ts).
           * Ausgewählte Option: Icon-Kreis mit Accent-Outline + Tint;
           * Häkchen rechts = GEFÜLLTER Accent-Kreis + --on-accent Check (§04 / §06 DO).
           * Nicht ausgewählt: leerer Outline-Kreis.
           */
          <View style={styles.uploadList}>
            {OPTIONS.map(({ key, onPress, Icon, label, sub }) => {
              const isSel = selectedOption === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.uploadRow}
                  onPress={() => { setSelectedOption(key); onPress(); }}
                  activeOpacity={0.8}
                >
                  {/* Icon-Kreis: Accent-Outline + Tint wenn selektiert */}
                  <View style={isSel ? styles.uploadIconCircleSel : styles.uploadIconCircle}>
                    <Icon
                      size={20}
                      color={isSel ? T.accent : T.textMuted}
                      strokeWidth={1.7}
                    />
                  </View>

                  <View style={styles.uploadText}>
                    <Text style={styles.uploadTitle}>{label}</Text>
                    <Text style={styles.uploadSub}>{sub}</Text>
                  </View>

                  {/* Häkchen: gefüllter Accent-Kreis mit --on-accent Check (selektiert)
                      oder leerer Outline-Kreis (nicht selektiert) */}
                  {isSel ? (
                    <View style={styles.radioFilled}>
                      <Check size={13} color={T.onAccent} strokeWidth={3} strokeLinecap="round" />
                    </View>
                  ) : (
                    <View style={styles.radioOutline} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Upgrade notice */}
        {!isSubscribed && subscription.analysesThisMonth >= 1 && (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeText}>{t('home.upgradePrompt')}</Text>
            <Button
              label={t('home.upgradeButton')}
              onPress={() => navigation.navigate('Paywall')}
              variant="danger"
              size="sm"
              style={{ marginTop: S.s3 }}
            />
          </View>
        )}

        {/* CTA — Button aktiv sobald Option gewählt (per Default sofort) */}
        <View style={styles.cta}>
          <Button
            label={t('home.analyzeButton')}
            onPress={handleAnalyze}
            fullWidth
            size="lg"
          />
          {/* Subtext unter dem Button (§ Punkt 4) */}
          <Text style={styles.ctaSubtext}>
            Eine Aufnahme. Ein ehrliches Urteil.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
