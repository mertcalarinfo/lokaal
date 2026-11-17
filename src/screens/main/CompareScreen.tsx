import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Alert, Modal, FlatList, Share,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import {
  Upload, X, ArrowLeft, ArrowRight, ChevronRight, TrendingUp,
  Share2, Pencil, CheckCircle2, Sparkles, FileVideo,
} from 'lucide-react-native';

import { v4 as uuidv4 } from 'uuid';
import { AnalysisReport, ComparisonResult, SavedComparison } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { compareVideos } from '../../services/gemini';
import { getUserReports, saveComparison, updateComparisonName, uploadVideo } from '../../services/storage';
import PressableScale from '../../components/PressableScale';
import RichText from '../../components/RichText';
import RenameModal from '../../components/RenameModal';
import { RC, MONO, MONO_MED, RS, BTN_SHADOW, HL, RR } from '../../theme/register';

// ── Types ─────────────────────────────────────────────────────────────────────

type VideoSelection = { uri: string; label: string } | null;
type ViewState      = 'idle' | 'loading' | 'result' | 'error';
type PickerSlot     = 'v1' | 'v2' | null;

function score100(s: number): number {
  return Math.round(s * 10);
}

// ── Sub-Komponenten ──────────────────────────────────────────────────────────

function VideoSelectorRows({ onPickReport, onPickGallery }: { onPickReport: () => void; onPickGallery: () => void }) {
  const { t } = useTranslation();
  return (
    <View>
      <PressableScale onPress={onPickReport}>
        <View style={S.selRow}>
          <View style={S.selIconCircle}>
            <TrendingUp size={20} color={RC.text} strokeWidth={1.7} />
          </View>
          <Text style={S.selLabel}>{t('compare.fromAnalysis')}</Text>
          <ChevronRight size={16} color={RC.ghost} strokeWidth={1.7} />
        </View>
      </PressableScale>
      <PressableScale onPress={onPickGallery}>
        <View style={[S.selRow, S.selRowBorder]}>
          <View style={S.selIconCircle}>
            <Upload size={20} color={RC.text} strokeWidth={1.7} />
          </View>
          <Text style={S.selLabel}>{t('compare.fromGallery')}</Text>
          <ChevronRight size={16} color={RC.ghost} strokeWidth={1.7} />
        </View>
      </PressableScale>
    </View>
  );
}

function SelectedRow({ label, onClear }: { label: string; onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={S.selectedRow}>
      <CheckCircle2 size={16} color={RC.accent} strokeWidth={2} />
      <Text style={S.selectedLabel} numberOfLines={1}>{label}</Text>
      <PressableScale onPress={onClear}>
        <Text style={S.clearTxt}>{t('common.remove')}</Text>
      </PressableScale>
    </View>
  );
}

function DirectionGlyph({ direction }: { direction: 'improved' | 'declined' | 'same' }) {
  const color  = direction === 'improved' ? RC.accent : direction === 'declined' ? RC.faint : RC.ghost;
  const symbol = direction === 'improved' ? '↑' : direction === 'declined' ? '↓' : '→';
  return <Text style={[S.dirGlyph, { color }]}>{symbol}</Text>;
}

// ── Main component ────────────────────────────────────────────────────────────

