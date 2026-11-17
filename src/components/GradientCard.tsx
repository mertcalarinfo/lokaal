import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from './theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  mode?: 'light' | 'dark';
};

export default function GradientCard({ children, style, mode }: Props) {
  const c = useColors(mode);
  return (
    <View style={[{
      borderRadius: 20,
      backgroundColor: c.cardBot,
      shadowColor: c.shadowColor,
      shadowOpacity: c.shadowOpacity,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 8,
    }, style]}>
      <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.cardLine }}>
        <LinearGradient colors={[c.cardTop, c.cardBot]} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['transparent', c.cardEdge, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 1 }}
        />
        {children}
      </View>
    </View>
  );
}
