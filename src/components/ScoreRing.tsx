import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  labelText?: string;
  animate?: boolean;
}

const getScoreColor = (score: number): { start: string; end: string } => {
  if (score >= 9) return { start: '#6C63FF', end: '#8B84FF' };
  if (score >= 7) return { start: '#4ECDC4', end: '#45B7AA' };
  if (score >= 4) return { start: '#FFD93D', end: '#FFC107' };
  return { start: '#FF6B6B', end: '#FF4444' };
};

const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  showLabel = true,
  labelText,
  animate = true,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(10, Math.max(0, score));
  const fillPercent = clampedScore / 10;

  useEffect(() => {
    if (animate) {
      Animated.timing(animatedValue, {
        toValue: fillPercent,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(fillPercent);
    }
  }, [fillPercent, animate]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - fillPercent)],
  });

  const colors = getScoreColor(clampedScore);

  // We use a fixed strokeDashoffset for the static ring since Animated.Value can't be used directly with SVG
  const staticOffset = circumference * (1 - fillPercent);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.start} />
            <Stop offset="100%" stopColor={colors.end} />
          </LinearGradient>
        </Defs>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2A2A3A"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
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
          <Text style={[styles.scoreText, { fontSize: size * 0.22, color: colors.start }]}>
            {clampedScore % 1 === 0 ? clampedScore.toFixed(0) : clampedScore.toFixed(1)}
          </Text>
          {labelText ? (
            <Text style={[styles.labelText, { fontSize: size * 0.1 }]}>{labelText}</Text>
          ) : (
            <Text style={[styles.outOf, { fontSize: size * 0.1 }]}>/10</Text>
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
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: '700',
    letterSpacing: -1,
  },
  outOf: {
    color: '#8E8EA0',
    fontWeight: '500',
    marginTop: 2,
  },
  labelText: {
    color: '#8E8EA0',
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default ScoreRing;
