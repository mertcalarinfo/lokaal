import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { F, R } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  size = 'md',
}) => {
  const { T } = useTheme();
  const isDisabled = disabled || loading;

  const getContainerStyle = (): ViewStyle => {
    // Padding scales with size; font stays 14/700/UPPER/ls .14em per spec.
    const sizeStyles: Record<string, ViewStyle> = {
      sm: { paddingHorizontal: 16, paddingVertical: 9,  minHeight: 36 },
      md: { paddingHorizontal: 22, paddingVertical: 13, minHeight: 48 },
      lg: { paddingHorizontal: 26, paddingVertical: 17, minHeight: 54 },
    };

    const variantBg: Record<ButtonVariant, ViewStyle> = {
      // Primary: --text surface, dark label (Design System spec)
      primary:   { backgroundColor: isDisabled ? T.textFaint : T.text },
      // Secondary: --surface-2 + hairline border
      secondary: { backgroundColor: T.surface2, borderWidth: 1, borderColor: T.hairline },
      // Outline / Ghost: transparent + hairline
      outline:   { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.hairline },
      ghost:     { backgroundColor: 'transparent' },
      // Danger: error surface
      danger:    { backgroundColor: isDisabled ? T.errorBg : T.error },
    };

    return {
      borderRadius: R.sm,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      ...sizeStyles[size],
      ...variantBg[variant],
      ...(fullWidth ? { width: '100%' } : {}),
      ...(isDisabled ? { opacity: 0.45 } : {}),
    };
  };

  const getTextStyle = (): TextStyle => {
    const variantTextColor: Record<ButtonVariant, string> = {
      // Primary: T.btnFg = dark on warm-white (dark) / off-white on navy (light)
      primary:   isDisabled ? T.textMuted : T.btnFg,
      secondary: T.text,
      outline:   T.text,
      ghost:     T.textMuted,
      danger:    '#101A28',
    };

    return {
      fontFamily:    F.bold,
      fontSize:      14,
      fontWeight:    '700',
      letterSpacing: 1.96,           // 0.14em of 14px
      textTransform: 'uppercase',
      color:         variantTextColor[variant],
    };
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#101A28' : T.textMuted}
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text style={[getTextStyle(), textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
};

export default Button;
