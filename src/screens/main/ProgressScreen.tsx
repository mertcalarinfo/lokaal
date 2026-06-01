import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, RefreshControl,
  Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, GitCompare, X, ChevronRight, CheckCircle2,
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';

import { AnalysisReport, HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { getUserReports } from '../../services/storage';
import ScoreRing from '../../components/ScoreRing';
import Button from '../../components/Button';
import { ThemeColors, F, R, S } from '../../theme';

type ProgressNav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;
const { width: SW } = Dimensions.get('window');

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:        { flex: 1, backgroundColor: T.bg },
  loadingBox:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: F.regular, fontSize: 15, color: T.textFaint },
  scroll:      { flexGrow: 1, paddingHorizontal: S.screen, paddingTop: S.s4, paddingBottom: S.s6 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.s5 },
  headerTitle: { fontFamily: F.xBold, fontSize: 34, fontWeight: '800', color: T.text, letterSpacing: -1.02 },
  compareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.surface, borderRadius: R.pill,
    paddingHorizontal: S.s3, paddingVertical: 7,
    borderWidth: 1, borderColor: T.hairline,
  },
  compareBtnText: { fontFamily: F.semiBold, fontSize: 12, color: T.textMuted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center',
    marginBottom: S.s5, borderWidth: 1, borderColor: T.hairline,
  },
  emptyTitle: { fontFamily: F.bold, fontSize: 20, fontWeight: '700', color: T.text, marginBottom: S.s2, textAlign: 'center' },
  emptySub:   { fontFamily: F.regular, fontSize: 14.5, color: T.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: S.s5 },
  chartCard: {
    backgroundColor: T.surface, borderRadius: R.lg,
    padding: S.s4, marginBottom: S.s5,
    borderWidth: 1, borderColor: T.hairline,
  },
  chartLabel:  { fontFamily: F.semiBold, fontSize: 10, fontWeight: '600', color: T.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: S.s3 },
  listSection: { marginBottom: S.s4 },
  listLabel:   { fontFamily: F.monoMd, fontSize: 11, color: T.textFaint, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: S.s3 },
  reportCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: R.md,
    padding: S.s4, marginBottom: S.s2,
    borderWidth: 1, borderColor: T.line,
    gap: S.s4,
  },
  cardContent: { flex: 1 },
  cardDate:    { fontFamily: F.semiBold, fontSize: 14, fontWeight: '600', color: T.text, marginBottom: 2 },
  cardPurpose: { fontFamily: F.regular,  fontSize: 12, color: T.textFaint, marginBottom: 8 },
  miniChip: {
    width: 26, height: 26, borderRadius: R.xs,
    backgroundColor: T.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 5,
    borderWidth: 1, borderColor: T.line,
  },
  miniChipVal: { fontFamily: F.monoMd, fontSize: 11, color: T.textMuted },
  modal:       { flex: 1, backgroundColor: T.bg, paddingHorizontal: S.screen, paddingTop: S.s6 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.s5 },
  modalTitle:  { fontFamily: F.bold, fontSize: 20, fontWeight: '700', color: T.text },
  selectHint:  { fontFamily: F.regular, fontSize: 14, color: T.textMuted, marginBottom: S.s4 },
  compareListItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: R.md,
    padding: S.s4, marginBottom: S.s2,
    borderWidth: 1.5, borderColor: T.hairline, gap: S.s3,
  },
  compareListItemSel:  { borderColor: T.accent },
  compareListContent:  { flex: 1 },
  compareListDate:     { fontFamily: F.semiBold, fontSize: 14, fontWeight: '600', color: T.text, marginBottom: 2 },
  compareListPurpose:  { fontFamily: F.regular,  fontSize: 12, color: T.textFaint },
  compareHead:         { flexDirection: 'row', marginBottom: 4, paddingBottom: S.s3, borderBottomWidth: 1, borderBottomColor: T.line },
  compareHeadCell:     { flex: 1, alignItems: 'center' },
  compareHeadDate:     { fontFamily: F.regular,  fontSize: 12, color: T.textMuted, marginBottom: 3, textAlign: 'center' },
  compareHeadScore:    { fontFamily: F.bold,     fontSize: 16, fontWeight: '700', color: T.accent },
  compareRow:          { flexDirection: 'row', paddingVertical: 10, alignItems: 'center', borderRadius: R.xs },
  compareCell:         { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  compareCellLabel:    { fontFamily: F.regular, fontSize: 12, color: T.textMuted, textAlign: 'center', lineHeight: 16 },
  compareCellScore:    { fontFamily: F.semiBold, fontSize: 14, fontWeight: '600', color: T.text },
  compareDiff:         { fontFamily: F.bold, fontSize: 11, fontWeight: '700', marginTop: 2 },
  modalFooter:         { paddingVertical: S.s5 },
});

