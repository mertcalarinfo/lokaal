import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Glass from './Glass';
import { ChevronLeft, CloseIcon } from './Icons';
import { R } from '../theme';

/**
 * Runder Overlay-Button aus Glas, 44 × 44, Radius 12 (Schließen / Zurück).
 */
const GlassIconButton: React.FC<{
  icon: 'close' | 'back';
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}> = ({ icon, onPress, accessibilityLabel, style }) => {
  const { T } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Glass radius={R.buttonSm} shadow="sm" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        {icon === 'close' ? <CloseIcon color={T.text} /> : <ChevronLeft color={T.text} />}
      </Glass>
    </Pressable>
  );
};

export default GlassIconButton;
