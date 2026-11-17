import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { AnalysisReport } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { getUserReports } from '../../services/storage';
import { useTabBarSpace } from '../../navigation/tabBarSpace';
import AmbientBackground from '../../components/AmbientBackground';
import Card from '../../components/Card';
import Button from '../../components/Button';
import GlassIconButton from '../../components/GlassIconButton';
import { CheckIcon } from '../../components/Icons';
import {
  AnalysisRow, ListCard, RowDivider, score100, formatShortDate, sortReports, buildUntitledMap,
} from '../../components/HistoryRows';
import { ThemeColors, F, R, S as SP, TY } from '../../theme';

/**
 * Volle Analysen-Liste (aus dem Verlauf über "Alle {n}").
 * Enthält den Zahlenvergleich zweier Analysen ("Vergleichen"), der früher
 * direkt auf der Verlauf-Übersicht lag.
 */
const AnalysesListScreen: React.FC = () => {
  const { t }      = useTranslation();
  const tabSpace   = useTabBarSpace();
  const navigation = useNavigation<any>();
  const { T }      = useTheme();
  const st         = useMemo(() => createStyles(T), [T]);
  const { user }   = useAuth();

  const [reports,   setReports]   = useState<AnalysisReport[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selected,  setSelected]  = useState<string[]>([]);
  const [showTable, setShowTable] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!user?.uid) { setLoading(false); return; }
    getUserReports(user.uid)
      .then(setReports)
      .catch((err) => console.warn('Failed to fetch reports:', err))
      .finally(() => setLoading(false));
  }, [user?.uid]));

  const sorted   = useMemo(() => sortReports(reports), [reports]);
  const untitled = useMemo(() => buildUntitledMap(sorted), [sorted]);
  const nameOf   = (r: AnalysisReport) => r.customName || `${t('progress.untitled')} ${untitled[r.id]}`;

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2)  return [prev[1], id];
      return [...prev, id];
    });
  };

  // Sobald zwei gewählt sind → Gegenüberstellung öffnen
  useEffect(() => {
    if (selecting && selected.length === 2) setShowTable(true);
  }, [selecting, selected]);

  // Älter links, neuer rechts
  const pair = selected
    .map((id) => reports.find((r) => r.id === id))
    .filter(Boolean)
    .sort((a, b) => new Date(a!.createdAt).getTime() - new Date(b!.createdAt).getTime()) as AnalysisReport[];

  const closeTable = () => { setShowTable(false); setSelected([]); };

  return (
    <View style={st.root}>
      <AmbientBackground animated={false} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={st.head}>
          <GlassIconButton icon="back" onPress={() => navigation.goBack()} accessibilityLabel={t('progress.back')} />
          {sorted.length >= 2 && (
            <Button
              label={selecting ? t('common.cancel') : t('progress.compareButton')}
              variant={selecting ? 'secondary' : 'primary'}
              size="sm"
              onPress={() => { setSelecting((v) => !v); setSelected([]); }}
            />
          )}
        </View>

        <ScrollView contentContainerStyle={[st.scroll, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
          <View style={st.hero}>
            <Text style={st.label}>{t('progress.historyTitle')}</Text>
            <Text style={st.title} accessibilityRole="header">{t('progress.allTitle')}</Text>
            {selecting && <Text style={st.hint}>{t('progress.selectTwo')}</Text>}
          </View>

          {loading ? (
            <ActivityIndicator color={T.accent} style={{ marginTop: 24 }} />
          ) : (
            <ListCard label={`${t('progress.analysesHead')} · ${sorted.length}`}>
              {sorted.map((r, i) => {
                const next = sorted[i + 1];
                const isSel = selected.includes(r.id);
                return (
                  <React.Fragment key={r.id}>
                    {i > 0 && <RowDivider />}
                    <AnalysisRow
                      name={nameOf(r)}
                      date={formatShortDate(r.createdAt)}
                      score={score100(r.averageScore)}
                      delta={next ? score100(r.averageScore) - score100(next.averageScore) : null}
                      onPress={() =>
                        selecting
                          ? toggle(r.id)
                          : navigation.navigate('HomeTab', { screen: 'Report', params: { report: r, saved: true, returnTo: 'progress' } })
                      }
                      trailing={selecting ? (
                        <View style={[st.radio, isSel && { backgroundColor: T.accent, borderColor: T.accent }]}>
                          {isSel && <CheckIcon size={13} color={T.onAccent} strokeWidth={2.6} />}
                        </View>
                      ) : undefined}
                    />
                  </React.Fragment>
                );
              })}
            </ListCard>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Gegenüberstellung zweier Analysen (Zahlen je Kategorie) */}
      <Modal visible={showTable && pair.length === 2} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeTable}>
        <View style={st.root}>
          <AmbientBackground animated={false} />
          {pair.length === 2 && (
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
              <View style={st.head}>
                <GlassIconButton icon="close" onPress={closeTable} accessibilityLabel={t('common.close')} />
              </View>
              <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
                <View style={st.hero}>
                  <Text style={st.label}>{t('progress.compareButton')}</Text>
                  <Text style={st.title} accessibilityRole="header">{t('progress.compareTitle')}</Text>
                </View>
                <Card style={st.table}>
                  <View style={st.tRow}>
                    <View style={{ flex: 1 }} />
                    {pair.map((r) => (
                      <View key={r.id} style={st.tHeadCell}>
                        <Text style={st.tDate} numberOfLines={1}>{formatShortDate(r.createdAt)}</Text>
                        <Text style={st.tScore}>{score100(r.averageScore)}</Text>
                      </View>
                    ))}
                  </View>
                  {pair[0].categories.map((cat, i) => {
                    const a = score100(pair[0].categories[i]?.score ?? 0);
                    const b = score100(pair[1].categories[i]?.score ?? 0);
                    const d = b - a;
                    return (
                      <View key={cat.name} style={[st.tRow, st.tBody]}>
                        <Text style={st.tCat} numberOfLines={2}>
                          {t(`report.categoryNames.${cat.name}`, { defaultValue: cat.name })}
                        </Text>
                        <Text style={st.tVal}>{a}</Text>
                        <View style={st.tValWrap}>
                          <Text style={st.tVal}>{b}</Text>
                          {d !== 0 && (
                            <Text style={[st.tDiff, { color: d > 0 ? T.accentText : T.textSecondary }]}>
                              {d > 0 ? `↑ ${d}` : `↓ ${Math.abs(d)}`}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </Card>
                <Button label={t('progress.compareClose')} variant="secondary" onPress={closeTable} fullWidth />
              </ScrollView>
            </SafeAreaView>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default AnalysesListScreen;

const createStyles = (T: ThemeColors) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.bg },
  head:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SP.screen, paddingTop: SP.top, paddingBottom: 4, minHeight: 44,
  },
  scroll: { paddingHorizontal: SP.screen, paddingTop: 8, paddingBottom: 40, gap: 12 },
  hero:   { gap: 4 },
  label:  { ...TY.label, color: T.textSecondary },
  title:  { ...TY.pageTitle, color: T.text },
  hint:   { ...TY.caption, color: T.textSecondary, marginTop: 4 },
  radio:  {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: T.textSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  table:     { paddingHorizontal: 18, paddingVertical: 8 },
  tRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  tBody:     { borderTopWidth: 1, borderTopColor: T.hairline, paddingVertical: 8 },
  tHeadCell: { width: 72, alignItems: 'flex-end', paddingVertical: 8 },
  tDate:     { fontFamily: F.regular, fontSize: 12, color: T.textSecondary, fontVariant: ['tabular-nums'] },
  tScore:    { fontFamily: F.light, fontSize: 28, letterSpacing: -1, color: T.text, fontVariant: ['tabular-nums'] },
  tCat:      { flex: 1, fontFamily: F.medium, fontSize: 14, color: T.text },
  tVal:      { width: 72, textAlign: 'right', fontFamily: F.medium, fontSize: 16, color: T.text, fontVariant: ['tabular-nums'] },
  tValWrap:  { width: 72, alignItems: 'flex-end' },
  tDiff:     { fontFamily: F.semiBold, fontSize: 12, fontVariant: ['tabular-nums'] },
});
