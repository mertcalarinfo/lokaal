import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';

import { OnboardingAnswers } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/Button';
import { ThemeColors, F, R, S } from '../../theme';

// Lucide icons for option cards
import {
  Briefcase, BarChart2, Camera, Users, TrendingUp, MoreHorizontal,
  Leaf, Award, MessageSquare, ListOrdered, Flame, Gauge, Sparkles,
  Activity, Scale, Heart, Zap, CheckCircle2,
} from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');

type StepKey = keyof OnboardingAnswers;

interface StepConfig {
  key:      StepKey;
  i18nKey:  string;
  options:  { value: string; Icon: any }[];
}

const STEPS: StepConfig[] = [
  {
    key: 'purpose', i18nKey: 'purpose',
    options: [
      { value: 'job_interview',         Icon: Briefcase      },
      { value: 'business_presentation', Icon: BarChart2      },
      { value: 'content_creation',      Icon: Camera         },
      { value: 'public_speaking',       Icon: Users          },
      { value: 'personal_improvement',  Icon: TrendingUp     },
      { value: 'other',                 Icon: MoreHorizontal },
    ],
  },
  {
    key: 'experienceLevel', i18nKey: 'experience',
    options: [
      { value: 'beginner',     Icon: Leaf      },
      { value: 'intermediate', Icon: TrendingUp },
      { value: 'advanced',     Icon: Award     },
    ],
  },
  {
    key: 'biggestChallenge', i18nKey: 'challenge',
    options: [
      { value: 'nervousness', Icon: Activity      },
      { value: 'structure',   Icon: ListOrdered   },
      { value: 'engagement',  Icon: Users         },
      { value: 'clarity',     Icon: MessageSquare },
      { value: 'confidence',  Icon: Flame         },
    ],
  },
  {
    key: 'focusArea', i18nKey: 'focus',
    options: [
      { value: 'filler_words',  Icon: MessageSquare },
      { value: 'body_language', Icon: Users         },
      { value: 'confidence',    Icon: Flame         },
      { value: 'speaking_pace', Icon: Gauge         },
      { value: 'everything',    Icon: Sparkles      },
    ],
  },
  {
    key: 'feedbackStyle', i18nKey: 'feedback',
    options: [
      { value: 'gentle',   Icon: Heart },
      { value: 'balanced', Icon: Scale },
      { value: 'direct',   Icon: Zap   },
    ],
  },
];

const DEFAULTS: OnboardingAnswers = {
  purpose: 'personal_improvement',
  experienceLevel: 'beginner',
  biggestChallenge: 'nervousness',
  focusArea: 'everything',
  feedbackStyle: 'balanced',
};

const createStyles = (T: ThemeColors) => StyleSheet.create({
  safe:      { flex: 1, backgroundColor: T.bg },
  container: { flex: 1, paddingHorizontal: S.screen, paddingVertical: S.s4 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: S.s4,
  },
  backBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepIndicator: { fontFamily: F.monoMd, fontSize: 12, color: T.textFaint, letterSpacing: 0.3 },
  progressTrack: {
    height: 2, backgroundColor: T.line, borderRadius: 2,
    marginBottom: S.s6, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: T.accent, borderRadius: 2 },
  animated:     { flex: 1 },
  stepContent:  { flex: 1 },
  stepTitle: {
    fontFamily: F.xBold, fontSize: 24, fontWeight: '800',
    color: T.text, marginBottom: 6, lineHeight: 30, letterSpacing: -0.48,
  },
  stepSub: {
    fontFamily: F.regular, fontSize: 14.5, color: T.textMuted,
    marginBottom: S.s5, lineHeight: 21,
  },
  optionsScroll: { flex: 1 },
  option: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface, borderRadius: R.md,
    padding: S.s4, marginBottom: S.s2,
    borderWidth: 1.5, borderColor: T.hairline,
  },
  optionActive:  { borderColor: T.accent, backgroundColor: T.surfaceAccent },
  optionIcon:    { marginRight: S.s3, flexShrink: 0 },
  optionLabel:   { flex: 1, fontFamily: F.medium, fontSize: 15, fontWeight: '500', color: T.text },
  footer:        { paddingBottom: S.s2, paddingTop: S.s4 },
});

