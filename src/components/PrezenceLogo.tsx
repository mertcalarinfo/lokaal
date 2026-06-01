import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F } from '../theme';

interface PrezenceLogoProps {
  size?:        'sm' | 'md' | 'lg';
  showTagline?: boolean;
  style?:       ViewStyle;
  layout?:      'horizontal' | 'vertical';
}

const createStyles = (T: ThemeColors) => StyleSheet.create({
  vertical: {
    alignItems: 'center',
  },
  horizontal: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  logoImage: {
    marginBottom: 10,
  },
  // Logo im UI immer --text (warmweiß auf dunkel, Navy auf hell) — §06 DO
  wordmark: {
    fontFamily: F.xBold,
    fontWeight: '800',
    color:      T.text,
  },
  tagline: {
    fontFamily:    F.regular,
    fontSize:      12,
    color:         T.textFaint,
    marginTop:     4,
    letterSpacing: 0.3,
    textAlign:     'center',
  },
});

const PrezenceLogo: React.FC<PrezenceLogoProps> = ({
  size        = 'md',
  showTagline = false,
  style,
  layout      = 'vertical',
}) => {
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);

  const imgSizes  = { sm: 28, md: 48, lg: 72 };
  const textSizes = { sm: 14, md: 22, lg: 32 };
  const imgSize   = imgSizes[size];
  const textSize  = textSizes[size];
  const isH       = layout === 'horizontal';

  return (
    <View style={[isH ? styles.horizontal : styles.vertical, style]}>
      <Image
        source={require('../../assets/logo.png')}
        style={[
          styles.logoImage,
          { width: imgSize, height: imgSize },
          isH && { marginRight: 10, marginBottom: 0 },
        ]}
        resizeMode="contain"
      />
      <View>
        <Text
          style={[
            styles.wordmark,
            {
              fontSize:      textSize,
              letterSpacing: textSize * 0.20,
            },
          ]}
        >
          PREZENCE
        </Text>
        {showTagline && (
          <Text style={styles.tagline}>Your AI Communication Coach</Text>
        )}
      </View>
    </View>
  );
};

export default PrezenceLogo;
