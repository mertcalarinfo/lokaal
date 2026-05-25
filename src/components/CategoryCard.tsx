import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CategoryResult } from '../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  surface: '#0d1b2e',
  surfaceElevated: '#111d30',
  primary: '#3B7FE8',
  accent: '#FF6B6B',
  success: '#4ECDC4',
  warning: '#FFD93D',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.35)',
  border: 'rgba(59,127,232,0.3)',
};

const getScoreColor = (score: number): string => {
  if (score >= 9) return COLORS.primary;
  if (score >= 7) return COLORS.success;
  if (score >= 4) return COLORS.warning;
  return COLORS.accent;
};

const getScoreBarWidth = (score: number): string => {
  return `${(score / 10) * 100}%`;
};

interface CategoryCardProps {
  category: CategoryResult;
  index: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, index }) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  const scoreColor = getScoreColor(category.score);

  const translatedName = t(`report.categoryNames.${category.name}`, {
    defaultValue: category.name,
  });

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={styles.categoryName}>{translatedName}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {category.score}
            <Text style={styles.outOf}>/10</Text>
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.textMuted}
            style={{ marginLeft: 8 }}
          />
        </View>
      </TouchableOpacity>

      {/* Score bar */}
      <View style={styles.scoreBarTrack}>
        <View
          style={[
            styles.scoreBarFill,
            { width: getScoreBarWidth(category.score) as any, backgroundColor: scoreColor },
          ]}
        />
      </View>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Observations */}
          {category.observations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('report.observations')}</Text>
              {category.observations.map((obs, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={[styles.bullet, { backgroundColor: COLORS.textMuted }]} />
                  <Text style={styles.bulletText}>{obs}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tips */}
          {category.tips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('report.tips')}</Text>
              {category.tips.map((tip, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons
                    name="flash"
                    size={14}
                    color={COLORS.primary}
                    style={{ marginTop: 2, marginRight: 8 }}
                  />
                  <Text style={styles.bulletText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  indexText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginRight: 12,
    fontVariant: ['tabular-nums'],
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    fontFamily: 'DMSans_700Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
  },
  outOf: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  scoreBarTrack: {
    height: 3,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
    borderRadius: 2,
  },
  scoreBarFill: {
    height: 3,
    borderRadius: 2,
  },
  expandedContent: {
    padding: 16,
    paddingTop: 12,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 5,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
  },
});

export default CategoryCard;
