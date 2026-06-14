import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import {
  Upload, X, ChevronRight, TrendingUp, TrendingDown,
  Minus, RotateCcw, GitCompare,
} from 'lucide-react-native';

import { AnalysisReport, ComparisonResult, ComparisonCategoryItem } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { compareVideos } from '../../services/gemini';
import { getUserReports } from '../../services/storage';
import ScoreRing from '../../components/ScoreRing';
import Button from '../../components/Button';
import { ThemeColors, F, R, S } from '../../theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type VideoSelection = { uri: string; label: string } | null;
type ViewState      = 'idle' | 'loading' | 'result' | 'error';
type PickerSlot     = 'v1' | 'v2' | null;

// ── Styles ────────────────────────────────────────────────────────────────────

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, paddingHorizontal: S.screen, paddingBottom: S.s8 },

  // Header
  pageTitle: {
    fontFamily: F.xBold, fontSize: 34, fontWeight: '800',
    color: T.text, letterSpacing: -1.02,
    marginTop: S.s4, marginBottom: 4,
  },
  pageSub: {
    fontFamily: F.regular, fontSize: 14.5, color: T.textMuted,
    lineHeight: 22, marginBottom: S.s6,
  },

  // Section label
  sectionLabel: {
    fontFamily: F.semiBold, fontSize: 10, fontWeight: '600',
    color: T.textFaint, letterSpacing: 1.8, textTransform: 'uppercase',
    marginBottom: S.s2, marginTop: S.s5,
  },

  // Video selector card
  selectorCard: {
    backgroundColor: T.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: T.hairline, overflow: 'hidden',
  },
  selectorRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: S.s4, paddingVertical: S.s4, gap: S.s3,
  },
  selectorRowBorder: { borderBottomWidth: 1, borderBottomColor: T.line },
  selectorIcon: {
    width: 36, height: 36, borderRadius: R.pill,
    borderWidth: 1, borderColor: T.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  selectorText:  { flex: 1, fontFamily: F.medium, fontSize: 15, fontWeight: '500', color: T.text },
  selectorArrow: { color: T.textFaint },

  // Selected chip
  selectedChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surfaceAccent,
    borderRadius: R.lg, borderWidth: 1.5, borderColor: T.accent,
    paddingHorizontal: S.s4, paddingVertical: S.s3,
    gap: S.s3,
  },
  selectedLabel: { flex: 1, fontFamily: F.semiBold, fontSize: 14, fontWeight: '600', color: T.text },
  selectedScore: { fontFamily: F.xBold, fontSize: 15, fontWeight: '800', color: T.accent },
  clearBtn:      { padding: 4 },

  // Context input
  contextCard: {
    backgroundColor: T.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: T.hairline,
    padding: S.s4, marginTop: S.s5,
  },
  contextLabel: {
    fontFamily: F.semiBold, fontSize: 10, fontWeight: '600',
    color: T.textFaint, letterSpacing: 1.8, textTransform: 'uppercase',
    marginBottom: S.s2,
  },
  contextInput: {
    fontFamily: F.regular, fontSize: 14.5, color: T.text,
    lineHeight: 22, minHeight: 80, textAlignVertical: 'top',
  },

  // CTA
  cta: { marginTop: S.s6 },

  // ── Loading state ──────────────────────────────────────────────────────────
  loadingBox: { flex: 1, paddingTop: 60, alignItems: 'center', paddingHorizontal: S.screen },
  loadingEyebrow: {
    fontFamily: F.semiBold, fontSize: 10, fontWeight: '600',
    color: T.textMuted, letterSpacing: 3, textTransform: 'uppercase',
    marginBottom: S.s3,
  },
  loadingTitle: {
    fontFamily: F.bold, fontSize: 20, fontWeight: '700',
    color: T.text, textAlign: 'center', letterSpacing: -0.4, marginBottom: S.s2,
  },
  loadingSubtitle: {
    fontFamily: F.regular, fontSize: 14, color: T.textMuted,
    textAlign: 'center', lineHeight: 20, marginBottom: S.s8,
  },
  barTrack: {
    width: '100%', height: 2, backgroundColor: T.line,
    borderRadius: 2, overflow: 'hidden', marginBottom: S.s2,
  },
  barFill: { height: 4, marginTop: -1, backgroundColor: T.accent, borderRadius: 2 },
  barRow:  { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  barPct:  { fontFamily: F.semiBold, fontSize: 13, fontWeight: '600', color: T.accent },
  barStatus: { fontFamily: F.regular, fontSize: 12, color: T.textFaint },

  // ── Result state ───────────────────────────────────────────────────────────
  resultSection: {
    borderTopWidth: 1, borderTopColor: T.hairline,
    paddingTop: S.s5, marginTop: S.s5,
  },
  resultLabel: {
    fontFamily: F.semiBold, fontSize: 10, fontWeight: '600',
    color: T.textMuted, letterSpacing: 2, textTransform: 'uppercase',
    marginBottom: S.s3,
  },
  resultText: {
    fontFamily: F.regular, fontSize: 15, color: T.text,
    lineHeight: 24,
  },
  catRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: S.s3, gap: S.s3,
    borderBottomWidth: 1, borderBottomColor: T.line,
  },
  catDirChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: R.xs, paddingHorizontal: 8, paddingVertical: 4, gap: 4,
    minWidth: 92,
  },
  catDirText: { fontFamily: F.semiBold, fontSize: 11, fontWeight: '700' },
  catName:    { fontFamily: F.semiBold, fontSize: 14, fontWeight: '600', color: T.text, marginBottom: 2 },
  catObs:     { fontFamily: F.regular, fontSize: 13, color: T.textMuted, lineHeight: 19 },
  catContent: { flex: 1 },

  // ── Report Picker Modal ────────────────────────────────────────────────────
  modal:        { flex: 1, backgroundColor: T.bg, paddingHorizontal: S.screen, paddingTop: S.s6 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.s5 },
  modalTitle:   { fontFamily: F.bold, fontSize: 20, fontWeight: '700', color: T.text },
  modalHint:    { fontFamily: F.regular, fontSize: 14, color: T.textMuted, marginBottom: S.s4 },
  reportItem:   {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: R.md,
    padding: S.s4, marginBottom: S.s2,
    borderWidth: 1, borderColor: T.hairline, gap: S.s3,
  },
  reportItemContent: { flex: 1 },
  reportItemDate:    { fontFamily: F.semiBold, fontSize: 14, fontWeight: '600', color: T.text, marginBottom: 2 },
  reportItemPurpose: { fontFamily: F.regular, fontSize: 12, color: T.textFaint },
  emptyBox:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontFamily: F.regular, fontSize: 15, color: T.textFaint, textAlign: 'center' },
});

