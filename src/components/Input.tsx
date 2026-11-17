import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps, ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F, R, TY } from '../theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  onRightIconPress?: () => void;
}

const createStyles = (T: ThemeColors) => StyleSheet.create({
  container: { marginBottom: 16 },
  label: { ...TY.label, color: T.textSecondary, marginBottom: 8 },
  inputWrapper: {
    flexDirection:     'row',
    alignItems:        'center',
    minHeight:         52,
    backgroundColor:   T.card,
    borderWidth:       1,
    borderColor:       T.cardBorder,
    borderRadius:      R.button,
    paddingHorizontal: 16,
  },
  inputWrapperFocused: { borderColor: T.accent },
  // Fehler ohne zweite Akzentfarbe: kräftigerer Rand in Textfarbe + Meldung darunter
  inputWrapperError:   { borderColor: T.text },
  input: {
    flex:            1,
    paddingVertical: 14,
    fontSize:        15,
    fontFamily:      F.regular,
    color:           T.text,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  errorText: { ...TY.captionSm, fontFamily: F.medium, color: T.text, marginTop: 6, marginLeft: 4 },
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
          !!error   && styles.inputWrapperError,
        ]}
      >
        <TextInput
          {...textInputProps}
          style={styles.input}
          placeholderTextColor={T.disabledText}
          selectionColor={T.accent}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => { setIsFocused(true);  textInputProps.onFocus?.(e); }}
          onBlur={(e)  => { setIsFocused(false); textInputProps.onBlur?.(e);  }}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowPassword((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            {showPassword
              ? <EyeOff size={20} color={T.textSecondary} strokeWidth={1.7} />
              : <Eye    size={20} color={T.textSecondary} strokeWidth={1.7} />}
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

export default Input;
