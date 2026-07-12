import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { CheckCircle2, Sparkles, Upload, Video as VideoIcon } from 'lucide-react-native';

import { HomeStackParamList, OnboardingAnswers, AnalysisReport } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { getUserReports } from '../../services/storage';
import PressableScale from '../../components/PressableScale';
import VideoThumbnail from '../../components/VideoThumbnail';
import PrezenceLogo from '../../components/PrezenceLogo';
import { RC, MONO, MONO_MED, RS, BTN_SHADOW, HL, RR } from '../../theme/register';

type HomeNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;
type UploadOption = 'upload' | 'record';

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
  if (days <= 0) return t('common.today');
  if (days === 1) return t('common.yesterday');
  return t('common.daysAgo', { count: days });
}

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

function OptionRow({
  icon, label, sub, selected, onPress,
}: {
  icon: 'upload' | 'record'; label: string; sub: string; selected: boolean; onPress: () => void;
}) {
  const Icon = icon === 'upload' ? Upload : VideoIcon;
  return (
    <PressableScale onPress={onPress}>
      <View style={S.optRow}>
        <View style={[S.optIconCircle, selected && S.optIconCircleSel]}>
          <Icon size={23} color={selected ? RC.accent : RC.text} strokeWidth={1.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[S.optLabel, selected && S.optLabelSel]}>{label}</Text>
          <Text style={S.optSub}>{sub}</Text>
        </View>
        <View style={[S.radio, selected && S.radioSel]}>
          {selected && <View style={S.radioDot} />}
        </View>
      </View>
    </PressableScale>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const HomeScreen: React.FC = () => {
  const { t }      = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const { user }   = useAuth();
  const { canAnalyze, monthlyLimit } = useSubscription(user?.uid || null);

  const [selectedVideo,  setSelectedVideo]  = useState<{ uri: string; duration?: number } | null>(null);
  const [selectedOption, setSelectedOption] = useState<UploadOption>('upload');
  const [lastReport,     setLastReport]     = useState<AnalysisReport | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user?.uid) return;
    getUserReports(user.uid).then((reports) => {
      if (reports.length > 0) setLastReport(reports[0]);
    }).catch(() => {});
  }, [user?.uid]));

  const greeting = getGreeting(t, (user?.displayName ?? '').split(' ')[0] ?? '');

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
    if (!canAnalyze) {
      Alert.alert(
        t('pro.limitTitle'),
        t('pro.limitBody', { limit: monthlyLimit }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('pro.unlockButton'), onPress: () => navigation.navigate('Paywall') },
        ],
      );
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
  }, [selectedVideo, canAnalyze, monthlyLimit, navigation, t, user?.onboardingAnswers]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  // ── JSX ────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* ── AKTENKOPF ── */}
        <View style={S.head}>
          <PrezenceLogo size="sm" />
        </View>

        <View style={{ height: 26 }} />

        {/* ── HERO ── */}
        <View style={S.hero}>
          <Text style={S.greeting}>{greeting}</Text>
          <View style={{ height: 8 }} />
          <Text style={S.heroTitle}>{t('home.analyzeTitle')}</Text>
          <View style={{ height: 14 }} />
          <Text style={S.heroSub}>{t('home.analyzeSubtitle')}</Text>
        </View>

        {/* ── UPLOAD-OPTIONEN / VIDEO-VORSCHAU (vertikal mittig zwischen Hero und Button) ── */}
        <View style={S.middle}>
        <View style={S.rows}>
          {selectedVideo ? (
            <>
              {/* "Video bereit"-Zeile */}
              <View style={S.readyRow}>
                <CheckCircle2 size={16} color={RC.accent} strokeWidth={2} />
                <Text style={S.readyLabel}>{t('home.videoReady')}</Text>
                <PressableScale onPress={() => setSelectedVideo(null)}>
                  <Text style={S.removeTxt}>{t('common.remove')}</Text>
                </PressableScale>
              </View>
              {/* Thumbnail — tippen zum Abspielen (Vollbild) */}
              <View style={S.thumbWrap}>
                <VideoThumbnail
                  uri={selectedVideo.uri}
                  duration={selectedVideo.duration}
                  size="lg"
                />
                {selectedVideo.duration !== undefined && (
                  <Text style={S.duration}>
                    {t('home.videoInfo', { duration: formatDuration(selectedVideo.duration) })}
                  </Text>
                )}
              </View>
            </>
          ) : (
            <>
              <OptionRow
                icon="upload"
                label={t('home.uploadVideo')}
                sub={t('home.uploadVideoSub')}
                selected={selectedOption === 'upload'}
                onPress={() => { setSelectedOption('upload'); handlePickVideo(); }}
              />
              <OptionRow
                icon="record"
                label={t('home.recordNow')}
                sub={t('home.recordNowSub')}
                selected={selectedOption === 'record'}
                onPress={() => { setSelectedOption('record'); handleRecordVideo(); }}
              />
            </>
          )}
        </View>
        </View>

        {/* ── PRIMARY-BUTTON ── */}
        <View style={S.cta}>
          <PressableScale onPress={handleAnalyze} style={{ alignSelf: 'stretch' }}>
            <View style={[S.btn, BTN_SHADOW]}>
              <View style={S.btnLeft}>
                <Sparkles size={18} color={RC.onAccent} strokeWidth={1.8} />
                <Text style={S.btnLabel}>{t('home.analyzeButton')}</Text>
              </View>
            </View>
          </PressableScale>
          <Text style={S.ctaFootnote}>{t('home.heroFootnote')}</Text>

          {lastReport && (
            <PressableScale
              onPress={() => navigation.navigate('Report', { report: lastReport, saved: true })}
              style={{ marginTop: 16, alignSelf: 'center' }}
            >
              <Text style={S.scoreHintText}>
                {t('home.lastAnalysisLabel')}: <Text style={S.scoreHintAccent}>{score100(lastReport.averageScore)}/100</Text> · {formatRelative(t, lastReport.createdAt)}
              </Text>
            </PressableScale>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: RC.bg },
  scroll: { flexGrow: 1, paddingBottom: 0 },

  // Aktenkopf
  head: {
    marginTop: RS.headTop,
    paddingHorizontal: RS.screenH,
    paddingBottom: RS.headPadB,
  },

  // Hero
  hero: {
    paddingHorizontal: RS.screenH,
  },
  greeting: {
    fontFamily: MONO_MED,
    fontSize: 13,
    letterSpacing: 0.5,
    color: RC.muted,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '600',
    letterSpacing: -1,
    color: RC.text,
    lineHeight: 40,
  },
  heroSub: {
    fontFamily: MONO,
    fontSize: 14,
    lineHeight: 21,
    color: RC.muted,
  },
  scoreHintText: {
    fontFamily: MONO,
    fontSize: 12.5,
    color: RC.faint,
    textAlign: 'center',
  },
  scoreHintAccent: {
    fontFamily: MONO_MED,
    color: RC.accent,
  },

  // Optionen / Video — vertikal mittig zwischen Hero und Button
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  rows: {
    paddingHorizontal: RS.screenH,
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 22,
    borderTopWidth: HL.std,
    borderTopColor: RC.line,
  },
  optIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: RC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optIconCircleSel: {
    borderColor: RC.accent,
    backgroundColor: RC.accentWash,
  },
  optLabel: {
    fontFamily: MONO_MED,
    fontSize: 16,
    color: RC.muted,
  },
  optLabelSel: {
    color: RC.text,
  },
  optSub: {
    fontFamily: MONO,
    fontSize: 13,
    color: RC.faint,
    marginTop: 4,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: RC.ghost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSel: {
    borderColor: RC.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RC.accent,
  },

  // Video bereit
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: RS.rowV,
    borderTopWidth: HL.std,
    borderTopColor: RC.line,
  },
  readyLabel: {
    fontFamily: MONO_MED,
    fontSize: 14,
    color: RC.accent,
    flex: 1,
  },
  removeTxt: {
    fontFamily: MONO,
    fontSize: 12,
    color: RC.ghost,
    textDecorationLine: 'underline',
  },
  thumbWrap: {
    paddingVertical: 12,
    borderTopWidth: HL.faint,
    borderTopColor: RC.lineFaint,
  },
  duration: {
    fontFamily: MONO,
    fontSize: 11,
    color: RC.ghost,
    textAlign: 'center',
    marginTop: 8,
  },

  // CTA
  cta: {
    paddingHorizontal: RS.screenH,
    paddingBottom: RS.btnBottom,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RC.accent,
    borderRadius: RR.button,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  btnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnLabel: {
    fontFamily: MONO_MED,
    fontSize: 16,
    color: RC.onAccent,
  },
  ctaFootnote: {
    fontFamily: MONO,
    fontSize: 12.5,
    color: RC.faint,
    textAlign: 'center',
    // extra clearance so the (now softer) button glow does not sit on the text
    marginTop: 20,
  },
});
