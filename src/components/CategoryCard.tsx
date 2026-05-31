import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { CategoryResult } from '../types';
import RichText from './RichText';
import { C, F, S } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CategoryCardProps {
  category: CategoryResult;
  index: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, index }) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  const translatedName = t(`report.categoryNames.${category.name}`, {
    defaultValue: category.name,
  });

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  const barWidth = `${(category.score / 10) * 100}%`;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
        <Text style={styles.name}>{translatedName}</Text>
        <Text style={styles.score}>
          {category.score}
          <Text style={styles.outOf}>/10</Text>
        </Text>
        {expanded
          ? <ChevronUp   size={16} color={C.textFaint} strokeWidth={1.7} style={styles.chev} />
          : <ChevronDown size={16} color={C.textFaint} strokeWidth={1.7} style={styles.chev} />
        }
      </TouchableOpacity>

      {/* Score bar — 2px track, 4px fill, --accent */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: barWidth as any }]} />
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
                  <Zap size={13} color={C.accent} strokeWidth={1.7} style={styles.zapIcon} />
                  <RichText text={tip} style={styles.bulletText} />
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
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'baseline',
    gap:            12,
    paddingVertical: 15,
    paddingHorizontal: 2,
  },
  index: {
    fontFamily: F.monoMd,
    fontSize:   11,
    color:      C.textFaint,
    width:      20,
  },
  name: {
    fontFamily: F.semiBold,
    fontSize:   15,
    fontWeight: '600',
    color:      C.text,
    flex:       1,
  },
  score: {
    fontFamily:    F.xBold,
    fontSize:      18,
    fontWeight:    '800',
    color:         C.accent,
    letterSpacing: -0.36,
  },
  outOf: {
    fontFamily: F.regular,
    fontSize:   11,
    fontWeight: '400',
    color:      C.textMuted,
  },
  chev: {
    marginLeft: 4,
  },
  barTrack: {
    height:          2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginHorizontal: 2,
  },
  barFill: {
    height:          4,
    marginTop:       -1,
    backgroundColor: C.accent,
    borderRadius:    2,
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
    color:         C.textMuted,
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
    width:        5,
    height:       5,
    borderRadius: 3,
    backgroundColor: C.textFaint,
    marginTop:    5,
    marginRight:  10,
    flexShrink:   0,
  },
  zapIcon: {
    marginTop:  2,
    marginRight: 8,
    flexShrink:  0,
  },
  bulletText: {
    flex:       1,
    fontFamily: F.regular,
    fontSize:   13,
    color:      C.textMuted,
    lineHeight: 20,
  },
});

export default CategoryCard;
