import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Share2, UserCircle, CheckCircle2 } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';

import { HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { saveReport } from '../../services/storage';
import CategoryCard from '../../components/CategoryCard';
import Button from '../../components/Button';
import RichText from '../../components/RichText';
import { C, F, R, S } from '../../theme';

type ReportRoute = RouteProp<HomeStackParamList, 'Report'>;
type ReportNav   = NativeStackNavigationProp<HomeStackParamList, 'Report'>;

const ReportScreen: React.FC = () => {
  const { t }        = useTranslation();
  const navigation   = useNavigation<ReportNav>();
  const route        = useRoute<ReportRoute>();
  const { user }     = useAuth();
  const { report, saved } = route.params;

  const [isSaved,       setIsSaved]       = useState(!!saved);
  const [savingLoading, setSavingLoading] = useState(false);

  const hasVideo = !!report.videoUrl && report.videoUrl.length > 0;

  // Verdict-Zeile — abhängig vom Score (§05b-Tabelle)
  const getVerdict = (score: number): string => {
    if (score >= 9.0) return t('report.verdict.excellent');
    if (score >= 7.0) return t('report.verdict.great');
    if (score >= 5.0) return t('report.verdict.good');
    if (score >= 3.0) return t('report.verdict.solid');
    return t('report.verdict.developing');
  };

  const formatDate = (d: Date | string) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleSave = useCallback(async () => {
    setSavingLoading(true);
    try {
      await saveReport({ ...report, userId: user?.uid || report.userId });
      setIsSaved(true);
      Alert.alert(t('common.ok'), t('report.saved'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('common.error'));
    } finally {
      setSavingLoading(false);
    }
  }, [report, user?.uid, t]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: t('report.shareText', {
          date: formatDate(report.createdAt),
          score: report.averageScore,
          summary: report.summary,
        }),
      });
    } catch { /* ignore */ }
  }, [report, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={20} color={C.text} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('report.title')}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Share2 size={18} color={C.textMuted} strokeWidth={1.7} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Video player */}
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

        {/* Gesamtscore — frei auf dem Screen, kein Container (§04) */}
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreEyebrow}>{t('report.overallScore')}</Text>
          <Text style={styles.scoreNum}>
            {report.averageScore.toFixed(1)}
            <Text style={styles.scoreNumSub}>/10</Text>
          </Text>
          {/* Verdict-Zeile — Pflicht zwischen Score und Datum (§05b) */}
          <Text style={styles.scoreVerdict}>{getVerdict(report.averageScore)}</Text>
          <Text style={styles.scoreDate}>{formatDate(report.createdAt)}</Text>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('report.categories')}</Text>
          <View style={styles.categoriesContainer}>
            {report.categories.map((cat, i) => (
              <CategoryCard key={`${cat.name}-${i}`} category={cat} index={i} />
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <UserCircle size={20} color={C.textMuted} strokeWidth={1.7} />
            <Text style={styles.summaryTitle}>{t('report.summary')}</Text>
          </View>
          <RichText text={report.summary} style={styles.summaryText} />
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('report.exercises')}</Text>
          {report.exercises.map((ex, i) => (
            <View key={i} style={styles.exerciseCard}>
              <View style={styles.exBadge}>
                <Text style={styles.exBadgeNum}>{i + 1}</Text>
              </View>
              <View style={styles.exContent}>
                <Text style={styles.exLabel}>{t('report.exercise', { number: i + 1 })}</Text>
                <RichText text={ex} style={styles.exText} />
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {!isSaved && (
            <Button
              label={t('report.saveReport')}
              onPress={handleSave}
              loading={savingLoading}
              fullWidth
              size="lg"
              style={{ marginBottom: S.s3 }}
            />
          )}
          {isSaved && (
            <View style={styles.savedRow}>
              <CheckCircle2 size={17} color={C.success} strokeWidth={1.7} />
              <Text style={styles.savedText}>{t('report.saved')}</Text>
            </View>
          )}
          <Button
            label={t('report.newAnalysis')}
            onPress={() => navigation.navigate('Home')}
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
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.s5,
    paddingVertical:   S.s3,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily:    F.semiBold,
    fontSize:      16,
    fontWeight:    '600',
    color:         C.text,
    letterSpacing: 0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: S.screen,
    paddingTop:   S.s5,
    paddingBottom: S.s4,
    flexGrow: 1,
  },
  videoCard: {
    backgroundColor: '#000',
    borderRadius:    R.md,
    overflow:        'hidden',
    marginBottom:    S.s4,
    borderWidth:     1,
    borderColor:     C.hairline,
  },
  video: {
    width:       '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  // ── Gesamtscore — frei, kein Surface-Container (§04) ──
  scoreBlock: {
    alignItems:      'center',
    paddingVertical: S.s8,
    borderTopWidth:  1,
    borderTopColor:  C.hairline,
    marginBottom:    S.s2,
  },
  scoreEyebrow: {
    fontFamily:    F.semiBold,
    fontSize:      10,
    fontWeight:    '600',
    color:         C.textMuted,
    letterSpacing: 3.4,
    textTransform: 'uppercase',
    marginBottom:  S.s3,
  },
  scoreNum: {
    fontFamily:    F.xBold,
    fontSize:      96,
    fontWeight:    '800',
    color:         C.accent,
    lineHeight:    83,
    letterSpacing: -3.84,
  },
  scoreNumSub: {
    fontFamily: F.regular,
    fontSize:   24,
    fontWeight: '300',
    color:      C.textMuted,
  },
  scoreVerdict: {
    fontFamily:  F.semiBold,
    fontSize:    14,
    fontWeight:  '600',
    color:       C.text,
    marginTop:   S.s3,
    textAlign:   'center',
  },
  scoreDate: {
    fontFamily: F.regular,
    fontSize:   11.5,
    color:      C.textFaint,
    marginTop:  S.s2,
  },
  // ── Categories ──
  section: {
    marginBottom: S.s5,
  },
  sectionLabel: {
    fontFamily:    F.semiBold,
    fontSize:      10,
    fontWeight:    '600',
    color:         C.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom:  S.s3,
  },
  categoriesContainer: {
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  // ── Summary ──
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius:    R.lg,
    padding:         S.s4,
    marginBottom:    S.s5,
    borderWidth:     1,
    borderColor:     C.hairline,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  S.s3,
    gap:           S.s2,
  },
  summaryTitle: {
    fontFamily: F.bold,
    fontSize:   15,
    fontWeight: '700',
    color:      C.text,
  },
  summaryText: {
    fontFamily: F.regular,
    fontSize:   14.5,
    color:      C.textMuted,
    lineHeight: 22,
  },
  // ── Exercises ──
  exerciseCard: {
    flexDirection:   'row',
    backgroundColor: C.surface,
    borderRadius:    R.md,
    padding:         S.s4,
    marginBottom:    S.s2,
    borderWidth:     1,
    borderColor:     C.hairline,
    alignItems:      'flex-start',
  },
  exBadge: {
    width:           26,
    height:          26,
    borderRadius:    R.xs,
    backgroundColor: C.surfaceAccent,
    alignItems:      'center',
    justifyContent:  'center',
    marginRight:     S.s3,
    flexShrink:      0,
    marginTop:       1,
  },
  exBadgeNum: {
    fontFamily: F.bold,
    fontSize:   13,
    fontWeight: '700',
    color:      C.accent,
  },
  exContent: { flex: 1 },
  exLabel: {
    fontFamily:    F.semiBold,
    fontSize:      10,
    fontWeight:    '600',
    color:         C.textFaint,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom:  5,
  },
  exText: {
    fontFamily: F.regular,
    fontSize:   14,
    color:      C.textMuted,
    lineHeight: 20,
  },
  // ── Actions ──
  actions: {
    marginTop: 'auto',
    paddingTop: S.s3,
  },
  savedRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   S.s3,
    gap:            S.s2,
  },
  savedText: {
    fontFamily: F.semiBold,
    fontSize:   14,
    fontWeight: '600',
    color:      C.success,
  },
});

export default ReportScreen;
