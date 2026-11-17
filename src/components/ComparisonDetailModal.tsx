import React, { useMemo, useState } from 'react';
import { Modal, View, Text, ScrollView, Share, StyleSheet, Pressable } from 'react-native';
import Pressable3D from './Pressable3D';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { useTranslation } from 'react-i18next';
import { Pencil, Share2 } from 'lucide-react-native';

import { SavedComparison } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import AmbientBackground from './AmbientBackground';
import GlassIconButton from './GlassIconButton';
import Card from './Card';
import RenameModal from './RenameModal';
import { formatShortDate } from './HistoryRows';
import { ThemeColors, F, R, S as SP, TY } from '../theme';

interface Props {
  comparison: SavedComparison | null;
  onClose: () => void;
  onRename: (value: string) => void;
}

/** Detailansicht eines gespeicherten KI-Vergleichs (Inhalt unverändert, Stil Entwurf 5). */
const ComparisonDetailModal: React.FC<Props> = ({ comparison, onClose, onRename }) => {
  const { t } = useTranslation();
  const { T } = useTheme();
  const st = useMemo(() => createStyles(T), [T]);
  const [renameVisible, setRenameVisible] = useState(false);
  const c = comparison;

  return (
    <Modal visible={c !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={st.root}>
        <AmbientBackground animated={false} />
        {c && (
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
            <View style={st.head}>
              <GlassIconButton icon="close" onPress={onClose} accessibilityLabel={t('common.close')} />
              <View style={st.headRight}>
                <Pressable3D onPress={() => setRenameVisible(true)} style={st.iconBtn} accessibilityRole="button" accessibilityLabel={t('progress.renameComparisonTitle')}>
                  <Pencil size={18} color={T.accentText} strokeWidth={1.7} />
                </Pressable3D>
                <Pressable3D
                  onPress={() => Share.share({ message: `${c.result.overallChange}\n\n${c.result.coachComment}` })}
                  style={st.iconBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.share', { defaultValue: 'Share' })}
                >
                  <Share2 size={18} color={T.accentText} strokeWidth={1.7} />
                </Pressable3D>
              </View>
            </View>

            <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 4 }}>
                <Text style={st.label}>{t('progress.comparisonTitle')} · {formatShortDate(c.createdAt)}</Text>
                <Text style={st.title}>{c.customName || `${c.video1Label} → ${c.video2Label}`}</Text>
                {!!c.customName && <Text style={st.sub}>{c.video1Label} → {c.video2Label}</Text>}
              </View>

              {(c.video1Url || c.video2Url) && (
                <View style={st.videos}>
                  {[
                    { url: c.video1Url, label: c.video1Label },
                    { url: c.video2Url, label: c.video2Label },
                  ].map(({ url, label }, idx) => (
                    <View key={idx} style={{ flex: 1, gap: 6 }}>
                      <Text style={st.videoLabel} numberOfLines={1}>{label}</Text>
                      <View style={st.videoBox}>
                        {url ? (
                          <Video source={{ uri: url }} style={StyleSheet.absoluteFill} useNativeControls resizeMode={ResizeMode.CONTAIN} isLooping={false} />
                        ) : (
                          <Text style={st.sub}>—</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Card style={st.section}>
                <Text style={st.label}>{t('compare.overallLabel')}</Text>
                <Text style={st.body}>{c.result.overallChange}</Text>
              </Card>

              {c.result.categoryComparisons.length > 0 && (
                <Card style={st.section}>
                  <Text style={st.label}>{t('progress.categoriesHead')}</Text>
                  {c.result.categoryComparisons.map((item, i) => {
                    const up = item.direction === 'improved';
                    const down = item.direction === 'declined';
                    return (
                      <View key={i} style={[st.catRow, i > 0 && { borderTopWidth: 1, borderTopColor: T.hairline }]}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={st.catName}>{t(`report.categoryNames.${item.category}`, { defaultValue: item.category })}</Text>
                          {item.observation ? <Text style={st.catObs}>{item.observation}</Text> : null}
                        </View>
                        <Text style={[st.dir, { color: up ? T.accentText : T.textSecondary }]}>
                          {up ? '↑' : down ? '↓' : '→'}
                        </Text>
                      </View>
                    );
                  })}
                </Card>
              )}

              {c.result.contextResponse ? (
                <Card style={st.section}>
                  <Text style={st.label}>{t('compare.contextResponseLabel')}</Text>
                  <Text style={st.body}>{c.result.contextResponse}</Text>
                </Card>
              ) : null}

              {c.result.coachComment ? (
                <Card style={st.section}>
                  <Text style={st.label}>{t('compare.coachLabel')}</Text>
                  <Text style={st.body}>{c.result.coachComment}</Text>
                </Card>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        )}
      </View>

      <RenameModal
        visible={renameVisible}
        initialValue={c?.customName ?? ''}
        placeholder={t('progress.renameComparisonPlaceholder')}
        title={t('progress.renameComparisonTitle')}
        onClose={() => setRenameVisible(false)}
        onSave={onRename}
      />
    </Modal>
  );
};

export default ComparisonDetailModal;

const createStyles = (T: ThemeColors) => StyleSheet.create({
  root:  { flex: 1, backgroundColor: T.bg },
  head:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SP.screen, paddingTop: SP.top, paddingBottom: 8,
  },
  headRight: { flexDirection: 'row', gap: 4 },
  iconBtn:   { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll:    { paddingHorizontal: SP.screen, paddingTop: 8, paddingBottom: 40, gap: 12 },
  label:     { ...TY.label, color: T.textSecondary },
  title:     { fontFamily: F.medium, fontSize: 26, lineHeight: 32, letterSpacing: -0.6, color: T.text },
  sub:       { ...TY.caption, color: T.textSecondary },
  videos:    { flexDirection: 'row', gap: 10 },
  videoLabel:{ ...TY.captionSm, fontFamily: F.medium, color: T.textSecondary },
  videoBox:  {
    height: 180, borderRadius: R.tile, overflow: 'hidden', backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  section:   { padding: 18, gap: 8 },
  body:      { ...TY.body, color: T.text },
  catRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  catName:   { fontFamily: F.semiBold, fontSize: 14.5, color: T.text },
  catObs:    { ...TY.caption, color: T.textSecondary },
  dir:       { fontFamily: F.semiBold, fontSize: 16, width: 18, textAlign: 'right' },
});
