import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, RefreshControl, Modal, FlatList, Share,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, ArrowLeftRight, X, ChevronRight,
  CheckCircle2, Share2, ArrowLeft, Sparkles, Pencil,
} from 'lucide-react-native';

import { AnalysisReport, SavedComparison, HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { getUserReports, getUserComparisons, updateComparisonName } from '../../services/storage';
import PressableScale from '../../components/PressableScale';
import ProgressChart from '../../components/ProgressChart';
import RenameModal from '../../components/RenameModal';
import ProLock from '../../components/ProLock';
import { RC, MONO, MONO_MED, RS, BTN_SHADOW, HL, RR } from '../../theme/register';

import { useTabBarSpace } from '../../navigation/tabBarSpace';
type ProgressNav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function score100(s: number): number {
  return Math.round(s * 10);
}

function formatDateRow(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('de-DE', { month: 'short' }).toUpperCase().replace('.', '');
  return `${day} ${month}`;
}

function formatDateFull(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return `${formatDateFull(d)} · ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

function EmptyState({
  title, sub, ctaLabel, onPress,
}: { title: string; sub: string; ctaLabel?: string; onPress?: () => void }) {
  return (
    <View style={S.empty}>
      <View style={S.emptyIcon}>
        <TrendingUp size={28} color={RC.muted} strokeWidth={1.6} />
      </View>
      <Text style={S.emptyTitle}>{title}</Text>
      <Text style={S.emptySub}>{sub}</Text>
      {ctaLabel && onPress && (
        <PressableScale onPress={onPress} style={{ marginTop: 24, alignSelf: 'stretch' }}>
          <View style={[S.btnPrimary, BTN_SHADOW]}>
            <View style={S.btnLeft}>
              <Sparkles size={16} color={RC.onAccent} strokeWidth={1.8} />
              <Text style={S.btnLabelPrimary}>{ctaLabel}</Text>
            </View>
          </View>
        </PressableScale>
      )}
    </View>
  );
}

interface HistoryRowProps {
  name: string;
  date: string;
  score: number;
  delta: number | null;
  deltaColor: string;
  isLast: boolean;
  onPress: () => void;
}

function HistoryRow({ name, date, score, delta, deltaColor, isLast, onPress }: HistoryRowProps) {
  return (
    <Pressable onPress={onPress} style={[S.tableRow, isLast && S.tableRowLast]}>
      <Text style={[S.tableCell, { flex: 1 }]} numberOfLines={1}>{name}</Text>
      <Text style={[S.tableCell, S.tableCellMuted, { width: 64, textAlign: 'right' }]} numberOfLines={1}>
        {date}
      </Text>
      <Text style={[S.tableCell, { width: 44, textAlign: 'right' }]}>{score}</Text>
      <Text style={[S.tableCell, { width: 50, textAlign: 'right', color: deltaColor }]}>
        {delta === null ? '—' : delta >= 0 ? `+${delta}` : String(delta)}
      </Text>
    </Pressable>
  );
}

function ComparisonRow({ comp, onPress }: { comp: SavedComparison; onPress: () => void }) {
  const { t } = useTranslation();
  const improved = comp.result.categoryComparisons.filter((c) => c.direction === 'improved').length;
  const declined = comp.result.categoryComparisons.filter((c) => c.direction === 'declined').length;
  const same     = comp.result.categoryComparisons.filter((c) => c.direction === 'same').length;
  return (
    <Pressable onPress={onPress} style={S.compRow}>
      <View style={{ flex: 1 }}>
        <Text style={S.compDate}>{comp.customName || formatDateTime(comp.createdAt)}</Text>
        <Text style={S.compLabels} numberOfLines={1}>{comp.video1Label} → {comp.video2Label}</Text>
        <View style={S.compChips}>
          {improved > 0 && <Text style={[S.compChipTxt, { color: RC.accent }]}>↑ {improved}</Text>}
          {declined > 0 && <Text style={[S.compChipTxt, { color: RC.faint }]}>↓ {declined}</Text>}
          {same > 0 && <Text style={[S.compChipTxt, { color: RC.ghost }]}>→ {same}</Text>}
        </View>
      </View>
      <ChevronRight size={16} color={RC.ghost} strokeWidth={1.7} />
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const ProgressScreen: React.FC = () => {
  const { t }      = useTranslation();
  const tabSpace   = useTabBarSpace();
  const navigation = useNavigation<ProgressNav>();
  const { user }   = useAuth();
  const { isPro }  = useSubscription(user?.uid || null);

  const [activeTab,          setActiveTab]          = useState<'analyses' | 'comparisons'>('analyses');
  const [reports,            setReports]            = useState<AnalysisReport[]>([]);
  const [comparisons,        setComparisons]        = useState<SavedComparison[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [refreshing,         setRefreshing]         = useState(false);
  const [showCompare,        setShowCompare]        = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [detailComp,         setDetailComp]         = useState<SavedComparison | null>(null);
  const [chartKey,           setChartKey]           = useState(0);
  const [renameVisible,      setRenameVisible]      = useState(false);

  const fetchReports = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return; }
    try {
      const [rData, cData] = await Promise.all([
        getUserReports(user.uid),
        getUserComparisons(user.uid),
      ]);
      setReports(rData);
      setComparisons(cData);
      // Erzwingt einen Remount des Charts, damit der Draw-In bei jedem Tab-Besuch neu abspielt.
      setChartKey((k) => k + 1);
    } catch (err) {
      console.warn('Failed to fetch progress data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useFocusEffect(useCallback(() => { fetchReports(); }, [fetchReports]));

  // ── Abgeleitete Daten ─────────────────────────────────────────────────────────
  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Chart — letzte 3 Monate, max. 10 Punkte, chronologisch (älteste zuerst)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const chartReports = sortedReports.filter((r) => new Date(r.createdAt) >= threeMonthsAgo).slice().reverse().slice(-10);
  const rawChartScores = chartReports.map((r) => r.averageScore);
  const chartScores = rawChartScores.length === 1 ? [rawChartScores[0], rawChartScores[0]] : rawChartScores;
  const hasChart = rawChartScores.length >= 1;

  // X-Achse: genau 5 Marker bei 0/25/50/75/100% der ZEITSPANNE (älteste → neueste),
  // jeweils mit dem tatsächlichen Datum an diesem Zeitpunkt (zeitlich gleichmäßig, nicht index-basiert).
  const chartXMarkers = (() => {
    if (chartReports.length === 0) return [];
    const tStart = new Date(chartReports[0].createdAt).getTime();
    const tEnd   = new Date(chartReports[chartReports.length - 1].createdAt).getTime();
    if (chartReports.length === 1 || tEnd <= tStart) {
      return [{ frac: 0, label: formatDateRow(chartReports[0].createdAt) }];
    }
    return [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
      frac,
      label: formatDateRow(new Date(tStart + frac * (tEnd - tStart))),
    }));
  })();

  // Fallback-Nummerierung für unbenannte Analysen — chronologisch (älteste = 1), stabil.
  const untitledMap: Record<string, number> = {};
  {
    let n = 0;
    [...sortedReports].reverse().forEach((r) => {
      if (!r.customName) { n += 1; untitledMap[r.id] = n; }
    });
  }

  const getPurposeLabel = (p: string) => t(`progress.purposes.${p}`, { defaultValue: p });

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
        <View style={S.cmpHead}>
          <View style={{ flex: 1 }} />
          {[a, b].map((r) => (
            <View key={r.id} style={S.cmpHeadCell}>
              <Text style={S.cmpHeadDate}>{formatDateFull(r.createdAt)}</Text>
              <Text style={S.cmpHeadScore}>{score100(r.averageScore)}</Text>
            </View>
          ))}
        </View>
        {a.categories.map((cat, i) => {
          const sA = score100(a.categories[i]?.score ?? 0);
          const sB = score100(b.categories[i]?.score ?? 0);
          const d  = sB - sA;
          return (
            <View key={cat.name} style={S.cmpRow}>
              <View style={S.cmpCell}>
                <Text style={S.cmpCellLabel} numberOfLines={2}>
                  {t(`report.categoryNames.${cat.name}`, { defaultValue: cat.name })}
                </Text>
              </View>
              <View style={S.cmpCell}><Text style={S.cmpCellScore}>{sA}</Text></View>
              <View style={S.cmpCell}>
                <Text style={S.cmpCellScore}>{sB}</Text>
                {d !== 0 && (
                  <Text style={[S.cmpDiff, { color: d > 0 ? RC.accent : RC.faint }]}>
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
      <SafeAreaView style={[S.safe, { paddingBottom: tabSpace - 24 }]} edges={['top', 'left', 'right']}>
        <View style={S.loadingBox}>
          <Text style={S.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Verlauf-Tab für Free komplett gesperrt ──
  if (!isPro) {
    return (
      <SafeAreaView style={[S.safe, { paddingBottom: tabSpace - 24 }]} edges={['top', 'left', 'right']}>
        <View style={S.head}>
          <Text style={S.headTitle}>{t('progress.historyTitle').toUpperCase()}</Text>
          <Text style={S.headMeta}>{t('progress.windowDays').toUpperCase()}</Text>
        </View>
        <ProLock
          onUnlock={() => (navigation as any).navigate('Paywall')}
          style={{ flex: 1 }}
          lines={5}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[S.safe, { paddingBottom: tabSpace - 24 }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchReports(); }}
            tintColor={RC.accent}
          />
        }
      >
        {/* ── AKTENKOPF ── */}
        <View style={S.head}>
          <Text style={S.headTitle}>{t('progress.historyTitle').toUpperCase()}</Text>
          <Text style={S.headMeta}>{t('progress.windowDays').toUpperCase()}</Text>
        </View>

        {/* ── TABS ── */}
        <View style={S.tabRow}>
          {(['analyses', 'comparisons'] as const).map((tab) => {
            const active = activeTab === tab;
            const label  = (tab === 'analyses' ? t('progress.tabAnalyses') : t('progress.tabComparisons')).toUpperCase();
            return (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={S.tabBtn}>
                <Text style={[S.tabBtnText, active && S.tabBtnTextActive]}>{label}</Text>
                {active && <View style={S.tabUnderline} />}
              </Pressable>
            );
          })}
        </View>

        {/* ── ANALYSEN TAB ── */}
        {activeTab === 'analyses' && (
          reports.length === 0 ? (
            <EmptyState
              title={t('progress.noData')}
              sub={t('progress.noDataSub')}
              ctaLabel={t('progress.startButton').toUpperCase()}
              onPress={() => (navigation as any).navigate('HomeTab')}
            />
          ) : (
            <>
              {/* Score-Verlauf-Chart */}
              {hasChart && (
                <View style={S.chartSection}>
                  <Text style={S.chartLabel}>{t('progress.scoreHistory').toUpperCase()}</Text>
                  <View style={{ height: 12 }} />
                  <ProgressChart
                    key={chartKey}
                    scores={chartScores}
                    xMarkers={chartXMarkers}
                    showYAxis
                    colors={{ accent: RC.accent, gridLine: RC.line, bg: RC.bg, faint: RC.faint }}
                  />
                </View>
              )}

              <View style={{ height: 22 }} />

              {/* Vergleichen-Link */}
              {reports.length >= 2 && (
                <View style={S.compareLinkRow}>
                  <PressableScale onPress={() => { setSelectedForCompare([]); setShowCompare(true); }}>
                    <View style={S.compareLink}>
                      <ArrowLeftRight size={13} color={RC.muted} strokeWidth={1.8} />
                      <Text style={S.compareLinkTxt}>{t('progress.compareButton').toUpperCase()}</Text>
                    </View>
                  </PressableScale>
                </View>
              )}

              {/* Verlaufs-Tabelle */}
              <View style={S.table}>
                <View style={S.tableHead}>
                  <Text style={[S.tableHeadTxt, { flex: 1 }]}>{t('progress.tableName').toUpperCase()}</Text>
                  <Text style={[S.tableHeadTxt, { width: 64, textAlign: 'right' }]}>{t('progress.tableDate').toUpperCase()}</Text>
                  <Text style={[S.tableHeadTxt, { width: 44, textAlign: 'right' }]}>{t('progress.tableScore').toUpperCase()}</Text>
                  <Text style={[S.tableHeadTxt, { width: 50, textAlign: 'right' }]}>{t('progress.tableDelta').toUpperCase()}</Text>
                </View>
                {sortedReports.map((report, i) => {
                  const val  = score100(report.averageScore);
                  const next = sortedReports[i + 1];
                  const delta = next ? val - score100(next.averageScore) : null;
                  const deltaColor =
                    delta === null ? RC.faint :
                    delta > 0 && i === 0 ? RC.accent :
                    delta > 0 ? RC.muted : RC.faint;
                  const rowName = report.customName || `${t('progress.untitled')} ${untitledMap[report.id]}`;
                  return (
                    <HistoryRow
                      key={report.id}
                      name={rowName}
                      date={formatDateRow(report.createdAt)}
                      score={val}
                      delta={delta}
                      deltaColor={deltaColor}
                      isLast={i === sortedReports.length - 1}
                      onPress={() => (navigation as any).navigate('HomeTab', { screen: 'Report', params: { report, saved: true, returnTo: 'progress' } })}
                    />
                  );
                })}
              </View>
            </>
          )
        )}

        {/* ── VERGLEICHE TAB ── */}
        {activeTab === 'comparisons' && (
          comparisons.length === 0 ? (
            <EmptyState
              title={t('progress.noComparisons')}
              sub={t('progress.noComparisonsSub')}
            />
          ) : (
            <View style={S.compList}>
              {comparisons.map((comp) => (
                <ComparisonRow key={comp.id} comp={comp} onPress={() => setDetailComp(comp)} />
              ))}
            </View>
          )
        )}
      </ScrollView>

      {/* ── Vergleichs-Detail-Modal ── */}
      <Modal
        visible={detailComp !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailComp(null)}
      >
        {detailComp && (
          <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
            <View style={S.head}>
              <View style={S.headLeft}>
                <PressableScale onPress={() => setDetailComp(null)} style={S.backBtn}>
                  <ArrowLeft size={16} color={RC.text} strokeWidth={1.8} />
                </PressableScale>
                <Text style={S.headTitle}>{t('progress.comparisonTitle').toUpperCase()}</Text>
              </View>
              <View style={S.headLeft}>
                <PressableScale onPress={() => setRenameVisible(true)} style={S.shareBtn}>
                  <Pencil size={14} color={RC.muted} strokeWidth={1.7} />
                </PressableScale>
                <PressableScale
                  onPress={() => Share.share({ message: `${detailComp.result.overallChange}\n\n${detailComp.result.coachComment}` })}
                  style={S.shareBtn}
                >
                  <Share2 size={16} color={RC.muted} strokeWidth={1.7} />
                </PressableScale>
              </View>
            </View>

            <ScrollView contentContainerStyle={S.detailScroll} showsVerticalScrollIndicator={false}>
              <View style={S.subSection}>
                <Text style={S.detailDate}>{detailComp.customName || formatDateTime(detailComp.createdAt)}</Text>
                <Text style={S.detailLabels} numberOfLines={1}>
                  {detailComp.video1Label} → {detailComp.video2Label}
                </Text>
              </View>

              {(detailComp.video1Url || detailComp.video2Url) && (
                <View style={[S.subSection, S.detailVideosRow]}>
                  {[
                    { url: detailComp.video1Url, label: detailComp.video1Label },
                    { url: detailComp.video2Url, label: detailComp.video2Label },
                  ].map(({ url, label }, idx) => (
                    <View key={idx} style={{ flex: 1 }}>
                      <Text style={S.detailVideoLabel} numberOfLines={1}>{label}</Text>
                      <View style={S.detailVideoBox}>
                        {url ? (
                          <Video
                            source={{ uri: url }}
                            style={S.detailVideo}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            isLooping={false}
                          />
                        ) : (
                          <Text style={S.detailVideoEmpty}>—</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ height: 12 }} />

              <View style={S.subSection}>
                <Text style={S.subHead}>{t('compare.overallLabel').toUpperCase()}</Text>
                <Text style={S.detailBody}>{detailComp.result.overallChange}</Text>
              </View>

              {detailComp.result.categoryComparisons.length > 0 && (
                <>
                  <View style={{ height: 28 }} />
                  <View style={S.subSection}>
                    <Text style={S.subHead}>{t('progress.categoriesHead').toUpperCase()}</Text>
                    {detailComp.result.categoryComparisons.map((item, i) => {
                      const isImproved = item.direction === 'improved';
                      const isDeclined = item.direction === 'declined';
                      const color = isImproved ? RC.accent : isDeclined ? RC.faint : RC.ghost;
                      const symbol = isImproved ? '↑' : isDeclined ? '↓' : '→';
                      return (
                        <View key={i} style={S.detailCatRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={S.detailCatName}>
                              {t(`report.categoryNames.${item.category}`, { defaultValue: item.category })}
                            </Text>
                            {item.observation ? <Text style={S.detailCatObs}>{item.observation}</Text> : null}
                          </View>
                          <Text style={[S.detailCatDir, { color }]}>{symbol}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {detailComp.result.contextResponse ? (
                <>
                  <View style={{ height: 28 }} />
                  <View style={S.subSection}>
                    <Text style={S.subHead}>{t('compare.contextResponseLabel').toUpperCase()}</Text>
                    <Text style={S.detailBody}>{detailComp.result.contextResponse}</Text>
                  </View>
                </>
              ) : null}

              {detailComp.result.coachComment ? (
                <>
                  <View style={{ height: 28 }} />
                  <View style={S.subSection}>
                    <Text style={S.subHead}>{t('compare.coachLabel').toUpperCase()}</Text>
                    <Text style={[S.detailBody, { fontStyle: 'italic' }]}>{detailComp.result.coachComment}</Text>
                  </View>
                </>
              ) : null}

              <View style={{ height: 56 }} />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ── Vergleichen-Auswahl-Modal ── */}
      <Modal
        visible={showCompare}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompare(false)}
      >
        <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
          <View style={S.head}>
            <Text style={S.headTitle}>{t('progress.compareButton').toUpperCase()}</Text>
            <PressableScale onPress={() => setShowCompare(false)} style={S.shareBtn}>
              <X size={18} color={RC.muted} strokeWidth={1.7} />
            </PressableScale>
          </View>

          {selectedForCompare.length < 2 ? (
            <>
              <Text style={S.selectHint}>{t('progress.selectTwo')}</Text>
              <FlatList
                data={reports}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: RS.screenH, paddingBottom: 24 }}
                renderItem={({ item, index }) => {
                  const sel = selectedForCompare.includes(item.id);
                  return (
                    <Pressable
                      onPress={() => toggleCompare(item.id)}
                      style={[S.selectRow, index === reports.length - 1 && S.tableRowLast]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={S.selectDate}>{formatDateFull(item.createdAt)}</Text>
                        <Text style={S.selectPurpose}>{getPurposeLabel(item.onboardingAnswers.purpose)} · {score100(item.averageScore)}/100</Text>
                      </View>
                      {sel ? (
                        <CheckCircle2 size={20} color={RC.accent} strokeWidth={1.8} />
                      ) : (
                        <View style={S.radio} />
                      )}
                    </Pressable>
                  );
                }}
              />
            </>
          ) : renderCompareTable()}

          <View style={S.modalFooter}>
            {selectedForCompare.length >= 2 && (
              <PressableScale onPress={() => setSelectedForCompare([])}>
                <View style={S.btnSecondary}>
                  <Text style={S.btnLabelSecondary}>{t('progress.compareClose').toUpperCase()}</Text>
                </View>
              </PressableScale>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      <RenameModal
        visible={renameVisible}
        initialValue={detailComp?.customName ?? ''}
        placeholder={t('progress.renameComparisonPlaceholder')}
        title={t('progress.renameComparisonTitle').toUpperCase()}
        onClose={() => setRenameVisible(false)}
        onSave={handleRenameComparison}
      />
    </SafeAreaView>
  );
};

export default ProgressScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: RC.bg },
  scroll: { flexGrow: 1, paddingBottom: 40 },

  loadingBox:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: MONO, fontSize: 13, color: RC.faint },

  // Aktenkopf
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: RS.headTop,
    paddingHorizontal: RS.screenH,
    paddingBottom: RS.headPadB,
    borderBottomWidth: HL.strong,
    borderBottomColor: RC.lineStrong,
  },
  headLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTitle: {
    fontFamily: MONO_MED,
    fontSize: 12,
    letterSpacing: 2,
    color: RC.text,
  },
  headMeta: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1,
    color: RC.muted,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 26,
    paddingHorizontal: RS.screenH,
    paddingTop: 16,
    marginBottom: 28,
  },
  tabBtn: {
    paddingBottom: 10,
  },
  tabBtnText: {
    fontFamily: MONO_MED,
    fontSize: 13,
    letterSpacing: 0.5,
    color: RC.faint,
  },
  tabBtnTextActive: {
    color: RC.text,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: RC.accent,
  },

  // Empty State
  empty: {
    alignItems: 'center',
    paddingHorizontal: RS.screenH,
    paddingTop: 40,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: RC.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: RC.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: RC.muted,
    textAlign: 'center',
    lineHeight: 21,
  },

  // Score-Verlauf-Chart
  chartSection: {
    paddingHorizontal: RS.screenH,
  },
  chartLabel: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.5,
    color: RC.faint,
  },

  // Vergleichen-Link
  compareLinkRow: {
    paddingHorizontal: RS.screenH,
    alignItems: 'flex-end',
  },
  compareLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  compareLinkTxt: {
    fontFamily: MONO_MED,
    fontSize: 11.5,
    letterSpacing: 1,
    color: RC.muted,
  },

  // Verlaufs-Tabelle
  table: {
    paddingHorizontal: RS.screenH,
    marginTop: 22,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 7,
    paddingBottom: 6,
    borderBottomWidth: HL.strong,
    borderBottomColor: RC.lineStrong,
  },
  tableHeadTxt: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1,
    color: RC.faint,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    borderBottomWidth: HL.table,
    borderBottomColor: RC.lineTable,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontFamily: MONO,
    fontSize: 13,
    color: RC.text,
  },
  tableCellMuted: {
    color: RC.muted,
  },
  tableCellSub: {
    fontSize: 11,
    marginTop: 2,
  },

  // Vergleiche-Liste
  compList: {
    paddingHorizontal: RS.screenH,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    borderTopWidth: HL.std,
    borderTopColor: RC.line,
  },
  compDate: {
    fontFamily: MONO_MED,
    fontSize: 13,
    color: RC.text,
  },
  compLabels: {
    fontSize: 13,
    color: RC.muted,
    marginTop: 4,
  },
  compChips: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  compChipTxt: {
    fontFamily: MONO_MED,
    fontSize: 12,
  },

  // Compare-Tabelle (im Auswahl-Modal)
  cmpHead: {
    flexDirection: 'row',
    paddingHorizontal: RS.screenH,
    paddingBottom: 12,
    marginTop: 8,
    borderBottomWidth: HL.strong,
    borderBottomColor: RC.lineStrong,
  },
  cmpHeadCell: { flex: 1, alignItems: 'center' },
  cmpHeadDate: { fontFamily: MONO, fontSize: 10, color: RC.muted, marginBottom: 4, textAlign: 'center' },
  cmpHeadScore: { fontSize: 20, fontWeight: '600', color: RC.accent },
  cmpRow: {
    flexDirection: 'row',
    paddingHorizontal: RS.screenH,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: HL.faint,
    borderBottomColor: RC.lineFaint,
  },
  cmpCell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  cmpCellLabel: { fontFamily: MONO, fontSize: 11, color: RC.muted, textAlign: 'center', lineHeight: 15 },
  cmpCellScore: { fontSize: 15, fontWeight: '600', color: RC.text },
  cmpDiff: { fontFamily: MONO_MED, fontSize: 11, marginTop: 2 },

  // Auswahl-Modal
  selectHint: {
    fontSize: 13.5,
    color: RC.muted,
    paddingHorizontal: RS.screenH,
    marginTop: 16,
    marginBottom: 8,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: HL.std,
    borderTopColor: RC.line,
  },
  selectDate: { fontFamily: MONO_MED, fontSize: 14, color: RC.text },
  selectPurpose: { fontFamily: MONO, fontSize: 12, color: RC.muted, marginTop: 3 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: RC.ghost,
  },
  modalFooter: {
    paddingHorizontal: RS.screenH,
    paddingVertical: 16,
  },

  // Detail-Modal
  detailScroll: {
    paddingTop: 22,
    paddingBottom: 16,
  },
  subSection: {
    paddingHorizontal: RS.screenH,
  },
  detailDate: {
    fontFamily: MONO_MED,
    fontSize: 14,
    color: RC.text,
  },
  detailLabels: {
    fontSize: 13,
    color: RC.muted,
    marginTop: 4,
  },
  detailVideosRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
  },
  detailVideoLabel: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1,
    color: RC.faint,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailVideoBox: {
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: RC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailVideo: { width: '100%', height: '100%' },
  detailVideoEmpty: { fontFamily: MONO, fontSize: 12, color: RC.ghost },
  subHead: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1.5,
    color: RC.faint,
    textTransform: 'uppercase',
    paddingBottom: 9,
    marginBottom: 14,
    borderBottomWidth: HL.strong,
    borderBottomColor: RC.lineStrong,
  },
  detailBody: {
    fontSize: 14.5,
    lineHeight: 22,
    color: RC.text,
  },
  detailCatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: HL.faint,
    borderTopColor: RC.lineFaint,
  },
  detailCatName: {
    fontSize: 14,
    fontWeight: '600',
    color: RC.text,
  },
  detailCatObs: {
    fontSize: 13,
    color: RC.muted,
    lineHeight: 19,
    marginTop: 3,
  },
  detailCatDir: {
    fontSize: 18,
    marginTop: 1,
  },

  // Buttons (Primär / Sekundär)
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RC.accent,
    borderRadius: RR.button,
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  btnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnLabelPrimary: {
    fontFamily: MONO_MED,
    fontSize: 14,
    letterSpacing: 1,
    color: RC.onAccent,
  },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: RC.lineStrong,
    borderRadius: RR.button,
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  btnLabelSecondary: {
    fontFamily: MONO_MED,
    fontSize: 13,
    letterSpacing: 1.5,
    color: RC.text,
  },
});
