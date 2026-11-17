import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LockOpen, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../theme';
import Button from './Button';

export type ProNoticeKind = 'success' | 'invalid' | 'used' | 'network';

interface ProUnlockedModalProps {
  kind: ProNoticeKind | null;
  onClose: () => void;
}

const ProUnlockedModal: React.FC<ProUnlockedModalProps> = ({ kind, onClose }) => {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
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
                <LockOpen size={26} color={T.accentText} strokeWidth={1.8} />
              </View>
              <Text style={S.title}>{t('pro.unlockedTitle')}</Text>
              <Text style={S.body}>{t('pro.unlockedBody')}</Text>
            </>
          ) : (
            <>
              <View style={S.iconCircleError}>
                <AlertCircle size={24} color={T.textSecondary} strokeWidth={1.8} />
              </View>
              <Text style={S.bodyError}>{errorText}</Text>
            </>
          )}

          <View style={{ height: 24 }} />

          <Button label={isSuccess ? t('pro.unlockedCta') : t('common.ok')} onPress={onClose} fullWidth />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ProUnlockedModal;

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
    backgroundColor: T.card,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: T.cardBorder,
    boxShadow: T.shadowCard,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
  },
  iconCircle: {
    width: 52, height: 52, borderRadius: R.tile, backgroundColor: T.accentTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  iconCircleError: {
    width: 52, height: 52, borderRadius: R.tile, backgroundColor: T.disabledBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title:     { fontFamily: F.medium, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: T.text, textAlign: 'center' },
  body:      { ...TY.body, color: T.textSecondary, textAlign: 'center', marginTop: 6 },
  bodyError: { ...TY.body, color: T.text, textAlign: 'center' },
});
