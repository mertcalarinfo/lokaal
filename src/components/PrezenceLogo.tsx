import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F } from '../theme';

interface PrezenceLogoProps {
  size?:        'sm' | 'md' | 'lg';
  showTagline?: boolean;
  style?:       ViewStyle;
  /** Kept for API-Kompatibilität — visuelle Ausrichtung folgt dem Bild-Lockup */
  layout?:      'horizontal' | 'vertical';
}

const createStyles = (T: ThemeColors) => StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontFamily:    F.regular,
    fontSize:      12,
    color:         T.textFaint,
    marginTop:     4,
    letterSpacing: 0.3,
    textAlign:     'center',
  },
});

// Höhe und proportionale Breite für das horizontale Lockup-Bild
// PNG-Aspect-Ratio: 501 × 168 ≈ 2.98 : 1 (transparente PNGs)
const SIZES: Record<'sm' | 'md' | 'lg', { height: number; width: number }> = {
  sm: { height: 44, width: 131 },   // Header — 44 × 2.98 ≈ 131, Ratio exakt
  md: { height: 44, width: 131 },   // Auth-Screens, Paywall
  lg: { height: 56, width: 167 },   // Login-Hero — 56 × 2.98 ≈ 167
};

const PrezenceLogo: React.FC<PrezenceLogoProps> = ({
  size        = 'md',
  showTagline = false,
  style,
}) => {
  const { T, isDark } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);

  const { height, width } = SIZES[size];

  // Automatische Theme-Wahl:
  //   Dark  → warmweißes Logo auf dunklem Hintergrund
  //   Light → navyfarbenes Logo auf hellem Hintergrund
  const logoSource = isDark
    ? require('../../assets/branding/logo-full-darkmode.png')
    : require('../../assets/branding/logo-full-lightmode.png');

  return (
    <View style={[styles.wrapper, style]}>
      <Image
        source={logoSource}
        style={{ height, width }}
        resizeMode="contain"
      />
      {showTagline && (
        <Text style={styles.tagline}>Your AI Communication Coach</Text>
      )}
    </View>
  );
};

export default PrezenceLogo;
