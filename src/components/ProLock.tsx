import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LockIcon } from './Icons';
import Button from './Button';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../theme';

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
  const { T, isDark } = useTheme();
  const S = useMemo(() => createStyles(T), [T]);
  const { t } = useTranslation();

  return (
    <View style={[S.wrap, { minHeight: height }, style]}>
      {/* Rein dekorativer Platzhalter — KEINE echten Werte/Texte */}
      <View style={S.placeholder} pointerEvents="none">
        {Array.from({ length: lines }, (_, i) => (
          <View key={i} style={[S.placeholderLine, { width: `${92 - (i % 3) * 14}%` }]} />
        ))}
      </View>

      {/* Blur liegt nur über dem Platzhalter, nicht über echtem Inhalt */}
      <BlurView intensity={22} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

      {/* Sperr-Element */}
      <View style={S.overlay} pointerEvents="box-none">
        <View style={S.lockTile}>
          <LockIcon size={20} color={T.accentText} strokeWidth={1.8} />
        </View>
        <Text style={S.message}>{message ?? t('pro.lockTitle')}</Text>
        <Button label={t('pro.unlockButton')} size="sm" onPress={onUnlock} />
      </View>
    </View>
  );
};

export default ProLock;

const createStyles = (T: ThemeColors) => StyleSheet.create({
  // Sperrblock im Kartenstil (Entwurf 5)
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: T.card,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: T.cardBorder,
  },
  placeholder: { flex: 1, justifyContent: 'center', gap: 14, paddingHorizontal: 22 },
  placeholderLine: { height: 12, borderRadius: 6, backgroundColor: T.track },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  lockTile: {
    width: 44, height: 44, borderRadius: R.tile,
    backgroundColor: T.accentTint,
    alignItems: 'center', justifyContent: 'center',
  },
  message: { ...TY.bodyMedium, color: T.text, textAlign: 'center' },
});
