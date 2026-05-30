import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { OnboardingAnswers } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/Button';

const COLORS = {
  background: '#0a1628',
  surface: '#0d1b2e',
  surfaceElevated: '#111d30',
  primary: '#3B7FE8',
  primaryLight: '#5B9AFF',
  accent: '#FF6B6B',
  success: '#4ECDC4',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.35)',
  border: 'rgba(59,127,232,0.3)',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Each onboarding step maps to one answer field. The language question was
// removed (Gemini detects the spoken language). 5 questions give the AI rich
// context: goal, experience, struggle, focus area, and preferred feedback tone.
type StepKey = keyof OnboardingAnswers;

interface StepConfig {
  key: StepKey;
  i18nKey: string;
  options: { value: string; icon: string }[];
}

const STEPS: StepConfig[] = [
  {
    key: 'purpose',
    i18nKey: 'purpose',
    options: [
      { value: 'job_interview', icon: 'briefcase-outline' },
      { value: 'business_presentation', icon: 'bar-chart-outline' },
      { value: 'content_creation', icon: 'camera-outline' },
      { value: 'public_speaking', icon: 'people-outline' },
      { value: 'personal_improvement', icon: 'trending-up-outline' },
      { value: 'other', icon: 'ellipsis-horizontal-outline' },
    ],
  },
  {
    key: 'experienceLevel',
    i18nKey: 'experience',
    options: [
      { value: 'beginner', icon: 'leaf-outline' },
      { value: 'intermediate', icon: 'trending-up-outline' },
      { value: 'advanced', icon: 'ribbon-outline' },
    ],
  },
  {
    key: 'biggestChallenge',
    i18nKey: 'challenge',
    options: [
      { value: 'nervousness', icon: 'pulse-outline' },
      { value: 'structure', icon: 'list-outline' },
      { value: 'engagement', icon: 'people-outline' },
      { value: 'clarity', icon: 'chatbubble-ellipses-outline' },
      { value: 'confidence', icon: 'flame-outline' },
    ],
  },
  {
    key: 'focusArea',
    i18nKey: 'focus',
    options: [
      { value: 'filler_words', icon: 'chatbubble-ellipses-outline' },
      { value: 'body_language', icon: 'body-outline' },
      { value: 'confidence', icon: 'flame-outline' },
      { value: 'speaking_pace', icon: 'speedometer-outline' },
      { value: 'everything', icon: 'sparkles-outline' },
    ],
  },
  {
    key: 'feedbackStyle',
    i18nKey: 'feedback',
    options: [
      { value: 'gentle', icon: 'heart-outline' },
      { value: 'balanced', icon: 'scale-outline' },
      { value: 'direct', icon: 'flash-outline' },
    ],
  },
];

// Defaults applied if somehow a step is skipped (shouldn't happen — Next is
// disabled until an option is selected).
const DEFAULTS: OnboardingAnswers = {
  purpose: 'personal_improvement',
  experienceLevel: 'beginner',
  biggestChallenge: 'nervousness',
  focusArea: 'everything',
  feedbackStyle: 'balanced',
};

const OnboardingScreen: React.FC = () => {
  const { t } = useTranslation();
  // `any` navigation so this screen works in both the intro stack and the
  // EditGoals modal.
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, completeOnboarding, saveOnboardingAnswers } = useAuth();

  const mode: string | undefined = route.params?.mode;
  const videoUri: string | undefined = route.params?.videoUri;
  const isEditMode = mode === 'edit';
  const isIntroMode = !videoUri && !isEditMode;

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>(
    user?.onboardingAnswers || {}
  );
  const [isLoading, setIsLoading] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const totalSteps = STEPS.length;
  const step = STEPS[currentStep];
  const selectedValue = answers[step.key];

  const animateTransition = (direction: 'forward' | 'back') => {
    const toValue = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH;
    Animated.sequence([
      Animated.timing(translateX, { toValue, duration: 200, useNativeDriver: true }),
      Animated.timing(translateX, {
        toValue: direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleFinishOnboarding = async (finalAnswers: OnboardingAnswers) => {
    if (isIntroMode) {
      setIsLoading(true);
      try {
        await completeOnboarding(finalAnswers);
      } finally {
        setIsLoading(false);
      }
    } else if (isEditMode) {
      setIsLoading(true);
      try {
        await saveOnboardingAnswers(finalAnswers);
      } finally {
        setIsLoading(false);
      }
      navigation.goBack();
    } else {
      // Pre-analysis fallback (legacy path): persist + hand off to analysis.
      saveOnboardingAnswers(finalAnswers).catch(() => {});
      navigation.navigate('AnalysisLoading', {
        videoUri: videoUri as string,
        answers: finalAnswers,
      });
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      animateTransition('forward');
      setTimeout(() => setCurrentStep((s) => s + 1), 200);
    } else {
      const finalAnswers: OnboardingAnswers = { ...DEFAULTS, ...answers } as OnboardingAnswers;
      handleFinishOnboarding(finalAnswers);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateTransition('back');
      setTimeout(() => setCurrentStep((s) => s - 1), 200);
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const canProceed = (): boolean => !!answers[step.key];

  const selectOption = (value: string) => {
    setAnswers((prev) => ({ ...prev, [step.key]: value } as Partial<OnboardingAnswers>));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>
            {t('onboarding.steps.stepOf', { current: currentStep + 1, total: totalSteps })}
          </Text>
          <View style={styles.backButton} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: `${((currentStep + 1) / totalSteps) * 100}%` }]}
          />
        </View>

        {/* Animated step content */}
        <Animated.View style={[styles.animatedContent, { transform: [{ translateX }] }]}>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {t(`onboarding.steps.${step.i18nKey}.title`)}
            </Text>
            <Text style={styles.stepSubtitle}>
              {t(`onboarding.steps.${step.i18nKey}.subtitle`)}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsScroll}>
              {step.options.map((opt) => {
                const isSelected = selectedValue === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => selectOption(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={22}
                      color={isSelected ? COLORS.primary : COLORS.textMuted}
                      style={styles.optionIcon}
                    />
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {t(`onboarding.steps.${step.i18nKey}.options.${opt.value}`)}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={COLORS.primary}
                        style={styles.optionCheck}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            label={currentStep === totalSteps - 1 ? t('common.done') : t('common.next')}
            onPress={handleNext}
            disabled={!canProceed() || isLoading}
            loading={isLoading}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  animatedContent: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    lineHeight: 30,
    fontFamily: 'DMSans_700Bold',
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
  },
  optionsScroll: {
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(59,127,232,0.08)',
  },
  optionIcon: {
    marginRight: 14,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  optionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  optionCheck: {
    marginLeft: 8,
  },
  footer: {
    paddingBottom: 8,
    paddingTop: 16,
  },
});

export default OnboardingScreen;
