import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

import { HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { saveReport } from '../../services/storage';
import ScoreRing from '../../components/ScoreRing';
import CategoryCard from '../../components/CategoryCard';
import Button from '../../components/Button';
import RichText from '../../components/RichText';

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

type ReportRouteProp = RouteProp<HomeStackParamList, 'Report'>;
type ReportNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Report'>;

const ReportScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ReportNavigationProp>();
  const route = useRoute<ReportRouteProp>();
  const { user } = useAuth();

  // `saved` is true when opened from the Progress tab (already in Firestore).
  const { report, saved } = route.params;

  const [isSaved, setIsSaved] = useState(!!saved);
  const [savingLoading, setSavingLoading] = useState(false);

  // Only render a player when we actually have a video URI to play.
  const hasVideo = !!report.videoUrl && report.videoUrl.length > 0;

  const formatDate = (date: Date | string): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSave = useCallback(async () => {
    setSavingLoading(true);
    try {
      // Save the report from route params directly — earlier this called a
      // fresh useAnalysis() instance whose `report` was always null, so nothing
      // was ever persisted. Persist the actual report, scoped to the user.
      await saveReport({ ...report, userId: user?.uid || report.userId });
      setIsSaved(true);
      Alert.alert(t('common.ok'), t('report.saved'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('common.error'));
    } finally {
      setSavingLoading(false);
    }
  }, [report, user?.uid, t]);

  const handleShare = useCallback(async () => {
    const dateStr = formatDate(report.createdAt);
    const shareText = t('report.shareText', {
      date: dateStr,
      score: report.averageScore,
      summary: report.summary,
    });

    try {
      await Share.share({ message: shareText });
    } catch (error) {
      // ignore
    }
  }, [report, t]);

  const handleNewAnalysis = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('report.title')}</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Video player — shown at the top whenever a video URL is available */}
        {hasVideo && (
          <View style={styles.videoCard}>
            <Video
              source={{ uri: report.videoUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
            />
          </View>
        )}

        {/* Overall score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>{t('report.overallScore')}</Text>
          <ScoreRing score={report.averageScore} size={112} strokeWidth={10} animate />
          <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
        </View>

        {/* Category scores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('report.categories')}</Text>
          {report.categories.map((category, index) => (
            <CategoryCard key={`${category.name}-${index}`} category={category} index={index} />
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="person-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.summaryTitle}>{t('report.summary')}</Text>
          </View>
          <RichText text={report.summary} style={styles.summaryText} />
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('report.exercises')}</Text>
          {report.exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseBadge}>
                <Text style={styles.exerciseBadgeText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseContent}>
                <Text style={styles.exerciseLabel}>
                  {t('report.exercise', { number: index + 1 })}
                </Text>
                <RichText text={exercise} style={styles.exerciseText} />
              </View>
            </View>
          ))}
        </View>

        {/* Actions — INSIDE the scroll content. contentContainer has flexGrow:1
            and this block has marginTop:'auto', so for a short report the buttons
            are pushed down to sit ~16px above the tab bar (no dead space), and for
            a long report they simply flow right after the exercises. This is what
            finally removes the empty gap in every case. */}
        <View style={styles.actionsSection}>
          {!isSaved && (
            <Button
              label={t('report.saveReport')}
              onPress={handleSave}
              loading={savingLoading}
              fullWidth
              size="lg"
              style={{ marginBottom: 10 }}
            />
          )}
          {isSaved && (
            <View style={styles.savedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.savedText}>{t('report.saved')}</Text>
            </View>
          )}
          <Button
            label={t('report.newAnalysis')}
            onPress={handleNewAnalysis}
            variant="outline"
            fullWidth
            size="lg"
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    fontFamily: 'DMSans_700Bold',
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    // Last element sits ~16px above the bottom tab bar.
    paddingBottom: 16,
    // Fill the viewport so a short report can push its actions to the bottom.
    flexGrow: 1,
  },
  videoCard: {
    backgroundColor: '#000',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  reportDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_700Bold',
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontFamily: 'DMSans_400Regular',
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  exerciseBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(78,205,196,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
    marginTop: 1,
  },
  exerciseBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success,
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  exerciseText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
  },
  actionsSection: {
    // Pushes the buttons to the bottom of the viewport when the report is short.
    marginTop: 'auto',
    paddingTop: 12,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 8,
  },
  savedText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
  },
});

export default ReportScreen;
