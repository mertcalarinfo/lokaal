import React, { useMemo, useState, useRef } from 'react';
import {
  View, Text, StyleSheet,
  Animated, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

import { OnboardingAnswers } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import PressableScale from '../../components/PressableScale';
import AmbientBackground from '../../components/AmbientBackground';
import GlassIconButton from '../../components/GlassIconButton';
import Button from '../../components/Button';
import { IconTile } from '../../components/Card';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors, F, R, S as SP, TY } from '../../theme';

// Lucide icons for option cards
import {
  Briefcase, BarChart2, Camera, Users, TrendingUp, MoreHorizontal,
  Leaf, Award, MessageSquare, ListOrdered, Flame, Gauge, Sparkles,
  Activity, Scale, Heart, Zap, CheckCircle2,
} from 'lucide-react-native';

import { useTabBarSpace } from '../../navigation/tabBarSpace';
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
  container: { flex: 1 },

  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: SP.top, paddingHorizontal: SP.screen, minHeight: 44,
  },
  stepIndicator: { fontFamily: F.semiBold, fontSize: 12, color: T.textSecondary, fontVariant: ['tabular-nums'] },

  progressTrack: {
    height: 4, borderRadius: 2, backgroundColor: T.track,
    marginHorizontal: SP.screen, marginTop: 16, marginBottom: 24, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: T.accentData },
  animated:     { flex: 1 },
  stepContent:  { flex: 1, paddingHorizontal: SP.screen },
  stepTitle:    { ...TY.pageTitle, fontSize: 28, lineHeight: 34, color: T.text, marginBottom: 8 },
  stepSub:      { ...TY.body, color: T.textSecondary, marginBottom: 20 },
  optionsScroll:{ flex: 1, marginHorizontal: -4, paddingHorizontal: 4 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: T.card, borderRadius: R.card, borderWidth: 1, borderColor: T.cardBorder,
    boxShadow: T.shadowCard,
  },
  optionActive:      { borderColor: T.accent, borderWidth: 1.5 },
  optionLabel:       { flex: 1, fontFamily: F.semiBold, fontSize: 15, color: T.text },
  optionLabelActive: { color: T.text },

  footer: { paddingHorizontal: SP.screen, paddingBottom: 24, paddingTop: 12 },
});

const OnboardingScreen: React.FC = () => {
  const { T } = useTheme();
  const ST = useMemo(() => createStyles(T), [T]);
  const { t }          = useTranslation();
  const tabSpace   = useTabBarSpace(0);
  const navigation     = useNavigation<any>();
  const route          = useRoute<any>();
  const { user, completeOnboarding, saveOnboardingAnswers } = useAuth();

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

  const ctaDisabled = !selected || isLoading;

  return (
    <View style={ST.safe}>
      <AmbientBackground animated={false} />
      <SafeAreaView style={{ flex: 1, paddingBottom: tabSpace }} edges={['top', 'left', 'right']}>
      <View style={ST.container}>
        {/* Aktenkopf */}
        <View style={ST.head}>
          <GlassIconButton icon="back" onPress={handleBack} accessibilityLabel={t('progress.back')} />
          <Text style={ST.stepIndicator}>
            {t('onboarding.steps.stepOf', { current: step + 1, total })}
          </Text>
        </View>

        {/* Fortschrittsbalken */}
        <View style={ST.progressTrack}>
          <View style={[ST.progressFill, { width: `${((step + 1) / total) * 100}%` }]} />
        </View>

        {/* Step content */}
        <Animated.View style={[ST.animated, { transform: [{ translateX: tx }] }]}>
          <View style={ST.stepContent}>
            <Text style={ST.stepTitle}>
              {t(`onboarding.steps.${current.i18nKey}.title`)}
            </Text>
            <Text style={ST.stepSub}>
              {t(`onboarding.steps.${current.i18nKey}.subtitle`)}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={ST.optionsScroll} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
              {current.options.map(({ value, Icon }) => {
                const active = selected === value;
                return (
                  <PressableScale
                    key={value}
                    onPress={() => setAnswers((p) => ({ ...p, [current.key]: value }))}
                    style={[ST.option, active && ST.optionActive]}
                  >
                    <View>
                      <IconTile size={40}>
                        <Icon size={19} color={T.accentText} strokeWidth={1.7} />
                      </IconTile>
                    </View>
                      <Text style={[ST.optionLabel, active && ST.optionLabelActive]}>
                        {t(`onboarding.steps.${current.i18nKey}.options.${value}`)}
                      </Text>
                      {active && <CheckCircle2 size={20} color={T.accentText} strokeWidth={1.8} />}
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Footer */}
        <View style={ST.footer}>
          <Button
            label={step === total - 1 ? t('common.done') : t('common.next')}
            onPress={handleNext}
            disabled={ctaDisabled}
            loading={isLoading}
            fullWidth
          />
        </View>
      </View>
      </SafeAreaView>
    </View>
  );
};

export default OnboardingScreen;
