import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import PressableScale from './PressableScale';
import { RC, MONO_MED, RR } from '../theme/register';

interface RenameModalProps {
  visible: boolean;
  initialValue: string;
  placeholder: string;
  title: string;
  onClose: () => void;
  onSave: (value: string) => void;
}

const RenameModal: React.FC<RenameModalProps> = ({
  visible, initialValue, placeholder, title, onClose, onSave,
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const handleSave = () => {
    const trimmed = value.trim();
    onSave(trimmed);
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
          <TextInput
            style={S.input}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={RC.ghost}
            autoFocus
            maxLength={60}
          />
          <View style={S.row}>
            <PressableScale onPress={onClose} style={{ flex: 1 }}>
              <View style={S.btnSecondary}>
                <Text style={S.btnLabelSecondary}>{t('common.cancel').toUpperCase()}</Text>
              </View>
            </PressableScale>
            <PressableScale onPress={handleSave} style={{ flex: 1 }}>
              <View style={S.btnPrimary}>
                <Text style={S.btnLabelPrimary}>{t('common.save').toUpperCase()}</Text>
              </View>
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RenameModal;

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(33,31,27,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: RC.bg,
    borderRadius: 18,
    padding: 22,
  },
  title: {
    fontFamily: MONO_MED,
    fontSize: 12,
    letterSpacing: 1.5,
    color: RC.faint,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  input: {
    fontSize: 16,
    color: RC.text,
    borderBottomWidth: 1.5,
    borderBottomColor: RC.lineStrong,
    paddingBottom: 10,
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: RC.accent,
    borderRadius: RR.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnLabelPrimary: {
    fontFamily: MONO_MED,
    fontSize: 12,
    letterSpacing: 1,
    color: RC.onAccent,
  },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: RC.lineStrong,
    borderRadius: RR.button,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnLabelSecondary: {
    fontFamily: MONO_MED,
    fontSize: 12,
    letterSpacing: 1,
    color: RC.text,
  },
});
