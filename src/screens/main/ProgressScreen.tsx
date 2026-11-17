import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { AnalysisReport, SavedComparison } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import { getUserReports, getUserComparisons, updateComparisonName } from '../../services/storage';
import { useTabBarSpace } from '../../navigation/tabBarSpace';
import AmbientBackground from '../../components/AmbientBackground';
import Card, { IconTile } from '../../components/Card';
import ScoreLineChart from '../../components/ScoreLineChart';
import ProLock from '../../components/ProLock';
import ComparisonDetailModal from '../../components/ComparisonDetailModal';
import { ChevronRight, CompareIcon } from '../../components/Icons';
import {
  AnalysisRow, ComparisonListRow, ListCard, EmptyCard, RowDivider,
  score100, formatShortDate, sortReports, buildUntitledMap,
} from '../../components/HistoryRows';
import { ThemeColors, F, R, S as SP, TY } from '../../theme';

type Segment = 'analyses' | 'comparisons';

const ProgressScreen: React.FC = () => {
  const { t }      = useTranslation();
  const tabSpace   = useTabBarSpace();
  const navigation = useNavigation<any>();
  const { T }      = useTheme();
  const st         = useMemo(() => createStyles(T), [T]);
  const { user }   = useAuth();
  const { isPro }  = useSubscription(user?.uid || null);

  const [segment,     setSegment]     = useState<Segment>('analyses');
  const [reports,     setReports]     = useState<AnalysisReport[]>([]);
  const [comparisons, setComparisons] = useState<SavedComparison[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [detailComp,  setDetailComp]  = useState<SavedComparison | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return; }
    try {
      const [rData, cData] = await Promise.all([
        getUserReports(user.uid),
        getUserComparisons(user.uid),
      ]);
      setReports(rData);
      setComparisons(cData);
    } catch (err) {
      console.warn('Failed to fetch progress data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  // ── Abgeleitete Daten ─────────────────────────────────────────────────────
  const sorted     = useMemo(() => sortReports(reports), [reports]);
  const untitled   = useMemo(() => buildUntitledMap(sorted), [sorted]);

  // Diagramm — letzte 3 Monate, max. 10 Punkte, chronologisch (älteste zuerst)
  const chartReports = useMemo(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return sorted.filter((r) => new Date(r.createdAt) >= threeMonthsAgo).slice().reverse().slice(-10);
  }, [sorted]);
  const chartPoints = chartReports.map((r) => ({ score: score100(r.averageScore), time: new Date(r.createdAt).getTime() }));
  const latestScore = sorted[0] ? score100(sorted[0].averageScore) : null;
  const windowDelta = chartPoints.length >= 2 ? chartPoints[chartPoints.length - 1].score - chartPoints[0].score : null;

  const openReport = (report: AnalysisReport) =>
    navigation.navigate('HomeTab', { screen: 'Report', params: { report, saved: true, returnTo: 'progress' } });
  const openCompare = () => navigation.navigate('Compare');
  const reportName  = (r: AnalysisReport) => r.customName || `${t('progress.untitled')} ${untitled[r.id]}`;

  const handleRenameComparison = useCallback(async (value: string) => {
    if (!detailComp) return;
    const updated = { ...detailComp, customName: value };
    setDetailComp(updated);
    setComparisons((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    try {
      await updateComparisonName(detailComp.id, value);
    } catch (err: any) {
      console.warn('[ProgressScreen] Failed to rename comparison:', err?.message);
    }
  }, [detailComp]);

  // ── Bausteine ─────────────────────────────────────────────────────────────
  const header = (
    <View style={st.hero}>
      <Text style={st.label}>{t('progress.historyTitle')}</Text>
      <Text style={st.title} accessibilityRole="header">{t('progress.headline')}</Text>
    </View>
  );

  const newComparisonCard = (
    <Card onPress={openCompare} style={st.rowCard} accessibilityLabel={t('compare.newComparison')}>
      <IconTile size={40}><CompareIcon color={T.accentText} /></IconTile>
      <View style={st.rowText}>
        <Text style={st.rowTitle}>{t('compare.newComparison')}</Text>
        <Text style={st.rowSub}>{t('progress.newComparisonSub')}</Text>
      </View>
      <ChevronRight color={T.textSecondary} />
    </Card>
  );

  // ── Zustände ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={st.root}>
        <AmbientBackground animated />
        <View style={st.center}><ActivityIndicator color={T.accent} /></View>
      </View>
    );
  }

  // Verlauf ist Pro. Normalerweise fängt die Tab-Leiste Free-Nutzer vorher ab;
  // dieser Zustand greift z. B., wenn Pro abläuft, während der Tab offen ist.
  if (!isPro) {
    return (
      <View style={st.root}>
        <AmbientBackground animated />
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <View style={[st.scroll, { flex: 1, paddingBottom: tabSpace }]}>
            {header}
            <ProLock onUnlock={() => navigation.navigate('Paywall')} style={{ flex: 1 }} lines={5} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={st.root}>
      <AmbientBackground animated />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[st.scroll, { paddingBottom: tabSpace }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={T.accent} />
          }
        >
          {header}

          {/* Umschalter Analysen | Vergleiche */}
          <Card radius={R.segment} style={st.segment}>
            {(['analyses', 'comparisons'] as const).map((key) => {
              const active = segment === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSegment(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[st.segItem, active && { backgroundColor: T.accentTint }]}
                >
                  <Text style={[st.segText, active ? st.segTextActive : null]}>
                    {key === 'analyses' ? t('progress.tabAnalyses') : t('progress.tabComparisons')}
                  </Text>
                </Pressable>
              );
            })}
          </Card>

          {segment === 'analyses' && (
            sorted.length === 0 ? (
              <EmptyCard
                title={t('progress.noData')}
                sub={t('progress.noDataSub')}
                cta={{ label: t('progress.startButton'), onPress: () => navigation.navigate('HomeTab', { screen: 'Home' }) }}
              />
            ) : (
              <>
                {/* Score-Verlauf */}
                <Card style={st.chartCard}>
                  <View style={st.chartHead}>
                    <Text style={st.label}>{t('progress.scoreHistory')}</Text>
                    <Text style={st.chartWindow}>{t('progress.window3Months')}</Text>
                  </View>
                  <View style={st.scoreRow}>
                    <Text style={st.bigScore}>{latestScore}</Text>
                    {windowDelta !== null && chartReports[0] && (
                      <Text style={[st.since, { color: windowDelta >= 0 ? T.accentText : T.textSecondary }]}>
                        {windowDelta >= 0 ? '↑' : '↓'} {Math.abs(windowDelta)} {t('progress.sinceDate', { date: formatShortDate(chartReports[0].createdAt) })}
                      </Text>
                    )}
                  </View>
                  {chartPoints.length > 0 && <ScoreLineChart points={chartPoints} />}
                </Card>

                {newComparisonCard}

                {/* Neueste 3 Analysen */}
                <ListCard
                  label={t('progress.analysesHead')}
                  action={{ text: t('progress.allCount', { count: sorted.length }), onPress: () => navigation.navigate('AllAnalyses') }}
                >
                  {sorted.slice(0, 3).map((r, i) => {
                    const next = sorted[i + 1];
                    return (
                      <React.Fragment key={r.id}>
                        {i > 0 && <RowDivider />}
                        <AnalysisRow
                          name={reportName(r)}
                          date={formatShortDate(r.createdAt)}
                          score={score100(r.averageScore)}
                          delta={next ? score100(r.averageScore) - score100(next.averageScore) : null}
                          onPress={() => openReport(r)}
                        />
                      </React.Fragment>
                    );
                  })}
                </ListCard>
              </>
            )
          )}

          {segment === 'comparisons' && (
            <>
              {newComparisonCard}
              {comparisons.length === 0 ? (
                <EmptyCard
                  title={t('progress.noComparisons')}
                  sub={t('progress.noComparisonsSub')}
                  cta={{ label: t('progress.startComparison'), onPress: openCompare }}
                />
              ) : (
                <ListCard label={t('progress.comparisonsHead')}>
                  {comparisons.map((comp, i) => (
                    <React.Fragment key={comp.id}>
                      {i > 0 && <RowDivider />}
                      <ComparisonListRow comp={comp} onPress={() => setDetailComp(comp)} />
                    </React.Fragment>
                  ))}
                </ListCard>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <ComparisonDetailModal
        comparison={detailComp}
        onClose={() => setDetailComp(null)}
        onRename={handleRenameComparison}
      />
    </View>
  );
};

export default ProgressScreen;

const createStyles = (T: ThemeColors) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: SP.screen, paddingTop: SP.top, gap: 12 },

  hero:  { gap: 4 },
  label: { ...TY.label, color: T.textSecondary },
  title: { ...TY.pageTitle, color: T.text },

  segment:       { padding: 4, flexDirection: 'row', gap: 4 },
  segItem:       { flex: 1, height: 36, borderRadius: R.segmentItem, alignItems: 'center', justifyContent: 'center' },
  segText:       { fontFamily: F.medium, fontSize: 13.5, color: T.textSecondary },
  segTextActive: { fontFamily: F.semiBold, color: T.accentText },

  chartCard:   { paddingTop: 14, paddingHorizontal: 18, paddingBottom: 12, gap: 8 },
  chartHead:   { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  chartWindow: { fontFamily: F.medium, fontSize: 12, color: T.textSecondary },
  scoreRow:    { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  bigScore:    { ...TY.scoreMd, lineHeight: 40, color: T.text },
  since:       { fontFamily: F.semiBold, fontSize: 13, fontVariant: ['tabular-nums'] },

  rowCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowText:  { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { ...TY.rowTitleSm, color: T.text },
  rowSub:   { fontFamily: F.regular, fontSize: 12.5, color: T.textSecondary },
});
