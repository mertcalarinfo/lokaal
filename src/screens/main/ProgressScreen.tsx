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
import { LinearGradient } from 'expo-linear-gradient';

import { AnalysisReport, HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getUserReports } from '../../services/storage';
import ScoreRing from '../../components/ScoreRing';
import Button from '../../components/Button';

const COLORS = {
  background: '#0A0A0F',
  surface: '#13131A',
  surfaceElevated: '#1C1C26',
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  accent: '#FF6B6B',
  success: '#4ECDC4',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8EA0',
  textMuted: '#4A4A5E',
  border: '#2A2A3A',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    if (!user?.uid) return;
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

  // Prepare chart data
  const chartLabels = reports
    .slice()
    .reverse()
    .slice(0, 8)
    .map((r) => formatDate(r.createdAt));

  const chartData = reports
    .slice()
    .reverse()
    .slice(0, 8)
    .map((r) => r.averageScore);

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
            <LinearGradient
              colors={['rgba(108,99,255,0.15)', 'rgba(108,99,255,0.03)']}
              style={styles.emptyIcon}
              borderRadius={40}
            >
              <Ionicons name="analytics-outline" size={40} color={COLORS.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>{t('progress.noData')}</Text>
            <Text style={styles.emptySubtitle}>{t('progress.noDataSub')}</Text>
            <Button
              label={t('progress.startButton')}
              onPress={() => {}}
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
                  width={SCREEN_WIDTH - 64}
                  height={180}
                  yAxisSuffix=""
                  yAxisInterval={2}
                  fromZero={false}
                  chartConfig={{
                    backgroundColor: COLORS.surface,
                    backgroundGradientFrom: COLORS.surface,
                    backgroundGradientTo: COLORS.surface,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
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
                  onPress={() => navigation.navigate('Report', { report })}
                  activeOpacity={0.8}
                >
                  <View style={styles.reportCardLeft}>
                    <ScoreRing score={report.averageScore} size={56} strokeWidth={6} animate={false} />
                  </View>
                  <View style={styles.reportCardContent}>
                    <Text style={styles.reportDate}>{formatFullDate(report.createdAt)}</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 16,
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
  },
  reportPurpose: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
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
