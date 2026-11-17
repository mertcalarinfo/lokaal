import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import PressableScale from './PressableScale';
import { RC, MONO, MONO_MED, BTN_SHADOW, RR } from '../theme/register';

/**
 * ProLock — ERSETZT gesperrten Inhalt, überlagert ihn nicht.
 *
 * Diese Komponente bekommt NIE echte Daten übergeben. Aufrufer entscheiden per
 * Ternary (`isPro ? <EchterInhalt/> : <ProLock onUnlock={...} />`), sodass die
 * gesperrten Werte/Texte für Free-Nutzer gar nicht erst in JSX konstruiert werden.
 * Was hier sichtbar ist, ist ausschließlich ein dekorativer Platzhalter
 * (keine echten Werte) + Blur + das Schloss-Element.
 */
interface ProLockProps {
  onUnlock: () => void;
  /** Abweichender Hinweistext (Standard: „Mit Pro verfügbar"). */
  message?: string;
  /** Höhe der dekorativen Platzhalterfläche dahinter. */
  height?: number;
  /** Anzahl der dekorativen Skeleton-Linien (rein optisch, keine echten Daten). */
  lines?: number;
  style?: StyleProp<ViewStyle>;
}

const ProLock: React.FC<ProLockProps> = ({ onUnlock, message, height = 160, lines = 3, style }) => {
  const { t } = useTranslation();

  return (
    <View style={[S.wrap, { minHeight: height }, style]}>
      {/* Rein dekorativer Platzhalter — KEINE echten Werte/Texte */}
      <View style={S.placeholder} pointerEvents="none">
        {Array.from({ length: lines }, (_, i) => (
          <View key={i} style={S.placeholderLine} />
        ))}
      </View>

      {/* Blur liegt nur über dem Platzhalter, nicht über echtem Inhalt */}
      <BlurView intensity={22} tint="light" style={StyleSheet.absoluteFill} />

      {/* Sperr-Element */}
      <View style={S.overlay} pointerEvents="box-none">
        <View style={S.lockCircle}>
          <Lock size={20} color={RC.accent} strokeWidth={2} />
        </View>
        <Text style={S.message}>{message ?? t('pro.lockTitle')}</Text>
        <PressableScale onPress={onUnlock}>
          <View style={[S.btn, BTN_SHADOW]}>
            <Text style={S.btnLabel}>{t('pro.unlockButton')}</Text>
          </View>
        </PressableScale>
      </View>
    </View>
  );
};

export default ProLock;

const S = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  placeholderLine: {
    height: 14,
    borderRadius: 3,
    backgroundColor: RC.lineFaint,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  lockCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: RC.accentWash,
    borderWidth: 1.5,
    borderColor: RC.accentLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontFamily: MONO,
    fontSize: 13,
    letterSpacing: 0.5,
    color: RC.text,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: RC.accent,
    borderRadius: RR.button,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  btnLabel: {
    fontFamily: MONO_MED,
    fontSize: 13,
    letterSpacing: 1,
    color: RC.onAccent,
  },
});
