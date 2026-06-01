import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F, R } from '../theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  transparent?: boolean;
}

const createStyles = (T: ThemeColors) => StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  overlayTransparent: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  container: {
    backgroundColor: T.surface,
    borderRadius:    R.lg,
    padding:         32,
    alignItems:      'center',
    minWidth:        120,
    borderWidth:     1,
    borderColor:     T.hairline,
  },
  message: {
    marginTop:  16,
    fontFamily: F.regular,
    fontSize:   14,
    color:      T.textMuted,
    textAlign:  'center',
    maxWidth:   200,
  },
});

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  transparent = false,
}) => {
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={[styles.overlay, transparent && styles.overlayTransparent]}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={T.accent} />
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
};

export default LoadingOverlay;
