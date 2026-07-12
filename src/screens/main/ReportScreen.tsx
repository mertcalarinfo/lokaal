import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal,
  Pressable, LayoutAnimation, Platform, UIManager, Share, Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Share2, CheckCircle2, ArrowRight, ChevronDown, Pencil, Play, X } from 'lucide-react-native';

import { HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { saveReport, uploadVideo, updateReportName } from '../../services/storage';
import PressableScale from '../../components/PressableScale';
import RadarChart, { RadarCategory } from '../../components/RadarChart';
import RichText from '../../components/RichText';
import RenameModal from '../../components/RenameModal';
import ProLock from '../../components/ProLock';
import { useSubscription } from '../../hooks/useSubscription';
import { RC, MONO, MONO_MED, RS, BTN_SHADOW, HL, RR } from '../../theme/register';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ReportRoute = RouteProp<HomeStackParamList, 'Report'>;
type ReportNav   = NativeStackNavigationProp<HomeStackParamList, 'Report'>;

// Free-Nutzer sehen genau diese 3 Kategorien voll — fix, unabhängig von Reihenfolge/Score.
// Gemini gibt den "name" IMMER auf Englisch zurück (Prompt verbietet Übersetzung dieses
// Feldes explizit), daher reichen die englischen Schlüssel — unabhängig von der UI-/Analyse-Sprache.
const FREE_CATEGORY_NAMES = ['Filler Words', 'Speaking Pace', 'Eye Contact'];

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function formatDateShort(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function score100(s: number): number {
  return Math.round(s * 10);
}

// ─── Sub-Komponenten ──────────────────────────────────────────────────────────

interface LegendRowProps {
  num: string;
  label: string;
  value: number;
  isFocus: boolean;
  isLast: boolean;
  feedback: string;
}

function LegendRow({ num, label, value, isFocus, isLast, feedback }: LegendRowProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rowStyle = [
    S.legendRow,
    isFocus && S.legendRowFocus,
    isLast  && S.legendRowLast,
  ];
  const textColor = isFocus ? RC.accent : RC.text;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <Pressable onPress={toggle} style={rowStyle}>
      <View style={S.legendRowMain}>
        <Text style={[S.legendNum, { color: isFocus ? RC.accent : RC.ghost }]}>{num}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[S.legendLabel, { color: textColor, fontFamily: isFocus ? MONO_MED : MONO }]}>{label}</Text>
          {isFocus && <Text style={S.focusTag}>{t('report.focusTag').toUpperCase()}</Text>}
        </View>
        <Text style={[S.legendVal, { color: textColor }]}>{value}</Text>
        <View style={S.legendChevronCol}>
          <ChevronDown
            size={14}
            color={isFocus ? RC.accent : RC.ghost}
            strokeWidth={1.8}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </View>
      </View>
      {open && feedback ? (
        <RichText text={feedback} style={[S.legendFeedback, isFocus && { color: RC.text }]} />
      ) : null}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const ReportScreen: React.FC = () => {
  const { t }      = useTranslation();
  const navigation = useNavigation<ReportNav>();
  const route      = useRoute<ReportRoute>();
  const { user }   = useAuth();
  const { isPro }  = useSubscription(user?.uid || null);
  const { report, saved, returnTo } = route.params;

  const goPaywall = () => navigation.navigate('Paywall');

  // Free: nur die 3 fixen Kategorien werden überhaupt konstruiert — die anderen 6
  // existieren für Free-Nutzer an keiner Stelle in der JSX (Werte, Radar, Achsen).
  const visibleCategories = isPro
    ? report.categories
    : report.categories.filter((c) => FREE_CATEGORY_NAMES.includes(c.name));
  const lockedCount = report.categories.length - visibleCategories.length;

  const [isSaved,       setIsSaved]       = useState(!!saved);
  const [savingLoading, setSavingLoading] = useState(false);
  const [uploadPct,     setUploadPct]     = useState(0);
  const [customName,    setCustomName]    = useState(report.customName ?? '');
  const [renameVisible, setRenameVisible] = useState(false);
  const [videoVisible,  setVideoVisible]  = useState(false);

  const hasVideo = !!report.videoUrl && report.videoUrl.length > 0;

  const handleBack = useCallback(() => {
    if (returnTo === 'progress') {
      (navigation as any).getParent()?.navigate('ProgressTab');
    } else {
      navigation.goBack();
    }
  }, [navigation, returnTo]);

  const handleRename = useCallback(async (value: string) => {
    setCustomName(value);
    try {
      await updateReportName(report.id, value);
    } catch (err: any) {
      console.warn('[ReportScreen] Failed to rename report:', err?.message);
    }
  }, [report.id]);

  // ── Abgeleitete Daten ─────────────────────────────────────────────────────────
  const totalScore  = score100(report.averageScore);
  const dateLabel   = formatDateShort(report.createdAt);

  // Radar + Fokus basieren NUR auf den sichtbaren Kategorien — bei Free entsteht so
  // ein echtes 3-Achsen-Dreieck, die 6 gesperrten Achsen werden nie gezeichnet.
  const radarCategories = useMemo<RadarCategory[]>(() =>
    visibleCategories.map((c) => ({
      label: t(`report.radarLabels.${c.name}`, { defaultValue: c.name.toUpperCase().slice(0, 12) }),
      value: score100(c.score),
    })),
  [visibleCategories, t]);

  const focusIndex = useMemo(() =>
    radarCategories.reduce((minIdx, c, i) =>
      c.value < radarCategories[minIdx].value ? i : minIdx, 0),
  [radarCategories]);

  // Eine Legenden-Zeile rendern — Nummerierung läuft sequentiell über die sichtbare Menge.
  const renderLegendRow = (cat: typeof report.categories[number], i: number, isLast: boolean) => {
    const val      = score100(cat.score);
    const label    = t(`report.categoryNames.${cat.name}`, { defaultValue: cat.name }).toUpperCase();
    const num      = String(i + 1).padStart(2, '0');
    const feedback = [...cat.observations, ...cat.tips].filter(Boolean).join('\n');
    return (
      <LegendRow
        key={`${cat.name}-${i}`}
        num={num}
        label={label}
        value={val}
        isFocus={i === focusIndex}
        isLast={isLast}
        feedback={feedback}
      />
    );
  };

  // ── Handlers (unverändert) ─────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSavingLoading(true);
    setUploadPct(0);
    const userId = user?.uid || report.userId;
    let resolvedVideoUrl = report.videoUrl;

    const isLocalUri =
      resolvedVideoUrl &&
      (resolvedVideoUrl.startsWith('file://') || resolvedVideoUrl.startsWith('content://'));

    if (isLocalUri) {
      try {
        resolvedVideoUrl = await uploadVideo(resolvedVideoUrl, userId, (pct) =>
          setUploadPct(pct)
        );
      } catch (uploadErr: any) {
        console.warn('[ReportScreen] Video upload failed:', uploadErr?.message);
        resolvedVideoUrl = '';
        Alert.alert(t('common.error'), t('report.videoUploadFailed'), [{ text: t('common.ok') }]);
      }
    }

    try {
      await saveReport({ ...report, userId, videoUrl: resolvedVideoUrl });
      setIsSaved(true);
      Alert.alert(t('common.ok'), t('report.saved'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('common.error'));
    } finally {
      setSavingLoading(false);
      setUploadPct(0);
    }
  }, [report, user?.uid, t]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: t('report.shareText', {
          date: dateLabel,
          score: report.averageScore,
          summary: report.summary,
        }),
      });
    } catch { /* ignore */ }
  }, [report, dateLabel, t]);

  // ── JSX ────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe} edges={['top', 'left', 'right']}>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* ── AKTENKOPF ── */}
        <View style={S.head}>
          <PressableScale onPress={handleBack} style={S.backBtn}>
            <ArrowLeft size={16} color={RC.text} strokeWidth={1.8} />
          </PressableScale>
          <View style={S.headRight}>
            <PressableScale onPress={() => setRenameVisible(true)} style={S.shareBtn}>
              <Pencil size={14} color={RC.muted} strokeWidth={1.7} />
            </PressableScale>
            <Text style={S.headMeta}>{dateLabel}</Text>
            <PressableScale onPress={handleShare} style={S.shareBtn}>
              <Share2 size={14} color={RC.muted} strokeWidth={1.7} />
            </PressableScale>
          </View>
        </View>

        {customName ? (
          <View style={S.subSection}>
            <Text style={S.customName} numberOfLines={1}>{customName}</Text>
          </View>
        ) : null}

        <View style={{ height: RS.gap12 }} />

        {/* ── SCORE-BLOCK ── */}
        <View style={S.scoreBlock}>
          <View style={S.scoreLeft}>
            <Text style={S.scoreNum} allowFontScaling={false}>{totalScore}</Text>
            <Text style={S.scoreUnit}>/100</Text>
          </View>
          {hasVideo && (
            <PressableScale onPress={() => setVideoVisible(true)}>
              <View style={S.videoThumb}>
                <View style={S.videoPlayBadge}>
                  <Play size={16} color={RC.onAccent} strokeWidth={2} fill={RC.onAccent} />
                </View>
                <Text style={S.videoThumbLabel}>{t('report.recording').toUpperCase()}</Text>
              </View>
            </PressableScale>
          )}
        </View>

        <View style={{ height: 6 }} />

        {/* ── RADAR ── */}
        <View style={S.radarWrap}>
          <RadarChart key={report.id} categories={radarCategories} focusIndex={focusIndex} />
        </View>

        <View style={{ height: 6 }} />

        {/* ── LEGENDE ── */}
        <View style={S.legend}>
          {/* Kopfzeile */}
          <View style={S.legendHead}>
            <Text style={[S.legendHeadTxt, { width: 16 }]}>N°</Text>
            <Text style={[S.legendHeadTxt, { flex: 1 }]}>KATEGORIE</Text>
            <Text style={[S.legendHeadTxt, { width: 30, textAlign: 'right' }]}>WERT</Text>
            <View style={S.legendChevronCol} />
          </View>

          {/* Sichtbare Kategorien — Free: nur die 3 fixen, Pro: alle 9. Die gesperrten
              6 werden für Free an keiner Stelle gerendert (kein Wert, kein Text). */}
          {visibleCategories.map((cat, i) =>
            renderLegendRow(cat, i, isPro && i === visibleCategories.length - 1))}

          {/* Ein einziger Sperr-Block ersetzt alle gesperrten Kategorien — keine echten Daten dahinter */}
          {!isPro && lockedCount > 0 && (
            <ProLock
              onUnlock={goPaywall}
              message={t('report.lockedCategoriesMessage', { count: lockedCount })}
              height={170}
              lines={3}
              style={S.legendRowLast}
            />
          )}
        </View>

        <View style={{ height: 28 }} />

        {/* ── ZUSAMMENFASSUNG ── (für Free komplett gesperrt, nicht gerendert) */}
        <View style={S.subSection}>
          <Text style={S.subHead}>{t('report.summaryHead').toUpperCase()}</Text>
          {isPro ? (
            <RichText text={report.summary} style={S.summaryText} />
          ) : (
            <ProLock onUnlock={goPaywall} height={160} lines={2} />
          )}
        </View>

        <View style={{ height: 28 }} />

        {/* ── ÜBUNGEN DIESE WOCHE ── (für Free komplett gesperrt, nicht gerendert) */}
        <View style={S.subSection}>
          <Text style={S.subHead}>{t('report.exercises').toUpperCase()}</Text>
          {isPro ? (
            report.exercises.map((ex, i) => (
              <View key={i} style={S.exerciseRow}>
                <View style={S.exerciseBadge}>
                  <Text style={S.exerciseBadgeNum}>{i + 1}</Text>
                </View>
                <RichText text={ex} style={S.exerciseText} />
              </View>
            ))
          ) : (
            <ProLock onUnlock={goPaywall} height={160} lines={3} />
          )}
        </View>

        <View style={{ height: 28 }} />

        {/* ── AKTIONEN ── */}
        <View style={S.actions}>
          {/* Gespeichert-Zeile */}
          {isSaved && (
            <View style={S.savedRow}>
              <CheckCircle2 size={13} color={RC.text} strokeWidth={2} />
              <Text style={S.savedTxt}>{t('report.saved').toUpperCase()}</Text>
            </View>
          )}

          {/* Speichern-Button (Primär, Kobalt) */}
          {!isSaved && (
            <PressableScale onPress={handleSave} disabled={savingLoading} style={{ marginBottom: 12 }}>
              <View style={[S.btnPrimary, BTN_SHADOW, savingLoading && { opacity: 0.7 }]}>
                <View style={S.btnLeft}>
                  <View style={S.btnDot} />
                  <Text style={S.btnLabelPrimary}>
                    {savingLoading && uploadPct > 0 && uploadPct < 100
                      ? t('report.savingUpload', { pct: uploadPct })
                      : t('report.saveReport').toUpperCase()}
                  </Text>
                </View>
                <ArrowRight size={16} color={RC.onAccent} strokeWidth={1.8} />
              </View>
            </PressableScale>
          )}

          {/* Neue Analyse (Sekundär) */}
          <PressableScale onPress={() => navigation.navigate('Home')}>
            <View style={S.btnSecondary}>
              <Text style={S.btnLabelSecondary}>
                {t('report.newAnalysis').toUpperCase()}
              </Text>
            </View>
          </PressableScale>
        </View>

        <View style={{ height: RS.btnBottom }} />

      </ScrollView>

      <RenameModal
        visible={renameVisible}
        initialValue={customName}
        placeholder={t('report.renamePlaceholder')}
        title={t('report.renameTitle').toUpperCase()}
        onClose={() => setRenameVisible(false)}
        onSave={handleRename}
      />

      {/* ── Vollbild-Video-Player ── */}
      <Modal
        visible={videoVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setVideoVisible(false)}
      >
        <View style={S.videoOverlay}>
          <PressableScale style={S.videoClose} onPress={() => setVideoVisible(false)}>
            <X size={22} color={RC.onAccent} strokeWidth={2} />
          </PressableScale>
          {hasVideo && (
            <Video
              source={{ uri: report.videoUrl }}
              style={S.videoFull}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ReportScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: RC.bg },
  scroll: { flexGrow: 1 },

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
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customName: {
    fontSize: 16,
    fontWeight: '600',
    color: RC.text,
    marginTop: 14,
  },
  headRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headMeta: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1,
    color: RC.muted,
  },
  shareBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Score-Block
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: RS.screenH,
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  videoThumb: {
    width: 58,
    height: 84,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: RC.line,
    backgroundColor: RC.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  videoPlayBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: RC.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbLabel: {
    fontFamily: MONO,
    fontSize: 7.5,
    letterSpacing: 0.8,
    color: RC.muted,
  },
  videoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,18,15,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoClose: {
    position: 'absolute',
    top: 56,
    right: 22,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  videoFull: {
    width: '100%',
    height: '78%',
  },
  scoreNum: {
    fontSize: 52,
    fontWeight: '600',
    // lineHeight must be >= fontSize, otherwise iOS clips the top of the glyphs
    // (the number appeared cut off at the top). Android tolerated the tight value.
    lineHeight: 58,
    letterSpacing: -2.5,
    color: RC.text,
    includeFontPadding: false,
  },
  scoreUnit: {
    fontFamily: MONO,
    fontSize: 16,
    letterSpacing: 1,
    color: RC.muted,
  },
  scoreVerdict: {
    fontSize: 12,
    lineHeight: 17,
    color: RC.text,
    marginTop: 5,
  },

  // Radar
  radarWrap: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },

  // Legende
  legend: {
    paddingHorizontal: RS.screenH,
  },
  legendHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(33,31,27,0.2)',
  },
  legendHeadTxt: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1,
    color: RC.faint,
  },
  legendRow: {
    paddingVertical: 16,
    borderTopWidth: HL.faint,
    borderTopColor: RC.lineFaint,
  },
  legendRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendRowFocus: {
    backgroundColor: RC.accentWash,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderTopColor: RC.accentLine,
  },
  legendRowLast: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(33,31,27,0.2)',
  },
  legendNum: {
    fontFamily: MONO,
    fontSize: 11,
    width: 16,
  },
  legendLabel: {
    fontFamily: MONO,
    fontSize: 13,
  },
  focusTag: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1,
    color: RC.accent,
    marginTop: 3,
  },
  legendVal: {
    fontFamily: MONO,
    fontSize: 13,
    width: 30,
    textAlign: 'right',
  },
  legendChevronCol: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendFeedback: {
    fontSize: 13.5,
    lineHeight: 21,
    color: RC.muted,
    marginTop: 12,
    paddingRight: 18,
  },

  // Zusammenfassung / Übungen
  subSection: {
    paddingHorizontal: RS.screenH,
  },
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
  summaryText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: RC.text,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: HL.faint,
    borderTopColor: RC.lineFaint,
  },
  exerciseBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: RC.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  exerciseBadgeNum: {
    fontFamily: MONO_MED,
    fontSize: 12,
    color: RC.text,
  },
  exerciseText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: RC.text,
  },

  // Aktionen
  actions: {
    paddingHorizontal: RS.screenH,
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

  // Primary Button
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: RC.accent,
    borderRadius: RR.button,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  btnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    letterSpacing: 2,
    color: RC.onAccent,
  },

  // Secondary Button
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: RC.lineStrong,
    borderRadius: RR.button,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  btnLabelSecondary: {
    fontFamily: MONO_MED,
    fontSize: 13,
    letterSpacing: 2,
    color: RC.text,
  },
});
