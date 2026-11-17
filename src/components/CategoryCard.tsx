import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Zap } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { CategoryResult } from '../types';
import RichText from './RichText';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeColors, F, S } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CategoryCardProps {
  category: CategoryResult;
  index: number;
}

const createStyles = (T: ThemeColors) => StyleSheet.create({
  card: {
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  header: {
    flexDirection:    'row',
    alignItems:       'baseline',
    gap:              12,
    paddingVertical:  15,
    paddingHorizontal: 2,
  },
  index: {
    fontFamily: F.monoMd,
    fontSize:   11,
    color:      T.textFaint,
    width:      20,
  },
  name: {
    fontFamily: F.semiBold,
    fontSize:   15,
    fontWeight: '600',
    color:      T.text,
    flex:       1,
  },
  score: {
    fontFamily:   F.xBold,
    fontSize:     18,
    fontWeight:   '800',
    color:        T.accent,
    letterSpacing: -0.36,
    fontVariant:  ['tabular-nums'],
  },
  outOf: {
    fontFamily: F.regular,
    fontSize:   11,
    fontWeight: '400',
    color:      T.textMuted,
  },
  chev: {
    marginLeft: 4,
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    ...Platform.select({
      ios: { shadowColor: 'rgba(230,212,168,0.5)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
      android: { elevation: 2 },
    }),
  },
  expanded: {
    paddingHorizontal: 2,
    paddingTop:        12,
    paddingBottom:     16,
  },
  block: {
    marginBottom: 14,
  },
  blockLabel: {
    fontFamily:    F.semiBold,
    fontSize:      10,
    fontWeight:    '600',
    color:         T.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom:  10,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom:  8,
    alignItems:    'flex-start',
  },
  bullet: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: T.textFaint,
    marginTop:       5,
    marginRight:     10,
    flexShrink:      0,
  },
  zapIcon: {
    marginTop:   2,
    marginRight: 8,
    flexShrink:  0,
  },
  bulletText: {
    flex:       1,
    fontFamily: F.regular,
    fontSize:   13,
    color:      T.textMuted,
    lineHeight: 20,
  },
});

const CategoryCard: React.FC<CategoryCardProps> = ({ category, index }) => {
  const { T } = useTheme();
  const styles = useMemo(() => createStyles(T), [T]);
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  const enterOpacity = useSharedValue(0);
  const enterY       = useSharedValue(12);
  useEffect(() => {
    const delay = 700 + index * 55;
    enterOpacity.value = withDelay(delay, withTiming(1, { duration: 380 }));
    enterY.value       = withDelay(delay, withTiming(0, { duration: 380 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const enterStyle = useAnimatedStyle(() => ({
    opacity:   enterOpacity.value,
    transform: [{ translateY: enterY.value }],
  }));

  const [trackWidth, setTrackWidth] = useState(0);
  const barWidth = useSharedValue(0);
  useEffect(() => {
    if (trackWidth <= 0) return;
    const target = (category.score / 10) * trackWidth;
    barWidth.value = withDelay(700 + index * 55, withTiming(target, {
      duration: 900,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackWidth, category.score]);
  const barAnimStyle = useAnimatedStyle(() => ({ width: barWidth.value }));

  const chevronAngle = useSharedValue(0);
  const chevronAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronAngle.value}deg` }],
  }));

  const translatedName = t(`report.categoryNames.${category.name}`, {
    defaultValue: category.name,
  });

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    chevronAngle.value = withTiming(next ? 180 : 0, { duration: 280 });
  };

  return (
    <Animated.View style={[styles.card, enterStyle]}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
        <Text style={styles.name}>{translatedName}</Text>
        <Text style={styles.score}>
          {category.score}
          <Text style={styles.outOf}>/10</Text>
        </Text>
        <Animated.View style={[styles.chev, chevronAnimStyle]}>
          <ChevronDown size={16} color={T.textFaint} strokeWidth={1.7} />
        </Animated.View>
      </TouchableOpacity>

      {/* Score bar — animated gradient */}
      <View
        style={styles.barTrack}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View style={barAnimStyle}>
          <LinearGradient
            colors={[T.accentDeep, T.accent] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.barFill}
          />
        </Animated.View>
      </View>

      {expanded && (
        <View style={styles.expanded}>
          {category.observations.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.blockLabel}>{t('report.observations')}</Text>
              {category.observations.map((obs, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bullet} />
                  <RichText text={obs} style={styles.bulletText} />
                </View>
              ))}
            </View>
          )}
          {category.tips.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.blockLabel}>{t('report.tips')}</Text>
              {category.tips.map((tip, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Zap size={13} color={T.accent} strokeWidth={1.7} style={styles.zapIcon} />
                  <RichText text={tip} style={styles.bulletText} />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
};

export default CategoryCard;
