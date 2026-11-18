import React from 'react';
import { View, Image, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const P_LOGO   = require('../../assets/branding/p-logo.png');          // 700 × 581, freigestellt, Blau
const WORDMARK = require('../../assets/branding/wordmark-rezence.png'); // 326 × 45, weiß → per tintColor eingefärbt

const P_RATIO  = 700 / 581;
const WM_RATIO = 326 / 45;
// Lage des Schriftzugs relativ zum P (siehe Lockup unten)
const WM_X = 0.80;
const WM_Y = 0.40;

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
 * Maße laut Vorlage: P 42 × 35; der Schriftzug schließt direkt an den P-Bauch an.
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
  const wmW = wmH * WM_RATIO;
  // Zusammenhängendes Logo: Der Schriftzug sitzt in der freien Ecke unter dem
  // P-Bauch — links bei 80 % der P-Breite (berührt den Bauchbogen fast), oben bei
  // 40 % der P-Höhe (leicht nach unten versetzt, auf Höhe des unteren Bauch-Endes).
  const boxH = Math.max(44, pH);
  const pTop = (boxH - pH) / 2;
  return (
    <View
      style={[{ width: pW * WM_X + wmW, height: boxH }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Prezence"
    >
      <Image source={P_LOGO} style={{ position: 'absolute', left: 0, top: pTop, width: pW, height: pH }} resizeMode="contain" />
      <Image
        source={WORDMARK}
        style={{ position: 'absolute', left: pW * WM_X, top: pTop + pH * WM_Y, width: wmW, height: wmH, tintColor: T.text }}
        resizeMode="contain"
      />
    </View>
  );
};

export default PrezenceLogo;