const OnboardingScreen: React.FC = () => {
  const { t }          = useTranslation();
  const navigation     = useNavigation<any>();
  const route          = useRoute<any>();
  const { user, completeOnboarding, saveOnboardingAnswers } = useAuth();
  const { T }          = useTheme();
  const styles         = useMemo(() => createStyles(T), [T]);

  const mode     = route.params?.mode;
  const videoUri = route.params?.videoUri;
  const isEdit   = mode === 'edit';
  const isIntro  = !videoUri && !isEdit;

  const [step,      setStep]      = useState(0);
  const [answers,   setAnswers]   = useState<Partial<OnboardingAnswers>>(user?.onboardingAnswers || {});
  const [isLoading, setIsLoading] = useState(false);
  const tx = useRef(new Animated.Value(0)).current;

  const total   = STEPS.length;
  const current = STEPS[step];
  const selected = answers[current.key];

  const animateStep = (dir: 'forward' | 'back') => {
    const to = dir === 'forward' ? -SW : SW;
    Animated.sequence([
      Animated.timing(tx, { toValue: to,                              duration: 200, useNativeDriver: true }),
      Animated.timing(tx, { toValue: dir === 'forward' ? SW : -SW,   duration: 0,   useNativeDriver: true }),
      Animated.timing(tx, { toValue: 0,                               duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const finish = async (final: OnboardingAnswers) => {
    if (isIntro) {
      setIsLoading(true);
      try { await completeOnboarding(final); } finally { setIsLoading(false); }
    } else if (isEdit) {
      setIsLoading(true);
      try { await saveOnboardingAnswers(final); } finally { setIsLoading(false); }
      navigation.goBack();
    } else {
      saveOnboardingAnswers(final).catch(() => {});
      navigation.navigate('AnalysisLoading', { videoUri, answers: final });
    }
  };

  const handleNext = () => {
    if (step < total - 1) { animateStep('forward'); setTimeout(() => setStep((s) => s + 1), 200); }
    else finish({ ...DEFAULTS, ...answers } as OnboardingAnswers);
  };

  const handleBack = () => {
    if (step > 0) { animateStep('back'); setTimeout(() => setStep((s) => s - 1), 200); }
    else if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <ChevronLeft size={22} color={T.textMuted} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>
            {t('onboarding.steps.stepOf', { current: step + 1, total })}
          </Text>
          <View style={styles.backBtn} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / total) * 100}%` }]} />
        </View>

        {/* Step content */}
        <Animated.View style={[styles.animated, { transform: [{ translateX: tx }] }]}>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {t(`onboarding.steps.${current.i18nKey}.title`)}
            </Text>
            <Text style={styles.stepSub}>
              {t(`onboarding.steps.${current.i18nKey}.subtitle`)}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsScroll}>
              {current.options.map(({ value, Icon }) => {
                const active = selected === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => setAnswers((p) => ({ ...p, [current.key]: value }))}
                    activeOpacity={0.8}
                  >
                    <Icon size={20} color={active ? T.accent : T.textFaint} strokeWidth={1.7} style={styles.optionIcon} />
                    <Text style={[styles.optionLabel, active && { color: T.accent }]}>
                      {t(`onboarding.steps.${current.i18nKey}.options.${value}`)}
                    </Text>
                    {active && <CheckCircle2 size={17} color={T.accent} strokeWidth={1.7} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            label={step === total - 1 ? t('common.done') : t('common.next')}
            onPress={handleNext}
            disabled={!selected || isLoading}
            loading={isLoading}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
