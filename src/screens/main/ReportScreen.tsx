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


import { HomeStackParamList } from '../../types';
import { useAnalysis } from '../../hooks/useAnalysis';
import ScoreRing from '../../components/ScoreRing';
import CategoryCard from '../../components/CategoryCard';
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

type ReportRouteProp = RouteProp<HomeStackParamList, 'Report'>;
type ReportNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Report'>;

const ReportScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ReportNavigationProp>();
  const route = useRoute<ReportRouteProp>();

  const { report } = route.params;
  const { saveCurrentReport } = useAnalysis();

  const [isSaved, setIsSaved] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);

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
      await saveCurrentReport();
      setIsSaved(true);
      Alert.alert(t('common.ok'), t('report.saved'));
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setSavingLoading(false);
    }
  }, [saveCurrentReport, t]);

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
    <SafeAreaView style={styles.safeArea}>
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>{t('report.overallScore')}</Text>
          <ScoreRing score={report.averageScore} size={140} strokeWidth={12} animate />
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
            <Ionicons name="person-circle-outline" size={22} color={COLORS.primary} />
            <Text style={styles.summaryTitle}>{t('report.summary')}</Text>
          </View>
          <Text style={styles.summaryText}>{report.summary}</Text>
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
                <Text style={styles.exerciseText}>{exercise}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {!isSaved && (
            <Button
              label={t('report.saveReport')}
              onPress={handleSave}
              loading={savingLoading}
              fullWidth
              size="lg"
              style={{ marginBottom: 12 }}
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
    paddingVertical: 12,
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
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 48,
  },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  reportDate: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  exerciseBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(78,205,196,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
    marginTop: 2,
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
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  exerciseText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  actionsSection: {
    marginTop: 8,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  savedText: {
    fontSize: 15,
    color: COLORS.success,
    fontWeight: '600',
  },
});

export default ReportScreen;
