import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';


import { AnalysisReport, HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getUserReports } from '../../services/storage';
import ScoreRing from '../../components/ScoreRing';
import Button from '../../components/Button';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ProgressScreen is a tab-level screen; cast to any so we can navigate to
// sibling tabs without fighting the HomeStack type param.
type ProgressNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const ProgressScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<ProgressNavigationProp>();
  const { user } = useAuth();

  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showCompare, setShowCompare] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const fetchReports = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    try {
      const data = await getUserReports(user.uid);
      setReports(data);
    } catch (error) {
      console.warn('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const formatDate = (date: Date | string): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (date: Date | string): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Date + time, shown on each saved-report card.
  const formatDateTime = (date: Date | string): string => {
    const d = date instanceof Date ? date : new Date(date);
    const datePart = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} · ${timePart}`;
  };

  // Chart data: only the last 3 months, oldest → newest, capped at 10 points.
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const chartReports = reports
    .filter((r) => new Date(r.createdAt) >= threeMonthsAgo)
    .slice()
    .reverse()
    .slice(-10);

  const chartLabels = chartReports.map((r) => formatDate(r.createdAt));
  const chartData = chartReports.map((r) => r.averageScore);
  const hasChartData = chartData.length >= 2;

  const getPurposeLabel = (purpose: string): string => {
    return t(`progress.purposes.${purpose}`, { defaultValue: purpose });
  };

  // Compare modal helpers
  const compareReports = selectedForCompare
    .map((id) => reports.find((r) => r.id === id))
    .filter(Boolean) as AnalysisReport[];

  const toggleCompareSelect = (id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const renderCompareTable = () => {
    if (compareReports.length < 2) return null;
    const [a, b] = compareReports;
    const categoryNames = a.categories.map((c) => c.name);

    return (
      <ScrollView style={styles.compareTable} showsVerticalScrollIndicator={false}>
        <View style={styles.compareHeader}>
          <View style={styles.compareHeaderCell} />
          <View style={styles.compareHeaderCell}>
            <Text style={styles.compareHeaderText}>{formatFullDate(a.createdAt)}</Text>
            <Text style={styles.compareScoreText}>{a.averageScore}/10</Text>
          </View>
          <View style={styles.compareHeaderCell}>
            <Text style={styles.compareHeaderText}>{formatFullDate(b.createdAt)}</Text>
            <Text style={styles.compareScoreText}>{b.averageScore}/10</Text>
          </View>
        </View>

        {categoryNames.map((name, i) => {
          const scoreA = a.categories[i]?.score ?? 0;
          const scoreB = b.categories[i]?.score ?? 0;
          const diff = scoreB - scoreA;
          return (
            <View key={name} style={[styles.compareRow, i % 2 === 0 && styles.compareRowAlt]}>
              <View style={styles.compareCell}>
                <Text style={styles.compareCellLabel} numberOfLines={2}>
                  {t(`report.categoryNames.${name}`, { defaultValue: name })}
                </Text>
              </View>
              <View style={styles.compareCell}>
                <Text style={styles.compareCellScore}>{scoreA}/10</Text>
              </View>
              <View style={styles.compareCell}>
                <Text style={styles.compareCellScore}>{scoreB}/10</Text>
                {diff !== 0 && (
                  <Text
                    style={[
                      styles.compareDiff,
                      { color: diff > 0 ? COLORS.success : COLORS.accent },
                    ]}
                  >
                    {diff > 0 ? `+${diff}` : `${diff}`}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('progress.title')}</Text>
          {reports.length >= 2 && (
            <TouchableOpacity
              style={styles.compareButton}
              onPress={() => {
                setSelectedForCompare([]);
                setShowCompare(true);
              }}
            >
              <Ionicons name="git-compare-outline" size={18} color={COLORS.primary} />
              <Text style={styles.compareButtonText}>{t('progress.compareButton')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {reports.length === 0 ? (
          // Empty state
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="analytics-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t('progress.noData')}</Text>
            <Text style={styles.emptySubtitle}>{t('progress.noDataSub')}</Text>
            <Button
              label={t('progress.startButton')}
              onPress={() => (navigation as any).navigate('HomeTab')}
              style={{ marginTop: 24 }}
            />
          </View>
        ) : (
          <>
            {/* Chart */}
            {hasChartData && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>{t('progress.chartTitle')}</Text>
                <LineChart
                  data={{
                    labels: chartLabels,
                    datasets: [
                      {
                        data: chartData,
                        color: () => COLORS.primary,
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={SCREEN_WIDTH - 56}
                  height={170}
                  yAxisSuffix=""
                  segments={5}
                  fromZero
                  formatYLabel={(y) => String(Math.round(Number(y)))}
                  chartConfig={{
                    backgroundColor: COLORS.surface,
                    backgroundGradientFrom: '#0d1b2e',
                    backgroundGradientTo: '#0d1b2e',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(59, 127, 232, ${opacity})`,
                    labelColor: () => COLORS.textMuted,
                    style: { borderRadius: 16 },
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: COLORS.primaryLight,
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '',
                      stroke: COLORS.border,
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}

            {/* Reports list */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {reports.length} {reports.length === 1 ? 'Analysis' : 'Analyses'}
              </Text>
              {reports.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={styles.reportCard}
                  onPress={() => navigation.navigate('Report', { report, saved: true })}
                  activeOpacity={0.8}
                >
                  <View style={styles.reportCardLeft}>
                    <ScoreRing score={report.averageScore} size={52} strokeWidth={6} animate={false} />
                  </View>
                  <View style={styles.reportCardContent}>
                    <Text style={styles.reportDate}>{formatDateTime(report.createdAt)}</Text>
                    <Text style={styles.reportPurpose}>
                      {t('progress.analysisItem.purpose', {
                        purpose: getPurposeLabel(report.onboardingAnswers.purpose),
                      })}
                    </Text>
                    {/* Mini category scores */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.categoryScores}
                    >
                      {report.categories.slice(0, 5).map((cat) => (
                        <View key={cat.name} style={styles.miniScore}>
                          <Text style={styles.miniScoreValue}>{cat.score}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Compare Modal */}
      <Modal
        visible={showCompare}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompare(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('progress.compareTitle')}</Text>
            <TouchableOpacity onPress={() => setShowCompare(false)}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {selectedForCompare.length < 2 ? (
            <>
              <Text style={styles.selectHint}>{t('progress.selectTwo')}</Text>
              <FlatList
                data={reports}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedForCompare.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.compareListItem, isSelected && styles.compareListItemSelected]}
                      onPress={() => toggleCompareSelect(item.id)}
                    >
                      <ScoreRing
                        score={item.averageScore}
                        size={44}
                        strokeWidth={5}
                        animate={false}
                      />
                      <View style={styles.compareListItemContent}>
                        <Text style={styles.compareListDate}>{formatFullDate(item.createdAt)}</Text>
                        <Text style={styles.compareListPurpose}>
                          {getPurposeLabel(item.onboardingAnswers.purpose)}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={styles.compareList}
              />
            </>
          ) : (
            renderCompareTable()
          )}

          <View style={styles.modalFooter}>
            {selectedForCompare.length >= 2 && (
              <Button
                label={t('progress.compareClose')}
                onPress={() => setSelectedForCompare([])}
                variant="outline"
                fullWidth
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'DMSans_700Bold',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compareButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59,127,232,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59,127,232,0.2)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    fontFamily: 'DMSans_400Regular',
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportCardLeft: {
    marginRight: 14,
  },
  reportCardContent: {
    flex: 1,
  },
  reportDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 3,
    fontFamily: 'DMSans_700Bold',
  },
  reportPurpose: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
  },
  categoryScores: {
    flexDirection: 'row',
  },
  miniScore: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  miniScoreValue: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  selectHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  compareList: {
    flex: 1,
  },
  compareListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  compareListItemSelected: {
    borderColor: COLORS.primary,
  },
  compareListItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  compareListDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  compareListPurpose: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  compareTable: {
    flex: 1,
  },
  compareHeader: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  compareHeaderCell: {
    flex: 1,
    alignItems: 'center',
  },
  compareHeaderText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  compareScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  compareRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
  },
  compareRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
  },
  compareCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  compareCellLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  compareCellScore: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  compareDiff: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  modalFooter: {
    paddingVertical: 20,
  },
});

export default ProgressScreen;
