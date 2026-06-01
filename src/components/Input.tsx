import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F, R } from '../theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  onRightIconPress?: () => void;
}

const createStyles = (T: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize:      10,
    fontWeight:    '600',
    fontFamily:    F.semiBold,
    color:         T.textMuted,
    letterSpacing: 2,           // 0.2em of 10px
    textTransform: 'uppercase',
    marginBottom:  8,
  },
  inputWrapper: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  T.surface,
    borderWidth:      1,
    borderColor:      T.hairline,
    borderRadius:     R.md,
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: T.accent,
  },
  inputWrapperError: {
    borderColor: T.error,
  },
  input: {
    flex:           1,
    paddingVertical: 15,
    fontSize:       15,
    fontFamily:     F.regular,
    color:          T.text,
  },
  iconButton: {
    padding:    4,
    marginLeft: 8,
  },
  errorText: {
    fontSize:   12,
    fontFamily: F.regular,
    color:      T.error,
    marginTop:  6,
    marginLeft: 4,
  },
});

const Input: React.FC<InputProps> = ({
  label,
  error,
  isPassword = false,
  containerStyle,
  onRightIconPress,
  ...textInputProps
}) => {
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused]       = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error     && styles.inputWrapperError,
        ]}
      >
        <TextInput
          {...textInputProps}
          style={styles.input}
          placeholderTextColor={T.textFaint}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => { setIsFocused(true);  textInputProps.onFocus?.(e); }}
          onBlur={(e)  => { setIsFocused(false); textInputProps.onBlur?.(e);  }}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowPassword((v) => !v)}
            activeOpacity={0.7}
          >
            {showPassword
              ? <EyeOff size={20} color={T.textMuted} strokeWidth={1.7} />
              : <Eye    size={20} color={T.textMuted} strokeWidth={1.7} />
            }
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

export default Input;
