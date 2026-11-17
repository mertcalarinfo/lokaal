import React from 'react';
import { Platform, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Glasfläche (Entwurf 5) — NUR für Navigationsleiste, Schließen-Button und
 * runde Overlay-Buttons, nie für Inhalte.
 *
 * Aufbau: Schatten außen · BlurView · Farbschicht glassBg · 1-px-Rand glassBorder ·
 * 1-px-Lichtkante oben innen. Wirkung entspricht etwa blur(28px) saturate(190%).
 * Android hat keinen echten Blur: dort deckendere Farbschicht (glassBgSolid).
 */
interface GlassProps {
  radius: number;
  style?: StyleProp<ViewStyle>;
  /** sm: kleiner Schatten (Schließen-Button) */
  shadow?: 'lg' | 'sm';
  children?: React.ReactNode;
}

const BLUR_AVAILABLE = Platform.OS === 'ios';

const Glass: React.FC<GlassProps> = ({ radius, style, shadow = 'lg', children }) => {
  const { T, isDark } = useTheme();
  return (
    <View
      style={[
        { borderRadius: radius, boxShadow: shadow === 'lg' ? T.shadowGlass : T.shadowGlassSm },
        style,
      ]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        {BLUR_AVAILABLE && (
          <BlurView
            // UltraThinMaterial bringt die iOS-Sättigung mit (≈ saturate 190 %),
            // die glassBg-Schicht darüber legt den Farbton der Vorlage fest.
            intensity={80}
            tint={isDark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius:    radius,
              backgroundColor: BLUR_AVAILABLE ? T.glassBg : T.glassBgSolid,
              borderWidth:     1,
              borderColor:     T.glassBorder,
              boxShadow:       `inset 0 1px 0 ${T.glassHighlight}`,
            },
          ]}
        />
      </View>
      {children}
    </View>
  );
};

export default Glass;