// ── Direction chip ─────────────────────────────────────────────────────────────

const DirectionChip: React.FC<{ direction: ComparisonCategoryItem['direction']; T: ThemeColors }> = ({ direction, T }) => {
  const { t } = useTranslation();
  const cfg = {
    improved: { color: T.success,    bg: T.successBg,  Icon: TrendingUp,   key: 'compare.improved' },
    declined: { color: T.error,      bg: T.errorBg,    Icon: TrendingDown,  key: 'compare.declined' },
    same:     { color: T.textMuted,  bg: T.surfaceAlt, Icon: Minus,         key: 'compare.same'     },
  }[direction];

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', borderRadius: R.xs, paddingHorizontal: 8, paddingVertical: 4, gap: 4, backgroundColor: cfg.bg }]}>
      <cfg.Icon size={12} color={cfg.color} strokeWidth={2} />
      <Text style={{ fontFamily: F.semiBold, fontSize: 11, fontWeight: '700', color: cfg.color }}>
        {t(cfg.key)}
      </Text>
    </View>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const CompareScreen: React.FC = () => {
  const { t }    = useTranslation();
  const { user } = useAuth();
  const { T }    = useTheme();
  const styles   = useMemo(() => createStyles(T), [T]);

  // View state
  const [viewState,    setViewState]    = useState<ViewState>('idle');
  const [video1,       setVideo1]       = useState<VideoSelection>(null);
  const [video2,       setVideo2]       = useState<VideoSelection>(null);
  const [userContext,  setUserContext]  = useState('');
  const [progress,     setProgress]     = useState(0);
  const [result,       setResult]       = useState<ComparisonResult | null>(null);
  const [errorMsg,     setErrorMsg]     = useState('');

  // Report picker modal
  const [pickerSlot,         setPickerSlot]         = useState<PickerSlot>(null);
  const [savedReports,       setSavedReports]       = useState<AnalysisReport[]>([]);
  const [reportsLoading,     setReportsLoading]     = useState(false);

  // Animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 300, useNativeDriver: false }).start();
  }, [progress]);
  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fmtDate = (d: Date | string) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const loadSavedReports = useCallback(async () => {
    if (!user?.uid) return;
    setReportsLoading(true);
    try {
      const data = await getUserReports(user.uid);
      setSavedReports(data);
    } catch (err) {
      console.warn('[Compare] Failed to fetch reports:', err);
    } finally {
      setReportsLoading(false);
    }
  }, [user?.uid]);

  const openReportPicker = useCallback((slot: 'v1' | 'v2') => {
    setPickerSlot(slot);
    loadSavedReports();
  }, [loadSavedReports]);

  const selectFromReport = useCallback((report: AnalysisReport) => {
    const label = `${fmtDate(report.createdAt)}  ·  ${report.averageScore}/10`;
    const sel: VideoSelection = { uri: report.videoUrl, label };
    if (pickerSlot === 'v1') setVideo1(sel);
    if (pickerSlot === 'v2') setVideo2(sel);
    setPickerSlot(null);
  }, [pickerSlot]);

  const pickFromGallery = useCallback(async (slot: 'v1' | 'v2') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), 'Mediathek-Zugriff erforderlich.');
        return;
      }
      await new Promise<void>((r) => setTimeout(r, 300));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 300,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const dur   = asset.duration ? Math.round(asset.duration / 1000) : null;
        const mins  = dur ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : '';
        const sel: VideoSelection = { uri: asset.uri, label: `Galerie${mins ? ` · ${mins}` : ''}` };
        if (slot === 'v1') setVideo1(sel);
        if (slot === 'v2') setVideo2(sel);
      }
    } catch {
      Alert.alert(t('common.error'), t('home.pickError'));
    }
  }, [t]);

  const statusLabel = (p: number): string => {
    if (p < 0.40) return t('compare.loadingVideo1');
    if (p < 0.76) return t('compare.loadingVideo2');
    return t('compare.loadingAnalyzing');
  };

  // ── Compare action ─────────────────────────────────────────────────────────

  const handleCompare = useCallback(async () => {
    if (!video1 || !video2) {
      Alert.alert(t('common.error'), t('compare.selectBothVideos'));
      return;
    }
    setViewState('loading');
    setProgress(0);
    setResult(null);
    setErrorMsg('');

    try {
      const res = await compareVideos(
        video1.uri,
        video2.uri,
        userContext.trim(),
        (p) => setProgress(p),
      );
      setResult(res);
      setViewState('result');
    } catch (err: any) {
      console.error('[Compare] Error:', err?.message);
      setErrorMsg(err?.message || 'unknown');
      setViewState('error');
    }
  }, [video1, video2, userContext, t]);

  const handleReset = useCallback(() => {
    setViewState('idle');
    setVideo1(null);
    setVideo2(null);
    setUserContext('');
    setProgress(0);
    setResult(null);
    setErrorMsg('');
  }, []);

  // ── VideoSelector ──────────────────────────────────────────────────────────

  const VideoSelector = ({ slot, selection, onClear }: {
    slot:      'v1' | 'v2';
    selection: VideoSelection;
    onClear:   () => void;
  }) => {
    if (selection) {
      return (
        <View style={styles.selectedChip}>
          <Text style={styles.selectedLabel} numberOfLines={1}>{selection.label}</Text>
          <TouchableOpacity style={styles.clearBtn} onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={T.textMuted} strokeWidth={1.7} />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.selectorCard}>
        <TouchableOpacity
          style={[styles.selectorRow, styles.selectorRowBorder]}
          onPress={() => openReportPicker(slot)}
          activeOpacity={0.8}
        >
          <View style={styles.selectorIcon}>
            <TrendingUp size={18} color={T.textMuted} strokeWidth={1.7} />
          </View>
          <Text style={styles.selectorText}>{t('compare.fromAnalysis')}</Text>
          <ChevronRight size={16} color={T.textFaint} strokeWidth={1.7} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.selectorRow}
          onPress={() => pickFromGallery(slot)}
          activeOpacity={0.8}
        >
          <View style={styles.selectorIcon}>
            <Upload size={18} color={T.textMuted} strokeWidth={1.7} />
          </View>
          <Text style={styles.selectorText}>{t('compare.fromGallery')}</Text>
          <ChevronRight size={16} color={T.textFaint} strokeWidth={1.7} />
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── IDLE ── */}
        {viewState === 'idle' && (
          <>
            <Text style={styles.pageTitle}>{t('compare.title')}</Text>
            <Text style={styles.pageSub}>{t('compare.subtitle')}</Text>

            <Text style={styles.sectionLabel}>{t('compare.video1Label')}</Text>
            <VideoSelector slot="v1" selection={video1} onClear={() => setVideo1(null)} />

            <Text style={styles.sectionLabel}>{t('compare.video2Label')}</Text>
            <VideoSelector slot="v2" selection={video2} onClear={() => setVideo2(null)} />

            {/* Context */}
            <View style={styles.contextCard}>
              <Text style={styles.contextLabel}>{t('compare.contextLabel')}</Text>
              <TextInput
                style={styles.contextInput}
                placeholder={t('compare.contextPlaceholder')}
                placeholderTextColor={T.textFaint}
                value={userContext}
                onChangeText={setUserContext}
                multiline
                maxLength={500}
              />
            </View>

            <View style={styles.cta}>
              <Button
                label={t('compare.compareButton')}
                onPress={handleCompare}
                fullWidth
                size="lg"
                disabled={!video1 || !video2}
                style={{ paddingVertical: 19 }}
                textStyle={{ fontSize: 15, letterSpacing: 2 }}
              />
            </View>
          </>
        )}

        {/* ── LOADING ── */}
        {viewState === 'loading' && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingEyebrow}>{t('compare.loadingEyebrow')}</Text>
            <Text style={styles.loadingTitle}>{t('compare.loadingTitle')}</Text>
            <Text style={styles.loadingSubtitle}>{t('compare.loadingSubtitle')}</Text>

            <View style={styles.barTrack}>
              <Animated.View style={[styles.barFill, { width: barWidth }]} />
            </View>
            <View style={styles.barRow}>
              <Text style={styles.barPct}>{Math.round(progress * 100)}%</Text>
              <Text style={styles.barStatus}>{statusLabel(progress)}</Text>
            </View>
          </View>
        )}

        {/* ── RESULT ── */}
        {viewState === 'result' && result && (
          <>
            <Text style={styles.pageTitle}>{t('compare.resultTitle')}</Text>

            {/* Overall */}
            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>{t('compare.overallLabel')}</Text>
              <Text style={styles.resultText}>{result.overallChange}</Text>
            </View>

            {/* Category comparisons */}
            {result.categoryComparisons.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>{t('compare.categoriesLabel')}</Text>
                {result.categoryComparisons.map((item, i) => (
                  <View key={i} style={[styles.catRow, i === result.categoryComparisons.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.catContent}>
                      <Text style={styles.catName}>{item.category}</Text>
                      <Text style={styles.catObs}>{item.observation}</Text>
                    </View>
                    <DirectionChip direction={item.direction} T={T} />
                  </View>
                ))}
              </View>
            )}

            {/* Context response */}
            {result.contextResponse && (
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>{t('compare.contextResponseLabel')}</Text>
                <Text style={styles.resultText}>{result.contextResponse}</Text>
              </View>
            )}

            {/* Coach comment */}
            {result.coachComment && (
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>{t('compare.coachLabel')}</Text>
                <Text style={styles.resultText}>{result.coachComment}</Text>
              </View>
            )}

            <View style={styles.cta}>
              <Button
                label={t('compare.newComparison')}
                onPress={handleReset}
                variant="outline"
                fullWidth
                size="lg"
              />
            </View>
          </>
        )}

        {/* ── ERROR ── */}
        {viewState === 'error' && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingTitle}>{t('compare.errorTitle')}</Text>
            <Text style={[styles.loadingSubtitle, { color: T.error }]} numberOfLines={4}>
              {errorMsg}
            </Text>
            <Button
              label={t('compare.errorRetry')}
              onPress={handleReset}
              variant="outline"
              style={{ marginTop: S.s4 }}
            />
          </View>
        )}

      </ScrollView>

      {/* ── Report Picker Modal ── */}
      <Modal
        visible={pickerSlot !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerSlot(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('compare.selectReport')}</Text>
            <TouchableOpacity onPress={() => setPickerSlot(null)}>
              <X size={22} color={T.textMuted} strokeWidth={1.7} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalHint}>{t('compare.selectReportHint')}</Text>

          {reportsLoading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('common.loading')}</Text>
            </View>
          ) : savedReports.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{t('compare.noReports')}</Text>
            </View>
          ) : (
            <FlatList
              data={savedReports}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.reportItem} onPress={() => selectFromReport(item)} activeOpacity={0.8}>
                  <ScoreRing score={item.averageScore} size={48} strokeWidth={4} animate={false} />
                  <View style={styles.reportItemContent}>
                    <Text style={styles.reportItemDate}>{fmtDate(item.createdAt)}</Text>
                    <Text style={styles.reportItemPurpose}>{item.averageScore}/10</Text>
                  </View>
                  <ChevronRight size={16} color={T.textFaint} strokeWidth={1.7} />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default CompareScreen;
