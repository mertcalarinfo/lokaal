import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Alert, Modal, Share,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { TrendingUp, Share2, Pencil, Sparkles } from 'lucide-react-native';

import { v4 as uuidv4 } from 'uuid';
import { AnalysisReport, ComparisonResult, SavedComparison } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { compareVideos } from '../../services/gemini';
import { getUserReports, saveComparison, updateComparisonName, uploadVideo } from '../../services/storage';
import Pressable3D from '../../components/Pressable3D';
import RichText from '../../components/RichText';
import RenameModal from '../../components/RenameModal';
import AmbientBackground from '../../components/AmbientBackground';
import GlassIconButton from '../../components/GlassIconButton';
import Card, { IconTile } from '../../components/Card';
import Button from '../../components/Button';
import { ChevronRight, CheckIcon, UploadIcon } from '../../components/Icons';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../../theme';

import { useTabBarSpace } from '../../navigation/tabBarSpace';
// ── Types ─────────────────────────────────────────────────────────────────────

type VideoSelection = { uri: string; label: string } | null;
type ViewState      = 'idle' | 'loading' | 'result' | 'error';
type PickerSlot     = 'v1' | 'v2' | null;

function score100(s: number): number {
  return Math.round(s * 10);
}

// ── Sub-Komponenten ──────────────────────────────────────────────────────────

function VideoSelectorRows({ onPickReport, onPickGallery }: { onPickReport: () => void; onPickGallery: () => void }) {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const { t } = useTranslation();
  return (
    <Card style={S.selCard}>
      <Pressable3D onPress={onPickReport} accessibilityLabel={t('compare.fromAnalysis')}>
        <View style={S.selRow}>
          <IconTile size={40}><TrendingUp size={19} color={T.accentText} strokeWidth={1.7} /></IconTile>
          <Text style={S.selLabel}>{t('compare.fromAnalysis')}</Text>
          <ChevronRight color={T.textSecondary} />
        </View>
      </Pressable3D>
      <View style={S.divider} />
      <Pressable3D onPress={onPickGallery} accessibilityLabel={t('compare.fromGallery')}>
        <View style={S.selRow}>
          <IconTile size={40}><UploadIcon size={20} color={T.accentText} /></IconTile>
          <Text style={S.selLabel}>{t('compare.fromGallery')}</Text>
          <ChevronRight color={T.textSecondary} />
        </View>
      </Pressable3D>
    </Card>
  );
}

function SelectedRow({ label, onClear }: { label: string; onClear: () => void }) {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const { t } = useTranslation();
  return (
    <Card style={[S.selCard, S.selRow]}>
      <IconTile size={40}><CheckIcon size={18} color={T.accentText} /></IconTile>
      <Text style={S.selectedLabel} numberOfLines={1}>{label}</Text>
      <Pressable3D onPress={onClear} style={S.removeHit}>
        <Text style={S.clearTxt}>{t('common.remove')}</Text>
      </Pressable3D>
    </Card>
  );
}

function DirectionGlyph({ direction }: { direction: 'improved' | 'declined' | 'same' }) {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const color  = direction === 'improved' ? T.accentText : T.textSecondary;
  const symbol = direction === 'improved' ? '↑' : direction === 'declined' ? '↓' : '→';
  return <Text style={[S.dirGlyph, { color }]}>{symbol}</Text>;
}

// ── Main component ────────────────────────────────────────────────────────────

