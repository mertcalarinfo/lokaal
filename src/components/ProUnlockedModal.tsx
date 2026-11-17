import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LockOpen, AlertCircle } from 'lucide-react-native';
import { RC, MONO, MONO_MED, RR, BTN_SHADOW, RS } from '../theme/register';
import PressableScale from './PressableScale';

export type ProNoticeKind = 'success' | 'invalid' | 'used' | 'network';

interface ProUnlockedModalProps {
  kind: ProNoticeKind | null;
  onClose: () => void;
}

const ProUnlockedModal: React.FC<ProUnlockedModalProps> = ({ kind, onClose }) => {
  const { t } = useTranslation();

  const isSuccess = kind === 'success';

  const errorText =
    kind === 'invalid' ? t('access.errorInvalid') :
    kind === 'used'    ? t('access.errorUsed')    :
                         t('access.errorGeneric');

  return (
    <Modal
      visible={kind !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={S.backdrop} onPress={onClose}>
        {/* Inner Pressable absorbs taps so the card doesn't close on self-tap */}
        <Pressable style={S.card}>
          {isSuccess ? (
            <>
              <View style={S.iconCircle}>
                <LockOpen size={26} color={RC.accent} strokeWidth={1.8} />
              </View>
              <Text style={S.title}>{t('pro.unlockedTitle').toUpperCase()}</Text>
              <Text style={S.body}>{t('pro.unlockedBody')}</Text>
            </>
          ) : (
            <>
              <View style={S.iconCircleError}>
                <AlertCircle size={24} color={RC.faint} strokeWidth={1.8} />
              </View>
              <Text style={S.bodyError}>{errorText}</Text>
            </>
          )}

          <View style={{ height: 24 }} />

          <PressableScale onPress={onClose} style={{ alignSelf: 'stretch' }}>
            <View style={[S.btn, BTN_SHADOW]}>
              <Text style={S.btnLabel}>
                {isSuccess ? t('pro.unlockedCta') : t('common.ok')}
              </Text>
            </View>
          </PressableScale>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ProUnlockedModal;

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
    backgroundColor: RC.bgElevated,
    borderRadius: 18,
    borderTopWidth: 2.5,
    borderTopColor: RC.accent,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 28,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: RC.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconCircleError: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: RC.lineFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: MONO_MED,
    fontSize: 14,
    letterSpacing: 2,
    color: RC.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: MONO,
    fontSize: 14,
    lineHeight: 22,
    color: RC.muted,
    textAlign: 'center',
  },
  bodyError: {
    fontFamily: MONO,
    fontSize: 15,
    lineHeight: 22,
    color: RC.text,
    textAlign: 'center',
  },
  btn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RC.accent,
    borderRadius: RR.button,
    paddingVertical: 16,
  },
  btnLabel: {
    fontFamily: MONO_MED,
    fontSize: 14,
    letterSpacing: 1.5,
    color: RC.onAccent,
  },
});