const CompareScreen: React.FC = () => {
  const { t }    = useTranslation();
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
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>

      {/* ── AKTENKOPF ── */}
      <View style={S.head}>
        {viewState === 'result' ? (
          <>
            <PressableScale onPress={handleReset} style={S.iconBtn}>
              <ArrowLeft size={16} color={RC.text} strokeWidth={1.8} />
            </PressableScale>
            <View style={S.headRight}>
              <PressableScale onPress={() => setRenameVisible(true)} style={S.iconBtn}>
                <Pencil size={14} color={RC.muted} strokeWidth={1.7} />
              </PressableScale>
              <PressableScale onPress={handleShare} style={S.iconBtn}>
                <Share2 size={16} color={RC.muted} strokeWidth={1.7} />
              </PressableScale>
            </View>
          </>
        ) : (
          <Text style={S.headTitle}>{t('compare.title').toUpperCase()}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── IDLE ── */}
        {viewState === 'idle' && (
          <>
            <View style={S.hero}>
              <Text style={S.heroSub}>{t('compare.subtitle')}</Text>
            </View>

            <View style={{ height: 28 }} />

            <View style={S.subSection}>
              <Text style={S.fieldLabel}>{t('compare.video1Label')}</Text>
              {video1 ? (
                <SelectedRow label={video1.label} onClear={() => setVideo1(null)} />
              ) : (
                <VideoSelectorRows
                  onPickReport={() => openReportPicker('v1')}
                  onPickGallery={() => pickFromGallery('v1')}
                />
              )}
            </View>

            <View style={{ height: 24 }} />

            <View style={S.subSection}>
              <Text style={S.fieldLabel}>{t('compare.video2Label')}</Text>
              {video2 ? (
                <SelectedRow label={video2.label} onClear={() => setVideo2(null)} />
              ) : (
                <VideoSelectorRows
                  onPickReport={() => openReportPicker('v2')}
                  onPickGallery={() => pickFromGallery('v2')}
                />
              )}
            </View>

            <View style={{ height: 24 }} />

            <View style={S.subSection}>
              <Text style={S.fieldLabel}>{t('compare.contextLabel')}</Text>
              <TextInput
                style={S.contextInput}
                placeholder={t('compare.contextPlaceholder')}
                placeholderTextColor={RC.ghost}
                value={userContext}
                onChangeText={setUserContext}
                multiline
                maxLength={500}
              />
            </View>

            <View style={{ height: 8 }} />

            <View style={S.cta}>
              <PressableScale
                onPress={handleCompare}
                disabled={!video1 || !video2}
                style={{ alignSelf: 'stretch' }}
              >
                <View style={[S.btnPrimary, BTN_SHADOW, (!video1 || !video2) && S.btnDisabled]}>
                  <View style={S.btnLeft}>
                    <Sparkles size={18} color={RC.onAccent} strokeWidth={1.8} />
                    <Text style={S.btnLabelPrimary}>{t('compare.compareButton')}</Text>
                  </View>
                </View>
              </PressableScale>
            </View>
          </>
        )}

        {/* ── LOADING ── */}
        {viewState === 'loading' && (
          <View style={S.loadingBox}>
            <Animated.View style={[S.loadingIconCircle, pulseStyle]}>
              <Sparkles size={30} color={RC.accent} strokeWidth={1.6} />
            </Animated.View>

            <View style={{ height: 22 }} />
            <Text style={S.loadingTitle}>{t('compare.loadingTitle')}</Text>
            <View style={{ height: 8 }} />
            <Text style={S.loadingSubtitle}>{t('compare.loadingSubtitle')}</Text>

            <View style={{ height: 30 }} />
            <View style={S.barTrack}>
              <View style={[S.barFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <View style={S.barRow}>
              <Text style={S.barPct}>{Math.round(progress * 100)}%</Text>
              <Text style={S.barStatus}>{statusLabel(progress)}</Text>
            </View>
          </View>
        )}

        {/* ── RESULT ── */}
        {viewState === 'result' && result && (
          <>
            {customName ? (
              <View style={S.subSection}>
                <Text style={S.customName} numberOfLines={1}>{customName}</Text>
                <View style={{ height: 18 }} />
              </View>
            ) : null}

            {/* Videos */}
            {(video1?.uri || video2?.uri) && (
              <View style={[S.subSection, S.videosRow]}>
                {[video1, video2].map((v, idx) => (
                  <View key={idx} style={{ flex: 1 }}>
                    <Text style={S.videoLabel} numberOfLines={1}>
                      {v?.label ?? `Video ${idx + 1}`}
                    </Text>
                    <View style={S.videoBox}>
                      {v?.uri ? (
                        <Video
                          source={{ uri: v.uri }}
                          style={S.video}
                          useNativeControls
                          resizeMode={ResizeMode.CONTAIN}
                          isLooping={false}
                        />
                      ) : (
                        <Text style={S.videoEmpty}>—</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 28 }} />

            {/* Overall */}
            <View style={S.subSection}>
              <Text style={S.subHead}>{t('compare.overallLabel').toUpperCase()}</Text>
              <RichText text={result.overallChange} style={S.bodyText} />
            </View>

            {/* Category comparisons */}
            {result.categoryComparisons.length > 0 && (
              <>
                <View style={{ height: 28 }} />
                <View style={S.subSection}>
                  <Text style={S.subHead}>{t('compare.categoriesLabel').toUpperCase()}</Text>
                  {result.categoryComparisons.map((item, i) => (
                    <View key={i} style={S.catRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={S.catName}>{item.category}</Text>
                        {item.observation ? <RichText text={item.observation} style={S.catObs} /> : null}
                      </View>
                      <DirectionGlyph direction={item.direction} />
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Context response */}
            {result.contextResponse && (
              <>
                <View style={{ height: 28 }} />
                <View style={S.subSection}>
                  <Text style={S.subHead}>{t('compare.contextResponseLabel').toUpperCase()}</Text>
                  <RichText text={result.contextResponse} style={S.bodyText} />
                </View>
              </>
            )}

            {/* Coach comment */}
            {result.coachComment && (
              <>
                <View style={{ height: 28 }} />
                <View style={S.subSection}>
                  <Text style={S.subHead}>{t('compare.coachLabel').toUpperCase()}</Text>
                  <RichText text={result.coachComment} style={[S.bodyText, { fontStyle: 'italic' }]} />
                </View>
              </>
            )}

            <View style={{ height: 28 }} />

            <View style={S.subSection}>
              {!isSaved ? (
                <PressableScale onPress={handleSaveComparison} disabled={isSaving} style={{ marginBottom: 12 }}>
                  <View style={[S.btnPrimary, BTN_SHADOW, isSaving && { opacity: 0.7 }]}>
                    <View style={S.btnLeft}>
                      <View style={S.btnDot} />
                      <Text style={S.btnLabelPrimary}>
                        {isSaving ? t('common.loading') : t('compare.saveComparison').toUpperCase()}
                      </Text>
                    </View>
                    <ArrowRight size={16} color={RC.onAccent} strokeWidth={1.8} />
                  </View>
                </PressableScale>
              ) : (
                <View style={S.savedRow}>
                  <CheckCircle2 size={13} color={RC.text} strokeWidth={2} />
                  <Text style={S.savedTxt}>{t('compare.comparisonSaved').toUpperCase()}</Text>
                </View>
              )}

              <PressableScale onPress={handleReset}>
                <View style={S.btnSecondary}>
                  <Text style={S.btnLabelSecondary}>{t('compare.newComparison').toUpperCase()}</Text>
                </View>
              </PressableScale>
            </View>
          </>
        )}

        {/* ── ERROR ── */}
        {viewState === 'error' && (
          <View style={S.loadingBox}>
            <Text style={S.loadingTitle}>{t('compare.errorTitle')}</Text>
            <View style={{ height: 8 }} />
            <Text style={[S.loadingSubtitle, { color: RC.faint }]} numberOfLines={4}>
              {friendlyError(errorMsg)}
            </Text>
            <View style={{ height: 24 }} />
            <PressableScale onPress={handleReset}>
              <View style={S.btnSecondary}>
                <Text style={S.btnLabelSecondary}>{t('compare.errorRetry').toUpperCase()}</Text>
              </View>
            </PressableScale>
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
        <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>
          <View style={S.head}>
            <Text style={S.headTitle}>{t('compare.selectReport')}</Text>
            <PressableScale onPress={() => setPickerSlot(null)} style={S.iconBtn}>
              <X size={18} color={RC.muted} strokeWidth={1.7} />
            </PressableScale>
          </View>
          <Text style={S.modalHint}>{t('compare.selectReportHint')}</Text>

          {reportsLoading ? (
            <View style={S.emptyBox}>
              <Text style={S.emptyText}>{t('common.loading')}</Text>
            </View>
          ) : savedReports.length === 0 ? (
            <View style={S.emptyBox}>
              <Text style={S.emptyText}>{t('compare.noReports')}</Text>
            </View>
          ) : (
            <FlatList
              data={savedReports}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: RS.screenH, paddingBottom: 24 }}
              renderItem={({ item, index }) => (
                <PressableScale onPress={() => selectFromReport(item)}>
                  <View style={[S.reportRow, index === 0 && S.reportRowFirst]}>
                    <View style={S.reportIconCircle}>
                      <FileVideo size={18} color={RC.text} strokeWidth={1.7} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.reportDate}>{fmtDate(item.createdAt)}</Text>
                      <Text style={S.reportScore}>{score100(item.averageScore)}/100</Text>
                    </View>
                    <ChevronRight size={16} color={RC.ghost} strokeWidth={1.7} />
                  </View>
                </PressableScale>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      <RenameModal
        visible={renameVisible}
        initialValue={customName}
        placeholder={t('progress.renameComparisonPlaceholder')}
        title={t('progress.renameComparisonTitle').toUpperCase()}
        onClose={() => setRenameVisible(false)}
        onSave={handleRename}
      />
    </SafeAreaView>
  );
};

export default CompareScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: RC.bg },
  scroll: { flexGrow: 1, paddingBottom: 56 },

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
  headRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headTitle: {
    fontFamily: MONO_MED,
    fontSize: 12,
    letterSpacing: 2,
    color: RC.text,
  },
  iconBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero (idle)
  hero: {
    paddingHorizontal: RS.screenH,
    paddingTop: 34,
  },
  heroSub: {
    fontFamily: MONO,
    fontSize: 14,
    lineHeight: 21,
    color: RC.muted,
  },

  subSection: {
    paddingHorizontal: RS.screenH,
  },
  fieldLabel: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1.5,
    color: RC.faint,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Video-Auswahl
  selRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: HL.std,
    borderTopColor: RC.line,
  },
  selRowBorder: {
    borderBottomWidth: HL.std,
    borderBottomColor: RC.line,
  },
  selIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: RC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selLabel: {
    flex: 1,
    fontFamily: MONO_MED,
    fontSize: 14,
    color: RC.text,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    borderTopWidth: HL.std,
    borderTopColor: RC.line,
  },
  selectedLabel: {
    flex: 1,
    fontFamily: MONO_MED,
    fontSize: 14,
    color: RC.accent,
  },
  clearTxt: {
    fontFamily: MONO,
    fontSize: 12,
    color: RC.ghost,
    textDecorationLine: 'underline',
  },

  // Kontext-Feld
  contextInput: {
    fontSize: 14.5,
    color: RC.text,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1.5,
    borderColor: RC.line,
    borderRadius: 12,
    padding: 14,
  },

  // CTA
  cta: {
    paddingHorizontal: RS.screenH,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RC.accent,
    borderRadius: RR.button,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: RC.onAccent,
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
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  savedTxt: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1,
    color: RC.text,
  },

  // Loading
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: RS.screenH,
    paddingTop: 60,
    paddingBottom: 60,
  },
  loadingIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: RC.accentWash,
    borderWidth: 1.5,
    borderColor: RC.accentLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: RC.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: RC.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  barTrack: {
    width: '100%',
    height: 2,
    backgroundColor: RC.line,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: 4,
    marginTop: -1,
    backgroundColor: RC.accent,
    borderRadius: 2,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  barPct: {
    fontFamily: MONO_MED,
    fontSize: 13,
    color: RC.accent,
  },
  barStatus: {
    fontFamily: MONO,
    fontSize: 12,
    color: RC.faint,
  },

  // Ergebnis
  customName: {
    fontSize: 16,
    fontWeight: '600',
    color: RC.text,
  },
  videosRow: {
    flexDirection: 'row',
    gap: 14,
  },
  videoLabel: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1,
    color: RC.faint,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  videoBox: {
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: RC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: { width: '100%', height: '100%' },
  videoEmpty: { fontFamily: MONO, fontSize: 12, color: RC.ghost },

  subHead: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1.5,
    color: RC.faint,
    textTransform: 'uppercase',
    paddingBottom: 9,
    marginBottom: 16,
    borderBottomWidth: HL.strong,
    borderBottomColor: RC.lineStrong,
  },
  bodyText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: RC.text,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: HL.faint,
    borderTopColor: RC.lineFaint,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
    color: RC.text,
  },
  catObs: {
    fontSize: 13,
    color: RC.muted,
    lineHeight: 19,
    marginTop: 3,
  },
  dirGlyph: {
    fontSize: 18,
    marginTop: 1,
  },

  // Report-Picker-Modal
  modalHint: {
    fontSize: 13.5,
    color: RC.muted,
    paddingHorizontal: RS.screenH,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontFamily: MONO, fontSize: 13, color: RC.faint },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: HL.std,
    borderTopColor: RC.line,
  },
  reportRowFirst: {
    borderTopWidth: 0,
  },
  reportIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: RC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportDate: {
    fontFamily: MONO_MED,
    fontSize: 14,
    color: RC.text,
  },
  reportScore: {
    fontFamily: MONO,
    fontSize: 12,
    color: RC.muted,
    marginTop: 3,
  },
});
