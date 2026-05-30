import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HomeStackParamList, OnboardingAnswers } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import Button from '../../components/Button';
import VideoThumbnail from '../../components/VideoThumbnail';
import PrezenceLogo from '../../components/PrezenceLogo';

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

type HomeNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const MAX_VIDEO_DURATION_SECONDS = 300; // 5 minutes — Gemini analysis cap

const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const { user } = useAuth();
  const { subscription, canAnalyze, isSubscribed } = useSubscription(user?.uid || null);

  const [selectedVideo, setSelectedVideo] = useState<{
    uri: string;
    duration?: number;
  } | null>(null);

  const handlePickVideo = useCallback(async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            t('common.error'),
            'Media library access is required. Please enable it in your device Settings.',
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert(t('common.error'), t('home.pickError'));
        }
        return;
      }

      // Android needs a short yield after resolving the permission dialog
      // before the media library is ready to open. Launching immediately
      // can crash because the system hasn't finished updating its permission
      // database and the picker receives a security exception.
      await new Promise<void>((resolve) => setTimeout(resolve, 300));

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const durationInSeconds = asset.duration ? asset.duration / 1000 : undefined;

        if (durationInSeconds && durationInSeconds > MAX_VIDEO_DURATION_SECONDS) {
          Alert.alert(t('common.error'), t('home.maxDuration'));
          return;
        }

        setSelectedVideo({
          uri: asset.uri,
          duration: durationInSeconds,
        });
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('home.pickError'));
    }
  }, [t]);

  const handleRecordVideo = useCallback(async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            t('common.error'),
            'Camera access is required. Please enable it in your device Settings.',
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert(t('common.error'), t('home.recordError'));
        }
        return;
      }

      // Same yield as in handlePickVideo — Android requires the permission
      // dialog to fully dismiss before the camera intent can be launched.
      await new Promise<void>((resolve) => setTimeout(resolve, 300));

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'videos',
        allowsEditing: false,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const durationInSeconds = asset.duration ? asset.duration / 1000 : undefined;

        // Recording is capped by videoMaxDuration, but guard defensively so an
        // over-length clip never reaches Gemini.
        if (durationInSeconds && durationInSeconds > MAX_VIDEO_DURATION_SECONDS) {
          Alert.alert(t('common.error'), t('home.maxDuration'));
          return;
        }

        setSelectedVideo({
          uri: asset.uri,
          duration: durationInSeconds,
        });
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('home.recordError'));
    }
  }, [t]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedVideo) {
      Alert.alert(t('common.error'), t('home.noVideoSelected'));
      return;
    }

    if (!canAnalyze) {
      navigation.navigate('Paywall');
      return;
    }

    // Onboarding is shown exactly once, right after registration (gated by
    // AppNavigator). It must NEVER appear before an analysis. Use the saved
    // goals; if they are missing (legacy accounts), fall back to sensible
    // defaults — the user can refine them in Settings → Edit Goals.
    const answers: OnboardingAnswers = user?.onboardingAnswers ?? {
      purpose: 'personal_improvement',
      experienceLevel: 'beginner',
      biggestChallenge: 'nervousness',
      focusArea: 'everything',
      feedbackStyle: 'balanced',
    };

    navigation.navigate('AnalysisLoading', {
      videoUri: selectedVideo.uri,
      answers,
    });
  }, [selectedVideo, canAnalyze, navigation, t, user?.onboardingAnswers, user?.language]);

  const handleUpgradePress = () => {
    navigation.navigate('Paywall');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderUsageIndicator = () => {
    if (isSubscribed) {
      return (
        <View style={styles.usageBadge}>
          <Ionicons name="infinite" size={14} color={COLORS.success} />
          <Text style={[styles.usageText, { color: COLORS.success }]} numberOfLines={1}>
            {t('home.usageUnlimited')}
          </Text>
        </View>
      );
    }

    const used = subscription.analysesThisMonth;
    const total = 1;

    return (
      <View style={styles.usageBadge}>
        <Ionicons
          name="analytics-outline"
          size={14}
          color={used >= total ? COLORS.accent : COLORS.textSecondary}
        />
        <Text
          style={[
            styles.usageText,
            { color: used >= total ? COLORS.accent : COLORS.textSecondary },
          ]}
          numberOfLines={1}
        >
          {t('home.usageFree', { used, total })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PrezenceLogo size="sm" layout="horizontal" />
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              // Settings is in a separate tab, handled by bottom nav
            }}
          >
            {renderUsageIndicator()}
          </TouchableOpacity>
        </View>

        {/* Hero section */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{t('home.analyzeTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('home.analyzeSubtitle')}</Text>
        </View>

        {/* Video selection area */}
        {selectedVideo ? (
          <View style={styles.videoPreviewCard}>
            <View style={styles.videoPreviewHeader}>
              <View style={styles.videoCheckmark}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.videoSelectedText}>{t('home.videoSelected')}</Text>
            </View>

            <VideoThumbnail
              uri={selectedVideo.uri}
              duration={selectedVideo.duration}
              size="lg"
              onRemove={() => setSelectedVideo(null)}
            />

            {selectedVideo.duration !== undefined && (
              <Text style={styles.videoDuration}>
                {t('home.videoInfo', {
                  duration: formatDuration(selectedVideo.duration),
                })}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.uploadArea}>
            <View style={styles.uploadOptions}>
              <TouchableOpacity
                style={styles.uploadCard}
                onPress={handlePickVideo}
                activeOpacity={0.8}
              >
                <View style={styles.uploadIconContainer}>
                  <Ionicons name="cloud-upload-outline" size={30} color={COLORS.primary} />
                </View>
                <Text style={styles.uploadCardTitle}>{t('home.uploadVideo')}</Text>
                <Text style={styles.uploadCardSub}>{t('home.uploadVideoSub')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadCard}
                onPress={handleRecordVideo}
                activeOpacity={0.8}
              >
                <View style={[styles.uploadIconContainer, { backgroundColor: 'rgba(78,205,196,0.12)' }]}>
                  <Ionicons name="videocam-outline" size={30} color={COLORS.success} />
                </View>
                <Text style={styles.uploadCardTitle}>{t('home.recordNow')}</Text>
                <Text style={styles.uploadCardSub}>{t('home.recordNowSub')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Paywall notice if limit reached */}
        {!isSubscribed && subscription.analysesThisMonth >= 1 && (
          <View style={styles.upgradeCard}>
            <Ionicons name="star" size={20} color={COLORS.accent} style={{ marginBottom: 8 }} />
            <Text style={styles.upgradeTitle}>{t('home.upgradePrompt')}</Text>
            <Button
              label={t('home.upgradeButton')}
              onPress={handleUpgradePress}
              variant="danger"
              size="sm"
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {/* Analyze button */}
        <View style={styles.analyzeSection}>
          <Button
            label={t('home.analyzeButton')}
            onPress={handleAnalyze}
            disabled={!selectedVideo || (!canAnalyze && !isSubscribed)}
            fullWidth
            size="lg"
            style={styles.analyzeButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsButton: {
    padding: 4,
    flexShrink: 0,
  },
  usageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 5,
    flexShrink: 0,
  },
  usageText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  hero: {
    marginVertical: 18,
    borderRadius: 18,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    lineHeight: 30,
    fontFamily: 'DMSans_700Bold',
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
  },
  uploadArea: {
    marginBottom: 20,
  },
  uploadOptions: {
    flexDirection: 'row',
    gap: 14,
  },
  uploadCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    overflow: 'hidden',
    minHeight: 140,
    justifyContent: 'center',
  },
  uploadIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(59,127,232,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
  },
  uploadCardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
  },
  videoPreviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  videoPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  videoCheckmark: {},
  videoSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  videoDuration: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  upgradeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
    overflow: 'hidden',
  },
  upgradeTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  analyzeSection: {
    marginTop: 8,
  },
  analyzeButton: {
    borderRadius: 16,
  },
});

export default HomeScreen;
