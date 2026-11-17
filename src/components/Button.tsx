import React from 'react';
import { View, Text, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import Pressable3D from './Pressable3D';
import { useTheme } from '../contexts/ThemeContext';
import { R, SIZE, TY } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** lg/md: Haupt-Button (56, Radius 14) · sm: kleiner Button (44, Radius 12) */
  size?: 'sm' | 'md' | 'lg';
  /** Größerer Schatten (Paywall-CTA) */
  prominent?: boolean;
}

/**
 * Button im Stil von Entwurf 5: Akzentfläche mit weißem Text, kein Gradient,
 * keine Pill-Form. Deaktiviert = disabledBg/disabledText (nicht ausgegraut per Opacity).
 */
const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  size = 'lg',
  prominent = false,
}) => {
  const { T } = useTheme();
  const isDisabled = disabled || loading;
  const small = size === 'sm';


  const container: ViewStyle = {
    height:          small ? SIZE.buttonSmH : SIZE.buttonH,
    paddingHorizontal: small ? 18 : 22,
    borderRadius:    small ? R.buttonSm : R.button,
    alignItems:      'center',
    justifyContent:  'center',
    flexDirection:   'row',
    gap:             8,
    ...(fullWidth ? { alignSelf: 'stretch' } : null),
  };

  let fg: string;
  if (isDisabled && variant === 'primary') {
    container.backgroundColor = T.disabledBg;
    fg = T.disabledText;
  } else if (variant === 'primary') {
    container.backgroundColor = T.accent;
    container.boxShadow = prominent ? T.shadowButtonLg : T.shadowButton;
    fg = T.onAccent;
  } else if (variant === 'secondary') {
    container.backgroundColor = T.card;
    container.borderWidth = 1;
    container.borderColor = T.cardBorder;
    fg = isDisabled ? T.disabledText : T.text;
  } else {
    container.backgroundColor = 'transparent';
    fg = isDisabled ? T.disabledText : T.accentText;
  }

  return (
    <Pressable3D
      onPress={onPress}
      disabled={isDisabled}
      haptic={variant === 'primary'}
      accessibilityState={{ busy: loading }}
      style={fullWidth ? { alignSelf: 'stretch' } : undefined}
    >
      <View style={[container, style]}>
        {loading ? <ActivityIndicator size="small" color={fg} /> : null}
        <Text style={[small ? TY.buttonSm : TY.button, { color: fg }, textStyle]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable3D>
  );
};

export default Button;
