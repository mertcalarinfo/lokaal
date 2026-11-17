import React from 'react';
import { View, Image, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const P_LOGO   = require('../../assets/branding/p-logo.png');          // 700 × 581, freigestellt, Blau
const WORDMARK = require('../../assets/branding/wordmark-rezence.png'); // 326 × 45, weiß → per tintColor eingefärbt

const P_RATIO  = 700 / 581;
const WM_RATIO = 326 / 45;

interface PrezenceLogoProps {
  /** lockup: P + Wortmarke "REZENCE" (Kopf) · mark: nur das P */
  variant?: 'lockup' | 'mark';
  /** Höhe des P in pt. Standard: 35 (Kopf), Paywall 96. */
  height?: number;
  /** Kompatibilität: lg = etwas größeres Lockup */
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

/**
 * Prezence-Logo (Entwurf 5): das blaue P bleibt unverändert, die echte
 * Wortmarke wird in der Textfarbe des aktiven Modus eingefärbt.
 * Maße laut Vorlage: P 42 × 35, Wortmarke 4 pt rechts daneben, 6 pt tiefer.
 */
const PrezenceLogo: React.FC<PrezenceLogoProps> = ({ variant = 'lockup', height, size, style }) => {
  const { T } = useTheme();
  const pH = height ?? (size === 'lg' ? 46 : 35);
  const pW = Math.round(pH * P_RATIO);

  if (variant === 'mark') {
    return (
      <View style={style} accessible accessibilityRole="image" accessibilityLabel="Prezence">
        <Image source={P_LOGO} style={{ width: pW, height: pH }} resizeMode="contain" />
      </View>
    );
  }

  // Versalhöhe ≈ 13-pt-Schrift der Vorlage
  const wmH = Math.round(pH * (10 / 35) * 10) / 10;
  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, height: Math.max(44, pH) }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Prezence"
    >
      <Image source={P_LOGO} style={{ width: pW, height: pH }} resizeMode="contain" />
      <Image
        source={WORDMARK}
        style={{ width: wmH * WM_RATIO, height: wmH, marginTop: Math.round(pH * 6 / 35), tintColor: T.text }}
        resizeMode="contain"
      />
    </View>
  );
};

export default PrezenceLogo;