const ProgressScreen: React.FC = () => {
  const { t }      = useTranslation();
  const navigation = useNavigation<ProgressNav>();
  const { user }   = useAuth();
  const { T }      = useTheme();
  const styles     = useMemo(() => createStyles(T), [T]);

  const [reports,            setReports]            = useState<AnalysisReport[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [refreshing,         setRefreshing]         = useState(false);
  const [showCompare,        setShowCompare]        = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const fetchReports = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return; }
    try {
      const data = await getUserReports(user.uid);
      setReports(data);
    } catch (err) {
      console.warn('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useFocusEffect(useCallback(() => { fetchReports(); }, [fetchReports]));

  const fmtShort    = (d: Date | string) => { const date = d instanceof Date ? d : new Date(d); return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
  const fmtFull     = (d: Date | string) => { const date = d instanceof Date ? d : new Date(d); return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); };
  const fmtDateTime = (d: Date | string) => { const date = d instanceof Date ? d : new Date(d); return `${fmtFull(d)} · ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`; };

  // Chart — last 3 months, max 10 points
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const chartReports = reports.filter((r) => new Date(r.createdAt) >= threeMonthsAgo).slice().reverse().slice(-10);
  const rawLabels    = chartReports.map((r) => fmtShort(r.createdAt));
  const rawData      = chartReports.map((r) => r.averageScore);
  const chartLabels  = rawData.length === 1 ? [rawLabels[0], rawLabels[0]] : rawLabels;
  const chartData    = rawData.length === 1 ? [rawData[0], rawData[0]] : rawData;
  const hasChart     = rawData.length >= 1;

  const getPurposeLabel = (p: string) => t(`progress.purposes.${p}`, { defaultValue: p });

  const compareReports = selectedForCompare.map((id) => reports.find((r) => r.id === id)).filter(Boolean) as AnalysisReport[];
  const toggleCompare  = (id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2)  return [prev[1], id];
      return [...prev, id];
    });
  };

  const renderCompareTable = () => {
    if (compareReports.length < 2) return null;
    const [a, b] = compareReports;
    return (
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.compareHead}>
          <View style={{ flex: 1 }} />
          {[a, b].map((r) => (
            <View key={r.id} style={styles.compareHeadCell}>
              <Text style={styles.compareHeadDate}>{fmtFull(r.createdAt)}</Text>
              <Text style={styles.compareHeadScore}>{r.averageScore}/10</Text>
            </View>
          ))}
        </View>
        {a.categories.map((cat, i) => {
          const sA = a.categories[i]?.score ?? 0;
          const sB = b.categories[i]?.score ?? 0;
          const d  = sB - sA;
          return (
            <View key={cat.name} style={[styles.compareRow, i % 2 === 0 && { backgroundColor: T.surfaceAlt }]}>
              <View style={styles.compareCell}>
                <Text style={styles.compareCellLabel} numberOfLines={2}>
                  {t(`report.categoryNames.${cat.name}`, { defaultValue: cat.name })}
                </Text>
              </View>
              <View style={styles.compareCell}><Text style={styles.compareCellScore}>{sA}/10</Text></View>
              <View style={styles.compareCell}>
                <Text style={styles.compareCellScore}>{sB}/10</Text>
                {d !== 0 && (
                  <Text style={[styles.compareDiff, { color: d > 0 ? T.success : T.error }]}>
                    {d > 0 ? `+${d}` : `${d}`}
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
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchReports(); }}
            tintColor={T.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('progress.title')}</Text>
          {reports.length >= 2 && (
            <TouchableOpacity
              style={styles.compareBtn}
              onPress={() => { setSelectedForCompare([]); setShowCompare(true); }}
            >
              <GitCompare size={16} color={T.textMuted} strokeWidth={1.7} />
              <Text style={styles.compareBtnText}>{t('progress.compareButton')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {reports.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <TrendingUp size={36} color={T.textFaint} strokeWidth={1.7} />
            </View>
            <Text style={styles.emptyTitle}>{t('progress.noData')}</Text>
            <Text style={styles.emptySub}>{t('progress.noDataSub')}</Text>
            <Button
              label={t('progress.startButton')}
              onPress={() => (navigation as any).navigate('HomeTab')}
              style={{ marginTop: S.s6 }}
            />
          </View>
        ) : (
          <>
            {/* Chart */}
            {hasChart && (
              <View style={styles.chartCard}>
                <Text style={styles.chartLabel}>{t('progress.chartTitle')}</Text>
                <LineChart
                  data={{
                    labels: chartLabels,
                    datasets: [{ data: chartData, color: () => T.accent, strokeWidth: 2 }],
                  }}
                  width={SW - S.screen * 2 - S.s4 * 2}
                  height={160}
                  yAxisSuffix=""
                  segments={5}
                  fromZero
                  formatYLabel={(y) => String(Math.round(Number(y)))}
                  chartConfig={{
                    backgroundColor:        T.surface,
                    backgroundGradientFrom: T.surface,
                    backgroundGradientTo:   T.surface,
                    decimalPlaces:          0,
                    color:        (o = 1) => `rgba(${T.accentRgb},${o})`,
                    labelColor:   ()      => T.textFaint,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: T.accentDim },
                    propsForBackgroundLines: { strokeDasharray: '', stroke: T.line },
                  }}
                  bezier
                  style={{ borderRadius: R.sm, marginLeft: -8 }}
                />
              </View>
            )}

            {/* Report cards */}
            <View style={styles.listSection}>
              <Text style={styles.listLabel}>
                {reports.length} {reports.length === 1 ? 'Analysis' : 'Analyses'}
              </Text>
              {reports.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={styles.reportCard}
                  onPress={() => (navigation as any).navigate('HomeTab', { screen: 'Report', params: { report, saved: true } })}
                  activeOpacity={0.8}
                >
                  <ScoreRing score={report.averageScore} size={52} strokeWidth={4} animate={false} />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardDate}>{fmtDateTime(report.createdAt)}</Text>
                    <Text style={styles.cardPurpose}>
                      {t('progress.analysisItem.purpose', { purpose: getPurposeLabel(report.onboardingAnswers.purpose) })}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                      {report.categories.slice(0, 5).map((cat) => (
                        <View key={cat.name} style={styles.miniChip}>
                          <Text style={styles.miniChipVal}>{cat.score}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  <ChevronRight size={16} color={T.textFaint} strokeWidth={1.7} />
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
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('progress.compareTitle')}</Text>
            <TouchableOpacity onPress={() => setShowCompare(false)}>
              <X size={22} color={T.textMuted} strokeWidth={1.7} />
            </TouchableOpacity>
          </View>
          {selectedForCompare.length < 2 ? (
            <>
              <Text style={styles.selectHint}>{t('progress.selectTwo')}</Text>
              <FlatList
                data={reports}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                renderItem={({ item }) => {
                  const sel = selectedForCompare.includes(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.compareListItem, sel && styles.compareListItemSel]}
                      onPress={() => toggleCompare(item.id)}
                    >
                      <ScoreRing score={item.averageScore} size={44} strokeWidth={4} animate={false} />
                      <View style={styles.compareListContent}>
                        <Text style={styles.compareListDate}>{fmtFull(item.createdAt)}</Text>
                        <Text style={styles.compareListPurpose}>{getPurposeLabel(item.onboardingAnswers.purpose)}</Text>
                      </View>
                      {sel && <CheckCircle2 size={20} color={T.accent} strokeWidth={1.7} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          ) : renderCompareTable()}
          <View style={styles.modalFooter}>
            {selectedForCompare.length >= 2 && (
              <Button label={t('progress.compareClose')} onPress={() => setSelectedForCompare([])} variant="outline" fullWidth />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProgressScreen;
