import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../theme';

interface RenameModalProps {
  visible: boolean;
  initialValue: string;
  placeholder: string;
  title: string;
  onClose: () => void;
  onSave: (value: string) => void;
  /** Verdeckte Eingabe (z. B. Passwort für die Neuanmeldung) */
  secure?: boolean;
  /** Beschriftung des Bestätigen-Buttons (Standard: Speichern) */
  confirmLabel?: string;
  /** Erklärung unter dem Titel */
  message?: string;
}

const RenameModal: React.FC<RenameModalProps> = ({
  visible, initialValue, placeholder, title, onClose, onSave, secure = false, confirmLabel, message,
}) => {
  const { T } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const handleSave = () => {
    // Passwörter nicht kürzen — Leerzeichen können dazugehören
    onSave(secure ? value : value.trim());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={S.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={S.card}>
          <Text style={S.title}>{title}</Text>
          {message ? <Text style={S.message}>{message}</Text> : null}
          <TextInput
            style={S.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={T.disabledText}
            selectionColor={T.accent}
            autoFocus
            maxLength={secure ? 200 : 60}
            secureTextEntry={secure}
            autoCapitalize={secure ? 'none' : 'sentences'}
            autoCorrect={!secure}
            textContentType={secure ? 'password' : undefined}
          />
          <View style={S.row}>
            <View style={{ flex: 1 }}>
              <Button label={t('common.cancel')} variant="secondary" size="sm" onPress={onClose} fullWidth />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={confirmLabel ?? t('common.save')} size="sm" onPress={handleSave} fullWidth />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RenameModal;

const createStyles = (T: ThemeColors) => StyleSheet.create({
  overlay: {
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
    padding: 18,
  },
  title: { ...TY.label, color: T.textSecondary, marginBottom: 12 },
  message: { ...TY.bodySm, color: T.text, marginTop: -4, marginBottom: 12 },
  input: {
    fontFamily: F.regular,
    fontSize: 16,
    color: T.text,
    minHeight: 52,
    borderWidth: 1,
    borderColor: T.cardBorder,
    borderRadius: R.button,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 10 },
});
