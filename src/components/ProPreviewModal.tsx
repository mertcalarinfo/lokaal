import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { RC, MONO, MONO_MED, RR, BTN_SHADOW, RS } from '../theme/register';
import PressableScale from './PressableScale';

interface ProPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

const ProPreviewModal: React.FC<ProPreviewModalProps> = ({ visible, onClose, onUnlock }) => {
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
                  <View style={S.checkCircle}>
                    <Check size={13} color={RC.accent} strokeWidth={2.4} />
                  </View>
                  <Text style={S.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={S.footer}>
            <PressableScale onPress={onUnlock} style={{ alignSelf: 'stretch' }}>
              <View style={[S.btn, BTN_SHADOW]}>
                <Text style={S.btnLabel}>{t('pro.unlockButton')}</Text>
              </View>
            </PressableScale>

            <Pressable onPress={onClose} style={S.laterBtn} hitSlop={8}>
              <Text style={S.laterLabel}>{t('pro.previewLater')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ProPreviewModal;

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: RS.screenH,
  },
  card: {
    width: '100%',
    maxHeight: '86%',
    backgroundColor: RC.bgElevated,
    borderRadius: 18,
    borderTopWidth: 2.5,
    borderTopColor: RC.accent,
    overflow: 'hidden',
  },
  scrollBody: {
    paddingHorizontal: 28,
    paddingTop: 30,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: RC.accent,
  },
  intro: {
    fontFamily: MONO,
    fontSize: 15,
    lineHeight: 22,
    color: RC.muted,
    marginTop: 10,
  },
  divider: {
    height: 1.5,
    backgroundColor: RC.lineStrong,
    marginTop: 22,
    marginBottom: 6,
  },
  featureList: {
    paddingBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: RC.lineFaint,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: RC.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 14.5,
    lineHeight: 21,
    color: RC.text,
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 22,
  },
  btn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RC.accent,
    borderRadius: RR.button,
    paddingVertical: 17,
  },
  btnLabel: {
    fontFamily: MONO_MED,
    fontSize: 14,
    letterSpacing: 1.5,
    color: RC.onAccent,
  },
  laterBtn: {
    alignSelf: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  laterLabel: {
    fontFamily: MONO_MED,
    fontSize: 13,
    letterSpacing: 0.5,
    color: RC.muted,
  },
});
