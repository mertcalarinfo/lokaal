import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C, F } from '../theme';

// Design system rule: score color is ALWAYS --accent (#E2D3B0).
// No colour-coding per value (no red/green). No gradient.

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  labelText?: string;
  animate?: boolean;
}

const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size        = 120,
  strokeWidth = 10,
  showLabel   = true,
  labelText,
  animate     = true,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius        = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore  = Math.min(10, Math.max(0, score));
  const fillPercent   = clampedScore / 10;

  useEffect(() => {
    if (animate) {
      Animated.timing(animatedValue, {
        toValue:         fillPercent,
        duration:        1200,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(fillPercent);
    }
  }, [fillPercent, animate]);

  const staticOffset = circumference * (1 - fillPercent);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track — --hairline */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={C.hairline}
          strokeWidth={strokeWidth}
        />
        {/* Fill — always --accent */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={C.accent}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={staticOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.scoreText, { fontSize: size * 0.22 }]}>
            {clampedScore % 1 === 0
              ? clampedScore.toFixed(0)
              : clampedScore.toFixed(1)}
          </Text>
          {labelText ? (
            <Text style={[styles.subText, { fontSize: size * 0.1 }]}>{labelText}</Text>
          ) : (
            <Text style={[styles.subText, { fontSize: size * 0.1 }]}>/10</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position:        'absolute',
    alignItems:      'center',
    justifyContent:  'center',
  },
  scoreText: {
    fontFamily:    F.xBold,
    fontWeight:    '800',
    letterSpacing: -1,
    color:         C.accent,
  },
  subText: {
    fontFamily: F.regular,
    fontWeight: '400',
    color:      C.textMuted,
    marginTop:  2,
  },
});

export default ScoreRing;
