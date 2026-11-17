import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Pressable3D from './Pressable3D';
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
    <Pressable3D
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={style}
    >
      <Glass radius={R.buttonSm} shadow="sm" interactive style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        {/* In einer View, damit das Icon sicher über der Glasschicht liegt */}
        <View pointerEvents="none">
          {icon === 'close' ? <CloseIcon color={T.text} /> : <ChevronLeft color={T.text} />}
        </View>
      </Glass>
    </Pressable3D>
  );
};

export default GlassIconButton;
