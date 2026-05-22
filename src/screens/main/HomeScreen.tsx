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
import { Ionicons } from '@expo/vector-icons';

import { HomeStackParamList, OnboardingAnswers } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import Button from '../../components/Button';
import VideoThumbnail from '../../components/VideoThumbnail';
import PrezenceLogo from '../../components/PrezenceLogo';

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

type HomeNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const MAX_VIDEO_DURATION_SECONDS = 600; // 10 minutes

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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('home.pickError'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
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
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('home.recordError'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
        quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedVideo({
          uri: asset.uri,
          duration: asset.duration ? asset.duration / 1000 : undefined,
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

    // Navigate to onboarding to gather context
    navigation.navigate('Onboarding');
  }, [selectedVideo, canAnalyze, navigation, t]);

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
          <Text style={[styles.usageText, { color: COLORS.success }]}>
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
  },
  settingsButton: {
    padding: 4,
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
  },
  usageText: {
    fontSize: 11,
    fontWeight: '600',
  },
  hero: {
    marginVertical: 24,
    borderRadius: 20,
    padding: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
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
    borderColor: COLORS.border,
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
  },
  uploadCardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
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
