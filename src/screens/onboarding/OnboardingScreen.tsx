import React, { useState, useRef } from 'react';
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
import { RC, MONO, MONO_MED, RS, BTN_SHADOW, HL, RR } from '../../theme/register';

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

const ST = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: RC.bg },
  container: { flex: 1 },

  // Aktenkopf
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: RS.headTop, paddingHorizontal: RS.screenH, paddingBottom: RS.headPadB,
    borderBottomWidth: HL.strong, borderBottomColor: RC.lineStrong,
  },
  backBtn:       { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  stepIndicator: { fontFamily: MONO, fontSize: 11, color: RC.muted, letterSpacing: 1 },

  // Fortschrittsbalken
  progressTrack: {
    height: 2, backgroundColor: RC.line,
    marginHorizontal: RS.screenH, marginTop: 16, marginBottom: 28, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: RC.accent },

  animated:     { flex: 1 },
  stepContent:  { flex: 1, paddingHorizontal: RS.screenH },
  stepTitle: {
    fontSize: 26, fontWeight: '600',
    color: RC.text, marginBottom: 8, lineHeight: 32, letterSpacing: -0.6,
  },
  stepSub: {
    fontFamily: MONO, fontSize: 14, color: RC.muted,
    marginBottom: 24, lineHeight: 21,
  },
  optionsScroll: { flex: 1 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16,
    borderTopWidth: HL.std, borderTopColor: RC.line,
  },
  optionIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: RC.line,
    alignItems: 'center', justifyContent: 'center',
  },
  optionIconCircleActive: { borderColor: RC.accent, backgroundColor: RC.accentWash },
  optionLabel:   { flex: 1, fontFamily: MONO_MED, fontSize: 15, color: RC.muted },
  optionLabelActive: { color: RC.text },

  // Footer-Button
  footer: { paddingHorizontal: RS.screenH, paddingBottom: 24, paddingTop: 16 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: RC.accent, borderRadius: RR.button,
    paddingVertical: 18, paddingHorizontal: 22,
  },
  btnDisabled: { opacity: 0.4 },
  btnLabel: { fontFamily: MONO_MED, fontSize: 15, letterSpacing: 1, color: RC.onAccent },
});

const OnboardingScreen: React.FC = () => {
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
    <SafeAreaView style={[ST.safe, { paddingBottom: tabSpace }]} edges={['top', 'left', 'right']}>
      <View style={ST.container}>
        {/* Aktenkopf */}
        <View style={ST.head}>
          <PressableScale style={ST.backBtn} onPress={handleBack}>
            <ArrowLeft size={16} color={RC.text} strokeWidth={1.8} />
          </PressableScale>
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
            <ScrollView showsVerticalScrollIndicator={false} style={ST.optionsScroll}>
              {current.options.map(({ value, Icon }) => {
                const active = selected === value;
                return (
                  <PressableScale
                    key={value}
                    onPress={() => setAnswers((p) => ({ ...p, [current.key]: value }))}
                  >
                    <View style={ST.option}>
                      <View style={[ST.optionIconCircle, active && ST.optionIconCircleActive]}>
                        <Icon size={20} color={active ? RC.accent : RC.text} strokeWidth={1.7} />
                      </View>
                      <Text style={[ST.optionLabel, active && ST.optionLabelActive]}>
                        {t(`onboarding.steps.${current.i18nKey}.options.${value}`)}
                      </Text>
                      {active && <CheckCircle2 size={20} color={RC.accent} strokeWidth={1.8} />}
                    </View>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Footer */}
        <View style={ST.footer}>
          <PressableScale onPress={handleNext} disabled={ctaDisabled} style={{ alignSelf: 'stretch' }}>
            <View style={[ST.btnPrimary, !ctaDisabled && BTN_SHADOW, ctaDisabled && ST.btnDisabled]}>
              <Text style={ST.btnLabel}>
                {step === total - 1 ? t('common.done') : t('common.next')}
              </Text>
              <ArrowRight size={18} color={RC.onAccent} strokeWidth={1.8} />
            </View>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
