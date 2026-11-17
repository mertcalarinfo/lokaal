import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Pressable3D from './Pressable3D';
import { R } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Standard 18, Nutzungskarte 16, Umschalter 14 */
  radius?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * Feste, deckende Inhaltskarte (Entwurf 5): card-Fläche, 1-px-Rand cardBorder,
 * Kartenschatten. Mit onPress wird sie tippbar (leichtes Eindrücken).
 */
const Card: React.FC<CardProps> = ({ children, style, radius = R.card, onPress, accessibilityLabel }) => {
  const { T } = useTheme();
  const base: ViewStyle = {
    backgroundColor: T.card,
    borderRadius:    radius,
    borderWidth:     1,
    borderColor:     T.cardBorder,
    boxShadow:       T.shadowCard,
  };
  if (onPress) {
    return (
      <Pressable3D onPress={onPress} accessibilityLabel={accessibilityLabel} style={[base, style]}>
        {children}
      </Pressable3D>
    );
  }
  return <View style={[base, style]}>{children}</View>;
};

export default Card;

/** Icon-Kachel 40–44, Radius 12, accentTint. */
export const IconTile: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 44, children }) => {
  const { T } = useTheme();
  return (
    <View
      style={{
        width: size, height: size, borderRadius: R.tile,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: T.accentTint,
      }}
    >
      {children}
    </View>
  );
};
