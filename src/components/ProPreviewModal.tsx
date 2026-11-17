import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../theme';
import Button from './Button';
import { CheckIcon } from './Icons';

interface ProPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

const ProPreviewModal: React.FC<ProPreviewModalProps> = ({ visible, onClose, onUnlock }) => {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const { t } = useTranslation();

  const features = t('pro.previewFeatures', { returnObjects: true }) as string[];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={S.backdrop} onPress={onClose}>
        {/* Innerer Pressable schluckt Taps, damit die Karte nicht bei Selbst-Tap schließt */}
        <Pressable style={S.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={S.scrollBody}
            bounces={false}
          >
            <Text style={S.title}>{t('pro.previewTitle')}</Text>
            <Text style={S.intro}>{t('pro.previewIntro')}</Text>

            <View style={S.divider} />

            <View style={S.featureList}>
              {(Array.isArray(features) ? features : []).map((f, i) => (
                <View key={i} style={S.featureRow}>
                  <CheckIcon size={18} color={T.accent} />
                  <Text style={S.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={S.footer}>
            <Button label={t('pro.unlockButton')} onPress={onUnlock} fullWidth />
            <Button label={t('pro.previewLater')} variant="ghost" onPress={onClose} fullWidth />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ProPreviewModal;

const createStyles = (T: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: T.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SP.screen,
  },
  card: {
    width: '100%',
    maxHeight: '86%',
    backgroundColor: T.card,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: T.cardBorder,
    boxShadow: T.shadowCard,
    overflow: 'hidden',
  },
  scrollBody:  { paddingHorizontal: 22, paddingTop: 24 },
  title:       { fontFamily: F.medium, fontSize: 28, lineHeight: 34, letterSpacing: -0.7, color: T.text },
  intro:       { ...TY.body, color: T.textSecondary, marginTop: 6 },
  divider:     { height: 1, backgroundColor: T.hairline, marginVertical: 16 },
  featureList: { gap: 12, paddingBottom: 8 },
  featureRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureText: { flex: 1, ...TY.bodySm, fontFamily: F.medium, color: T.text },
  footer:      { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 12, gap: 2 },
});
