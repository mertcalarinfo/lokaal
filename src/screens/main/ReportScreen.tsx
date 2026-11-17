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
import { Share2, CheckCircle2, ChevronDown, Pencil, Play } from 'lucide-react-native';

import { HomeStackParamList } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { saveReport, uploadVideo, updateReportName } from '../../services/storage';
import PressableScale from '../../components/PressableScale';
import RadarChart, { RadarCategory } from '../../components/RadarChart';
import RichText from '../../components/RichText';
import RenameModal from '../../components/RenameModal';
import ProLock from '../../components/ProLock';
import AmbientBackground from '../../components/AmbientBackground';
import GlassIconButton from '../../components/GlassIconButton';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../../theme';

import { useTabBarSpace } from '../../navigation/tabBarSpace';
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
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rowStyle = [
    S.legendRow,
    isFocus && S.legendRowFocus,
    isLast  && S.legendRowLast,
  ];
  const textColor = isFocus ? T.accentText : T.text;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <Pressable onPress={toggle} style={rowStyle}>
      <View style={S.legendRowMain}>
        <Text style={[S.legendNum, { color: isFocus ? T.accentText : T.textSecondary }]}>{num}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[S.legendLabel, { color: textColor, fontFamily: isFocus ? F.medium : F.regular }]}>{label}</Text>
          {isFocus && <Text style={S.focusTag}>{t('report.focusTag').toUpperCase()}</Text>}
        </View>
        <Text style={[S.legendVal, { color: textColor }]}>{value}</Text>
        <View style={S.legendChevronCol}>
          <ChevronDown
            size={14}
            color={isFocus ? T.accentText : T.textSecondary}
            strokeWidth={1.8}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </View>
      </View>
      {open && feedback ? (
        <RichText text={feedback} style={[S.legendFeedback, isFocus && { color: T.text }]} />
      ) : null}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const ReportScreen: React.FC = () => {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const { t }      = useTranslation();
  const tabSpace   = useTabBarSpace();
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
    const label    = t(`report.categoryNames.${cat.name}`, { defaultValue: cat.name });
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
    <View style={S.safe}>
      <AmbientBackground animated={false} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={[S.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>

          {/* ── Kopf ── */}
          <View style={S.head}>
            <GlassIconButton icon="back" onPress={handleBack} accessibilityLabel={t('progress.back')} />
            <View style={S.headRight}>
              <PressableScale onPress={() => setRenameVisible(true)} style={S.shareBtn} accessibilityLabel={t('report.renameTitle')}>
                <Pencil size={18} color={T.accentText} strokeWidth={1.7} />
              </PressableScale>
              <PressableScale onPress={handleShare} style={S.shareBtn} accessibilityLabel={t('common.share', { defaultValue: 'Share' })}>
                <Share2 size={18} color={T.accentText} strokeWidth={1.7} />
              </PressableScale>
            </View>
          </View>

          {/* ── Titel ── */}
          <View style={{ gap: 4 }}>
            <Text style={S.label}>{dateLabel}</Text>
            {customName ? <Text style={S.customName} numberOfLines={2}>{customName}</Text> : null}
          </View>

          {/* ── Score ── */}
          <Card style={S.scoreBlock}>
            <View style={S.scoreLeft}>
              <Text style={S.scoreNum} allowFontScaling={false}>{totalScore}</Text>
              <Text style={S.scoreUnit}>/100</Text>
            </View>
            {hasVideo && (
              <PressableScale onPress={() => setVideoVisible(true)} accessibilityLabel={t('report.recording')}>
                <View style={S.videoThumb}>
                  <View style={S.videoPlayBadge}>
                    <Play size={14} color={T.onAccent} strokeWidth={2} fill={T.onAccent} />
                  </View>
                  <Text style={S.videoThumbLabel}>{t('report.recording')}</Text>
                </View>
              </PressableScale>
            )}
          </Card>

          {/* ── Radar + Legende ── */}
          <Card style={S.legend}>
            <View style={S.radarWrap}>
              <RadarChart key={report.id} categories={radarCategories} focusIndex={focusIndex} />
            </View>
            <View style={S.legendHead}>
              <Text style={[S.legendHeadTxt, { width: 22 }]}>N°</Text>
              <Text style={[S.legendHeadTxt, { flex: 1 }]}>{t('report.categoryHead', { defaultValue: 'Kategorie' })}</Text>
              <Text style={[S.legendHeadTxt, { width: 34, textAlign: 'right' }]}>{t('report.valueHead', { defaultValue: 'Wert' })}</Text>
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
                style={{ marginTop: 12, marginBottom: 6 }}
              />
            )}
          </Card>

          {/* ── Zusammenfassung ── (für Free komplett gesperrt, nicht gerendert) */}
          {isPro ? (
            <Card style={S.subSection}>
              <Text style={S.label}>{t('report.summaryHead')}</Text>
              <RichText text={report.summary} style={S.summaryText} />
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={S.label}>{t('report.summaryHead')}</Text>
              <ProLock onUnlock={goPaywall} height={160} lines={2} />
            </View>
          )}

          {/* ── Übungen diese Woche ── (für Free komplett gesperrt, nicht gerendert) */}
          {isPro ? (
            <Card style={S.subSection}>
              <Text style={S.label}>{t('report.exercises')}</Text>
              {report.exercises.map((ex, i) => (
                <View key={i} style={[S.exerciseRow, i > 0 && S.exerciseDivider]}>
                  <View style={S.exerciseBadge}>
                    <Text style={S.exerciseBadgeNum}>{i + 1}</Text>
                  </View>
                  <RichText text={ex} style={S.exerciseText} />
                </View>
              ))}
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={S.label}>{t('report.exercises')}</Text>
              <ProLock onUnlock={goPaywall} height={160} lines={3} />
            </View>
          )}

          {/* ── Aktionen ── */}
          <View style={S.actions}>
            {isSaved ? (
              <View style={S.savedRow}>
                <CheckCircle2 size={15} color={T.accentText} strokeWidth={2} />
                <Text style={S.savedTxt}>{t('report.saved')}</Text>
              </View>
            ) : (
              <Button
                label={savingLoading && uploadPct > 0 && uploadPct < 100
                  ? t('report.savingUpload', { pct: uploadPct })
                  : t('report.saveReport')}
                onPress={handleSave}
                loading={savingLoading}
                fullWidth
              />
            )}
            <Button
              label={t('report.newAnalysis')}
              variant="secondary"
              onPress={() => navigation.navigate('Home')}
              fullWidth
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      <RenameModal
        visible={renameVisible}
        initialValue={customName}
        placeholder={t('report.renamePlaceholder')}
        title={t('report.renameTitle')}
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
          <GlassIconButton
            icon="close"
            onPress={() => setVideoVisible(false)}
            accessibilityLabel={t('common.close')}
            style={S.videoClose}
          />
        </View>
      </Modal>
    </View>
  );
};

