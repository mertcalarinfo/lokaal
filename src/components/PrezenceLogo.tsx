import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';

interface PrezenceLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  style?: ViewStyle;
  layout?: 'horizontal' | 'vertical';
}

const PrezenceLogo: React.FC<PrezenceLogoProps> = ({
  size = 'md',
  showTagline = false,
  style,
  layout = 'vertical',
}) => {
  const imgSizes = { sm: 32, md: 56, lg: 80 };
  const textSizes = { sm: 16, md: 24, lg: 34 };
  const imgSize = imgSizes[size];
  const textSize = textSizes[size];

  const isHorizontal = layout === 'horizontal';

  return (
    <View style={[isHorizontal ? styles.horizontal : styles.vertical, style]}>
      <Image
        source={require('../../assets/logo.png')}
        style={[
          styles.logoImage,
          { width: imgSize, height: imgSize },
          isHorizontal && { marginRight: 10, marginBottom: 0 },
        ]}
        resizeMode="contain"
      />
      <View>
        <Text style={[styles.wordmark, { fontSize: textSize, letterSpacing: textSize * 0.18 }]}>
          PREZENCE
        </Text>
        {showTagline && (
          <Text style={styles.tagline}>Your AI Communication Coach</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  vertical: {
    alignItems: 'center',
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    marginBottom: 12,
  },
  wordmark: {
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 12,
    color: '#4a5568',
    marginTop: 4,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default PrezenceLogo;
