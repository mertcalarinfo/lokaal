import React, { useState, useCallback } from 'react';
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
import { Upload, Video, Infinity, BarChart2, CheckCircle2 } from 'lucide-react-native';

import { HomeStackParamList, OnboardingAnswers } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import Button from '../../components/Button';
import VideoThumbnail from '../../components/VideoThumbnail';
import PrezenceLogo from '../../components/PrezenceLogo';
import { C, F, R, S } from '../../theme';

type HomeNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const MAX_VIDEO_DURATION_SECONDS = 300;

function getVideoDurationSeconds(raw?: number | null): number | undefined {
  if (!raw || raw <= 0) return undefined;
  let seconds = raw / 1000;
  if (seconds > 6 * 3600) seconds = seconds / 1000;
  console.log('[Home] video duration raw:', raw, '→ seconds:', Math.round(seconds));
  return seconds;
}

const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const { user } = useAuth();
  const { subscription, canAnalyze, isSubscribed } = useSubscription(user?.uid || null);

  const [selectedVideo, setSelectedVideo] = useState<{ uri: string; duration?: number } | null>(null);

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
          <Infinity size={14} color={C.success} strokeWidth={1.7} />
          <Text style={[styles.usagePillText, { color: C.success }]} numberOfLines={1}>
            {t('home.usageUnlimited')}
          </Text>
        </View>
      );
    }
    const used = subscription.analysesThisMonth;
    const over = used >= 1;
    return (
      <View style={styles.usagePill}>
        <BarChart2 size={13} color={over ? C.error : C.textMuted} strokeWidth={1.7} />
        <Text style={[styles.usagePillText, { color: over ? C.error : C.textMuted }]} numberOfLines={1}>
          {t('home.usageFree', { used, total: 1 })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <PrezenceLogo size="sm" layout="horizontal" />
          {renderUsagePill()}
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{t('home.analyzeTitle')}</Text>
          <Text style={styles.heroBody}>{t('home.analyzeSubtitle')}</Text>
        </View>

        {/* Video area */}
        {selectedVideo ? (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <CheckCircle2 size={17} color={C.success} strokeWidth={1.7} />
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
          <View style={styles.uploadRow}>
            <TouchableOpacity style={styles.uploadCard} onPress={handlePickVideo} activeOpacity={0.8}>
              <View style={styles.uploadIconWrap}>
                <Upload size={26} color={C.text} strokeWidth={1.7} />
              </View>
              <Text style={styles.uploadTitle}>{t('home.uploadVideo')}</Text>
              <Text style={styles.uploadSub}>{t('home.uploadVideoSub')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadCard} onPress={handleRecordVideo} activeOpacity={0.8}>
              <View style={styles.uploadIconWrap}>
                <Video size={26} color={C.text} strokeWidth={1.7} />
              </View>
              <Text style={styles.uploadTitle}>{t('home.recordNow')}</Text>
              <Text style={styles.uploadSub}>{t('home.recordNowSub')}</Text>
            </TouchableOpacity>
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

        {/* CTA */}
        <View style={styles.cta}>
          <Button
            label={t('home.analyzeButton')}
            onPress={handleAnalyze}
            disabled={!selectedVideo || (!canAnalyze && !isSubscribed)}
            fullWidth
            size="lg"
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: S.screen,
    paddingBottom: S.s8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: S.s4,
  },
  usagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.pill,
    paddingHorizontal: S.s3,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.hairline,
    gap: 5,
  },
  usagePillText: {
    fontFamily: F.semiBold,
    fontSize: 11,
    fontWeight: '600',
  },
  hero: {
    borderRadius: R.xl,
    padding: S.s5,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.hairline,
    marginBottom: S.s5,
  },
  heroTitle: {
    fontFamily: F.xBold,
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    lineHeight: 32,
    letterSpacing: -0.98,
    marginBottom: S.s2,
  },
  heroBody: {
    fontFamily: F.regular,
    fontSize: 14.5,
    color: C.textMuted,
    lineHeight: 21,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: S.s3,
    marginBottom: S.s5,
  },
  uploadCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.s5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.hairline,
    minHeight: 136,
    justifyContent: 'center',
  },
  uploadIconWrap: {
    width: 48,
    height: 48,
    borderRadius: R.md,
    backgroundColor: C.surfaceAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.s3,
  },
  uploadTitle: {
    fontFamily: F.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 3,
    textAlign: 'center',
  },
  uploadSub: {
    fontFamily: F.regular,
    fontSize: 12,
    color: C.textFaint,
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.s4,
    marginBottom: S.s5,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.s3,
    gap: S.s2,
  },
  previewLabel: {
    fontFamily: F.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: C.success,
  },
  duration: {
    fontFamily: F.regular,
    fontSize: 12,
    color: C.textFaint,
    marginTop: S.s2,
    textAlign: 'center',
  },
  upgradeCard: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.s5,
    marginBottom: S.s5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.errorBg,
  },
  upgradeText: {
    fontFamily: F.regular,
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  cta: {
    marginTop: S.s2,
  },
});

export default HomeScreen;