export default ReportScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, paddingHorizontal: SP.screen, paddingTop: SP.top, gap: 12 },

  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  shareBtn:  { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  label:     { ...TY.label, color: T.textSecondary },
  customName:{ ...TY.pageTitle, fontSize: 28, lineHeight: 34, color: T.text },

  // Score: große dünne Zahl
  scoreBlock: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 18,
  },
  scoreLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreNum:  {
    fontFamily: F.light, fontSize: 64, lineHeight: 70, letterSpacing: -2.4,
    color: T.text, fontVariant: ['tabular-nums'],
  },
  scoreUnit: { fontFamily: F.regular, fontSize: 16, color: T.textSecondary, fontVariant: ['tabular-nums'] },
  scoreVerdict: { ...TY.caption, color: T.textSecondary },

  videoThumb: {
    width: 96, height: 72, borderRadius: R.tile, backgroundColor: T.accentTint,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  videoPlayBadge: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center', paddingLeft: 2,
  },
  videoThumbLabel: { fontFamily: F.medium, fontSize: 11.5, color: T.accentText },
  videoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  videoClose:   { position: 'absolute', top: 58, right: 24, zIndex: 2 },
  videoFull:    { width: '100%', height: '78%' },

  // Radar + Legende
  radarWrap: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
  legend:    { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 4 },
  legendHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: T.hairline,
  },
  legendHeadTxt: { ...TY.label, fontSize: 10, letterSpacing: 1.6, color: T.textSecondary },
  legendRow:      { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.hairline },
  legendRowMain:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendRowFocus: {},
  legendRowLast:  { borderBottomWidth: 0 },
  legendNum:   { width: 22, fontFamily: F.medium, fontSize: 12, fontVariant: ['tabular-nums'] },
  legendLabel: { fontSize: 14.5, letterSpacing: 0.2 },
  focusTag:    { ...TY.label, fontSize: 10, letterSpacing: 1.6, color: T.accentText, marginTop: 2 },
  legendVal:   { width: 34, textAlign: 'right', fontFamily: F.medium, fontSize: 17, fontVariant: ['tabular-nums'] },
  legendChevronCol: { width: 20, alignItems: 'flex-end' },
  legendFeedback: { ...TY.bodySm, color: T.textSecondary, marginTop: 8, paddingLeft: 30 },

  // Abschnitte
  subSection:  { padding: 18, gap: 10 },
  summaryText: { ...TY.body, color: T.text },
  exerciseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  exerciseDivider: { borderTopWidth: 1, borderTopColor: T.hairline },
  exerciseBadge: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: T.accentTint,
    alignItems: 'center', justifyContent: 'center',
  },
  exerciseBadgeNum: { fontFamily: F.semiBold, fontSize: 13, color: T.accentText, fontVariant: ['tabular-nums'] },
  exerciseText: { flex: 1, ...TY.bodySm, color: T.text },

  actions:  { gap: 10, marginTop: 4 },
  savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44 },
  savedTxt: { fontFamily: F.semiBold, fontSize: 14, color: T.accentText },
});