const CompareScreen: React.FC = () => {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const { t }    = useTranslation();
  const navigation = useNavigation<any>();
  const tabSpace   = useTabBarSpace();
  const { user } = useAuth();

  // View state
  const [viewState,    setViewState]    = useState<ViewState>('idle');
  const [video1,       setVideo1]       = useState<VideoSelection>(null);
  const [video2,       setVideo2]       = useState<VideoSelection>(null);
  const [userContext,  setUserContext]  = useState('');
  const [progress,     setProgress]     = useState(0);
  const [result,       setResult]       = useState<ComparisonResult | null>(null);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [isSaved,      setIsSaved]      = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [customName,   setCustomName]   = useState('');
  const [renameVisible, setRenameVisible] = useState(false);
  const savedComparisonIdRef = useRef<string | null>(null);

  // Report picker modal
  const [pickerSlot,     setPickerSlot]     = useState<PickerSlot>(null);
  const [savedReports,   setSavedReports]   = useState<AnalysisReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Pulsierendes Lade-Icon
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 700, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1,    { duration: 700, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1, true,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

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
        Alert.alert(t('common.error'), t('home.mediaPermission'));
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
        const sel: VideoSelection = { uri: asset.uri, label: `${t('compare.galleryLabel')}${mins ? ` · ${mins}` : ''}` };
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
    setIsSaved(false);
    setCustomName('');
    savedComparisonIdRef.current = null;
  }, []);

  const handleSaveComparison = useCallback(async () => {
    if (!result || !user?.uid) return;
    setIsSaving(true);
    try {
      const isLocal = (uri: string) =>
        uri.startsWith('file://') || uri.startsWith('content://');

      const resolveUrl = async (uri: string): Promise<string | undefined> => {
        if (!uri) return undefined;
        if (!isLocal(uri)) return uri; // already a Firebase Storage URL
        try {
          return await uploadVideo(uri, user.uid!);
        } catch (e) {
          console.warn('[Compare] Video upload failed:', e);
          return undefined;
        }
      };

      const [v1Url, v2Url] = await Promise.all([
        resolveUrl(video1?.uri ?? ''),
        resolveUrl(video2?.uri ?? ''),
      ]);

      // Firestore lehnt `undefined` ab — daher alle optionalen Felder mit leerem
      // String absichern statt undefined durchzulassen.
      const comparison: SavedComparison = {
        id:          uuidv4(),
        userId:      user.uid,
        createdAt:   new Date(),
        video1Label: video1?.label ?? 'Video 1',
        video2Label: video2?.label ?? 'Video 2',
        video1Url:   v1Url ?? '',
        video2Url:   v2Url ?? '',
        userContext: userContext.trim(),
        result,
        customName:  customName || '',
      };
      await saveComparison(comparison);
      savedComparisonIdRef.current = comparison.id;
      setIsSaved(true);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('common.error'));
    } finally {
      setIsSaving(false);
    }
  }, [result, user?.uid, video1, video2, userContext, customName, t]);

  const handleRename = useCallback(async (value: string) => {
    setCustomName(value);
    if (savedComparisonIdRef.current) {
      try {
        await updateComparisonName(savedComparisonIdRef.current, value);
      } catch (err: any) {
        console.warn('[Compare] Failed to rename comparison:', err?.message);
      }
    }
  }, []);

  const handleShare = useCallback(() => {
    if (!result) return;
    Share.share({ message: `${result.overallChange}\n\n${result.coachComment}` });
  }, [result]);

  const friendlyError = (msg: string): string => {
    if (msg.startsWith('UPLOAD_FAILED_V1')) return t('compare.errorUploadV1');
    if (msg.startsWith('UPLOAD_FAILED_V2')) return t('compare.errorUploadV2');
    if (msg.startsWith('TIMEOUT'))          return t('compare.errorTimeout');
    return t('compare.errorGeneric');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={S.safe}>
      <AmbientBackground animated={false} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>

        {/* ── Kopf ── */}
        <View style={S.head}>
          {viewState === 'result' ? (
            <>
              <GlassIconButton icon="back" onPress={handleReset} accessibilityLabel={t('compare.newComparison')} />
              <View style={S.headRight}>
                <Pressable3D onPress={() => setRenameVisible(true)} style={S.iconBtn} accessibilityLabel={t('progress.renameComparisonTitle')}>
                  <Pencil size={18} color={T.accentText} strokeWidth={1.7} />
                </Pressable3D>
                <Pressable3D onPress={handleShare} style={S.iconBtn} accessibilityLabel={t('common.share', { defaultValue: 'Share' })}>
                  <Share2 size={18} color={T.accentText} strokeWidth={1.7} />
                </Pressable3D>
              </View>
            </>
          ) : (
            // Seit Entwurf 5 im Verlauf-Stack: Zurück zum Verlauf
            <GlassIconButton icon="back" onPress={() => navigation.goBack()} accessibilityLabel={t('progress.back')} />
          )}
        </View>

        <ScrollView contentContainerStyle={[S.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── IDLE ── */}
          {viewState === 'idle' && (
            <>
              <View style={S.hero}>
                <Text style={S.label}>{t('progress.historyTitle')}</Text>
                <Text style={S.title} accessibilityRole="header">{t('compare.title')}</Text>
                <Text style={S.heroSub}>{t('compare.subtitle')}</Text>
              </View>

              <View style={S.subSection}>
                <Text style={S.label}>{t('compare.video1Label')}</Text>
                {video1 ? (
                  <SelectedRow label={video1.label} onClear={() => setVideo1(null)} />
                ) : (
                  <VideoSelectorRows onPickReport={() => openReportPicker('v1')} onPickGallery={() => pickFromGallery('v1')} />
                )}
              </View>

              <View style={S.subSection}>
                <Text style={S.label}>{t('compare.video2Label')}</Text>
                {video2 ? (
                  <SelectedRow label={video2.label} onClear={() => setVideo2(null)} />
                ) : (
                  <VideoSelectorRows onPickReport={() => openReportPicker('v2')} onPickGallery={() => pickFromGallery('v2')} />
                )}
              </View>

              <View style={S.subSection}>
                <Text style={S.label}>{t('compare.contextLabel')}</Text>
                <TextInput
                  style={S.contextInput}
                  placeholder={t('compare.contextPlaceholder')}
                  placeholderTextColor={T.disabledText}
                  selectionColor={T.accent}
                  value={userContext}
                  onChangeText={setUserContext}
                  multiline
                  maxLength={500}
                />
              </View>

              <Button
                label={t('compare.compareButton')}
                onPress={handleCompare}
                disabled={!video1 || !video2}
                fullWidth
              />
            </>
          )}

          {/* ── LOADING ── */}
          {viewState === 'loading' && (
            <Card style={S.loadingCard}>
              <Animated.View style={[S.loadingIconCircle, pulseStyle]}>
                <Sparkles size={26} color={T.accentText} strokeWidth={1.6} />
              </Animated.View>
              <Text style={S.loadingTitle}>{t('compare.loadingTitle')}</Text>
              <Text style={S.loadingSubtitle}>{t('compare.loadingSubtitle')}</Text>
              <View style={S.barTrack}>
                <View style={[S.barFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
              <View style={S.barRow}>
                <Text style={S.barPct}>{Math.round(progress * 100)}%</Text>
                <Text style={S.barStatus}>{statusLabel(progress)}</Text>
              </View>
            </Card>
          )}

          {/* ── RESULT ── */}
          {viewState === 'result' && result && (
            <>
              <View style={S.hero}>
                <Text style={S.label}>{t('compare.resultTitle')}</Text>
                {customName ? <Text style={S.title} numberOfLines={2}>{customName}</Text> : null}
              </View>

              {/* Videos */}
              {(video1?.uri || video2?.uri) && (
                <View style={S.videosRow}>
                  {[video1, video2].map((v, idx) => (
                    <View key={idx} style={{ flex: 1, gap: 6 }}>
                      <Text style={S.videoLabel} numberOfLines={1}>{v?.label ?? `Video ${idx + 1}`}</Text>
                      <View style={S.videoBox}>
                        {v?.uri ? (
                          <Video source={{ uri: v.uri }} style={S.video} useNativeControls resizeMode={ResizeMode.CONTAIN} isLooping={false} />
                        ) : (
                          <Text style={S.videoEmpty}>—</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Card style={S.section}>
                <Text style={S.label}>{t('compare.overallLabel')}</Text>
                <RichText text={result.overallChange} style={S.bodyText} />
              </Card>

              {result.categoryComparisons.length > 0 && (
                <Card style={S.section}>
                  <Text style={S.label}>{t('compare.categoriesLabel')}</Text>
                  {result.categoryComparisons.map((item, i) => (
                    <View key={i} style={[S.catRow, i > 0 && S.catDivider]}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={S.catName}>{item.category}</Text>
                        {item.observation ? <RichText text={item.observation} style={S.catObs} /> : null}
                      </View>
                      <DirectionGlyph direction={item.direction} />
                    </View>
                  ))}
                </Card>
              )}

              {result.contextResponse && (
                <Card style={S.section}>
                  <Text style={S.label}>{t('compare.contextResponseLabel')}</Text>
                  <RichText text={result.contextResponse} style={S.bodyText} />
                </Card>
              )}

              {result.coachComment && (
                <Card style={S.section}>
                  <Text style={S.label}>{t('compare.coachLabel')}</Text>
                  <RichText text={result.coachComment} style={S.bodyText} />
                </Card>
              )}

              <View style={S.actions}>
                {!isSaved ? (
                  <Button label={t('compare.saveComparison')} onPress={handleSaveComparison} loading={isSaving} fullWidth />
                ) : (
                  <View style={S.savedRow}>
                    <CheckIcon size={16} color={T.accentText} />
                    <Text style={S.savedTxt}>{t('compare.comparisonSaved')}</Text>
                  </View>
                )}
                <Button label={t('compare.newComparison')} variant="secondary" onPress={handleReset} fullWidth />
              </View>
            </>
          )}

          {/* ── ERROR ── */}
          {viewState === 'error' && (
            <Card style={S.loadingCard}>
              <Text style={S.loadingTitle}>{t('compare.errorTitle')}</Text>
              <Text style={S.loadingSubtitle} numberOfLines={4}>{friendlyError(errorMsg)}</Text>
              <Button label={t('compare.errorRetry')} variant="secondary" onPress={handleReset} fullWidth style={{ marginTop: 18 }} />
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ── Report Picker Modal ── */}
      <Modal
        visible={pickerSlot !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerSlot(null)}
      >
        <View style={S.safe}>
          <AmbientBackground animated={false} />
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
            <View style={S.head}>
              <GlassIconButton icon="close" onPress={() => setPickerSlot(null)} accessibilityLabel={t('common.close')} />
            </View>
            <View style={[S.hero, { paddingHorizontal: SP.screen, paddingTop: 8 }]}>
              <Text style={S.title}>{t('compare.selectReport')}</Text>
              <Text style={S.heroSub}>{t('compare.selectReportHint')}</Text>
            </View>

            {reportsLoading ? (
              <View style={S.emptyBox}><Text style={S.emptyText}>{t('common.loading')}</Text></View>
            ) : savedReports.length === 0 ? (
              <View style={S.emptyBox}><Text style={S.emptyText}>{t('compare.noReports')}</Text></View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: SP.screen, paddingBottom: 40 }}>
                <Card style={{ paddingHorizontal: 16 }}>
                  {savedReports.map((item, index) => (
                    <Pressable3D key={item.id} onPress={() => selectFromReport(item)}>
                      <View style={[S.reportRow, index > 0 && S.catDivider]}>
                        <View style={{ flex: 1 }}>
                          <Text style={S.reportDate}>{fmtDate(item.createdAt)}</Text>
                          <Text style={S.reportScore}>{score100(item.averageScore)} / 100</Text>
                        </View>
                        <ChevronRight color={T.textSecondary} />
                      </View>
                    </Pressable3D>
                  ))}
                </Card>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <RenameModal
        visible={renameVisible}
        initialValue={customName}
        placeholder={t('progress.renameComparisonPlaceholder')}
        title={t('progress.renameComparisonTitle')}
        onClose={() => setRenameVisible(false)}
        onSave={handleRename}
      />
    </View>
  );
};

export default CompareScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, paddingHorizontal: SP.screen, paddingTop: 8, gap: 14 },

  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SP.screen, paddingTop: SP.top, minHeight: 44,
  },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  hero:    { gap: 4 },
  label:   { ...TY.label, color: T.textSecondary },
  title:   { ...TY.pageTitle, color: T.text },
  heroSub: { ...TY.body, color: T.textSecondary, marginTop: 4 },

  subSection: { gap: 8 },
  selCard:    { paddingHorizontal: 14 },
  selRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  selLabel:   { flex: 1, fontFamily: F.semiBold, fontSize: 15, color: T.text },
  selectedLabel: { flex: 1, fontFamily: F.semiBold, fontSize: 15, color: T.text },
  removeHit:  { minHeight: 44, justifyContent: 'center' },
  clearTxt:   { fontFamily: F.semiBold, fontSize: 14, color: T.accentText },
  divider:    { height: 1, backgroundColor: T.hairline },

  contextInput: {
    minHeight: 110, textAlignVertical: 'top',
    backgroundColor: T.card, borderWidth: 1, borderColor: T.cardBorder, borderRadius: R.button,
    padding: 14, ...TY.bodySm, color: T.text,
  },

  // Laden / Fehler
  loadingCard: { padding: 22, alignItems: 'center', marginTop: 24 },
  loadingIconCircle: {
    width: 56, height: 56, borderRadius: R.tile, backgroundColor: T.accentTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  loadingTitle:    { ...TY.rowTitle, fontSize: 19, lineHeight: 24, color: T.text, textAlign: 'center' },
  loadingSubtitle: { ...TY.bodySm, color: T.textSecondary, textAlign: 'center', marginTop: 6 },
  barTrack: { alignSelf: 'stretch', height: 4, backgroundColor: T.track, borderRadius: 2, overflow: 'hidden', marginTop: 24, marginBottom: 8 },
  barFill:  { height: 4, backgroundColor: T.accentData, borderRadius: 2 },
  barRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', gap: 12 },
  barPct:   { fontFamily: F.semiBold, fontSize: 13, color: T.accentText, fontVariant: ['tabular-nums'] },
  barStatus:{ flex: 1, ...TY.captionSm, color: T.textSecondary, textAlign: 'right' },

  // Ergebnis
  videosRow:  { flexDirection: 'row', gap: 10 },
  videoLabel: { ...TY.captionSm, fontFamily: F.medium, color: T.textSecondary },
  videoBox:   { height: 180, borderRadius: R.tile, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  video:      { width: '100%', height: '100%' },
  videoEmpty: { ...TY.caption, color: T.textSecondary },
  section:    { padding: 18, gap: 8 },
  bodyText:   { ...TY.body, color: T.text },
  catRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  catDivider: { borderTopWidth: 1, borderTopColor: T.hairline },
  catName:    { fontFamily: F.semiBold, fontSize: 14.5, color: T.text },
  catObs:     { ...TY.caption, color: T.textSecondary },
  dirGlyph:   { fontFamily: F.semiBold, fontSize: 16, width: 18, textAlign: 'right' },
  actions:    { gap: 10 },
  savedRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44 },
  savedTxt:   { fontFamily: F.semiBold, fontSize: 14, color: T.accentText },

  // Auswahl-Sheet
  emptyBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SP.screen },
  emptyText:   { ...TY.body, color: T.textSecondary, textAlign: 'center' },
  reportRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  reportDate:  { fontFamily: F.medium, fontSize: 14.5, color: T.text },
  reportScore: { ...TY.captionSm, color: T.textSecondary, fontVariant: ['tabular-nums'] },
});
