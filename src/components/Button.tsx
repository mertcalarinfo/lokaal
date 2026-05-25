import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';

const COLORS = {
  primary: '#3B7FE8',
  primaryLight: '#5B9AFF',
  background: '#0a1628',
  surface: '#0d1b2e',
  surfaceElevated: '#111d30',
  border: 'rgba(59,127,232,0.3)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  accent: '#FF6B6B',
};

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
  const isDisabled = disabled || loading;

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    const sizeStyles: Record<string, ViewStyle> = {
      sm: { paddingHorizontal: 16, paddingVertical: 8, minHeight: 36 },
      md: { paddingHorizontal: 24, paddingVertical: 14, minHeight: 48 },
      lg: { paddingHorizontal: 32, paddingVertical: 18, minHeight: 56 },
    };

    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: isDisabled ? '#1e3a6e' : COLORS.primary,
      },
      secondary: {
        backgroundColor: isDisabled ? '#0a1628' : COLORS.background,
        borderWidth: 1.5,
        borderColor: isDisabled ? 'rgba(59,127,232,0.15)' : COLORS.primary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: isDisabled ? COLORS.border : COLORS.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      danger: {
        backgroundColor: isDisabled ? '#662020' : COLORS.accent,
      },
    };

    return {
      ...base,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth ? { width: '100%' } : {}),
      ...(isDisabled ? { opacity: 0.6 } : {}),
    };
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
      letterSpacing: 0.3,
      fontFamily: 'DMSans_700Bold',
    };

    const sizeTextStyles: Record<string, TextStyle> = {
      sm: { fontSize: 13 },
      md: { fontSize: 15 },
      lg: { fontSize: 17 },
    };

    const variantTextStyles: Record<ButtonVariant, TextStyle> = {
      primary: { color: COLORS.textPrimary },
      secondary: { color: isDisabled ? COLORS.textSecondary : COLORS.primary },
      outline: { color: isDisabled ? COLORS.textSecondary : COLORS.primary },
      ghost: { color: isDisabled ? COLORS.textSecondary : COLORS.primary },
      danger: { color: COLORS.textPrimary },
    };

    return {
      ...base,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
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
          color={variant === 'primary' || variant === 'danger' ? COLORS.textPrimary : COLORS.primary}
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text style={[getTextStyle(), textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
};

export default Button;
