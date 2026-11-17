import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
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

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withTiming(0.972, { duration: 140 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 140 });
  };

  const getContainerStyle = (): ViewStyle => {
    const sizeStyles: Record<string, ViewStyle> = {
      sm: { paddingHorizontal: 16, paddingVertical: 9,  minHeight: 36 },
      md: { paddingHorizontal: 22, paddingVertical: 13, minHeight: 48 },
      lg: { paddingHorizontal: 26, paddingVertical: 17, minHeight: 54 },
    };

    const variantBg: Record<ButtonVariant, ViewStyle> = {
      primary:   { backgroundColor: isDisabled ? T.textFaint : T.text },
      secondary: { backgroundColor: T.surface2, borderWidth: 1, borderColor: T.hairline },
      outline:   { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.hairline },
      ghost:     { backgroundColor: 'transparent' },
      danger:    { backgroundColor: isDisabled ? T.errorBg : T.error },
    };

    return {
      borderRadius:   R.sm,
      alignItems:     'center',
      justifyContent: 'center',
      flexDirection:  'row',
      ...sizeStyles[size],
      ...variantBg[variant],
      ...(fullWidth    ? { width: '100%' } : {}),
      ...(isDisabled   ? { opacity: 0.45 } : {}),
    };
  };

  const getTextStyle = (): TextStyle => {
    const variantTextColor: Record<ButtonVariant, string> = {
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
      letterSpacing: 1.96,
      textTransform: 'uppercase',
      color:         variantTextColor[variant],
    };
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
    >
      <Animated.View style={[getContainerStyle(), style, animStyle]}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' || variant === 'danger' ? '#101A28' : T.textMuted}
            style={{ marginRight: 8 }}
          />
        ) : null}
        <Text style={[getTextStyle(), textStyle]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

export default Button;
