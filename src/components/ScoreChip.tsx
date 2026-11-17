import React from 'react';
import { View, Text } from 'react-native';
import { useColors } from './theme';

export default function ScoreChip({ value, mode }: { value: number; mode?: 'light' | 'dark' }) {
  const c = useColors(mode);
  const high = value >= 6;
  return (
    <View style={{
      width: 30, height: 28, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1,
      borderColor: high ? c.accentGlow : c.line,
    }}>
      <Text style={{
        fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'],
        color: high ? c.accent : c.muted,
      }}>
        {value}
      </Text>
    </View>
  );
}
