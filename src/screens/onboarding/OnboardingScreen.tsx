import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { HomeStackParamList, OnboardingAnswers } from '../../types';
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

type OnboardingNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Onboarding'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step1Option = OnboardingAnswers['purpose'];
type Step2Option = OnboardingAnswers['videoLanguage'];
type Step3Option = OnboardingAnswers['focusArea'];

const step1Icons: Record<Step1Option, string> = {
  job_interview: 'briefcase-outline',
  business_presentation: 'bar-chart-outline',
  content_creation: 'camera-outline',
  public_speaking: 'people-outline',
  personal_improvement: 'trending-up-outline',
  other: 'ellipsis-horizontal-outline',
};

const step3Icons: Record<Step3Option, string> = {
  filler_words: 'chatbubble-ellipses-outline',
  body_language: 'body-outline',
  confidence: 'flame-outline',
  speaking_pace: 'speedometer-outline',
  everything: 'sparkles-outline',
};

const OnboardingScreen: React.FC = () => {
  const { t } = useTranslation();
  // Use `any` navigation so this screen works in both HomeStack and AppNavigator's intro stack
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { markOnboardingCompleted } = useAuth();

  // videoUri is present when coming from HomeScreen pre-analysis flow
  // undefined/absent means we're in the new-user intro flow
  const videoUri: string | undefined = route.params?.videoUri;
  const isIntroMode = !videoUri;

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({});
  const [isLoading, setIsLoading] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const totalSteps = 3;

  const step1Options: Step1Option[] = [
    'job_interview',
    'business_presentation',
    'content_creation',
    'public_speaking',
    'personal_improvement',
    'other',
  ];

  const step2Options: Step2Option[] = ['english', 'deutsch', 'other'];

  const step3Options: Step3Option[] = [
    'filler_words',
    'body_language',
    'confidence',
    'speaking_pace',
    'everything',
  ];

  const animateTransition = (direction: 'forward' | 'back') => {
    const toValue = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH;

    Animated.sequence([
      Animated.timing(translateX, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleFinishOnboarding = async (finalAnswers: OnboardingAnswers) => {
    if (isIntroMode) {
      // New-user intro flow: write AsyncStorage + update state, then AppNavigator
      // auto-transitions. markOnboardingCompleted never throws — AsyncStorage is
      // the source of truth so navigation is always safe after this call.
      setIsLoading(true);
      try {
        await markOnboardingCompleted();
      } finally {
        setIsLoading(false);
      }
    } else {
      // Pre-analysis flow: hand off answers + video to the loading screen.
      navigation.navigate('AnalysisLoading', {
        videoUri,
        answers: finalAnswers,
      });
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      animateTransition('forward');
      setTimeout(() => setCurrentStep((s) => s + 1), 200);
    } else {
      const finalAnswers: OnboardingAnswers = {
        purpose: answers.purpose || 'personal_improvement',
        videoLanguage: answers.videoLanguage || 'english',
        focusArea: answers.focusArea || 'everything',
      };
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
    // If at step 0 in intro mode (no parent screen), do nothing
  };

  const canProceed = (): boolean => {
    if (currentStep === 0) return !!answers.purpose;
    if (currentStep === 1) return !!answers.videoLanguage;
    if (currentStep === 2) return !!answers.focusArea;
    return false;
  };

  const renderOptionCard = (
    value: string,
    label: string,
    icon: string,
    isSelected: boolean,
    onSelect: () => void
  ) => (
    <TouchableOpacity
      key={value}
      style={[styles.optionCard, isSelected && styles.optionCardSelected]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon as any}
        size={22}
        color={isSelected ? COLORS.primary : COLORS.textMuted}
        style={styles.optionIcon}
      />
      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
        {label}
      </Text>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={styles.optionCheck} />
      )}
    </TouchableOpacity>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('onboarding.steps.step1.title')}</Text>
            <Text style={styles.stepSubtitle}>{t('onboarding.steps.step1.subtitle')}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsScroll}>
              {step1Options.map((option) =>
                renderOptionCard(
                  option,
                  t(`onboarding.steps.step1.options.${option}`),
                  step1Icons[option],
                  answers.purpose === option,
                  () => setAnswers((prev) => ({ ...prev, purpose: option }))
                )
              )}
            </ScrollView>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('onboarding.steps.step2.title')}</Text>
            <Text style={styles.stepSubtitle}>{t('onboarding.steps.step2.subtitle')}</Text>
            <View style={styles.optionsScroll}>
              {step2Options.map((option) =>
                renderOptionCard(
                  option,
                  t(`onboarding.steps.step2.options.${option}`),
                  option === 'english' ? 'flag-outline' : option === 'deutsch' ? 'flag-outline' : 'globe-outline',
                  answers.videoLanguage === option,
                  () => setAnswers((prev) => ({ ...prev, videoLanguage: option }))
                )
              )}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('onboarding.steps.step3.title')}</Text>
            <Text style={styles.stepSubtitle}>{t('onboarding.steps.step3.subtitle')}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.optionsScroll}>
              {step3Options.map((option) =>
                renderOptionCard(
                  option,
                  t(`onboarding.steps.step3.options.${option}`),
                  step3Icons[option],
                  answers.focusArea === option,
                  () => setAnswers((prev) => ({ ...prev, focusArea: option }))
                )
              )}
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
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
            {t('onboarding.steps.stepOf', {
              current: currentStep + 1,
              total: totalSteps,
            })}
          </Text>

          <View style={styles.backButton} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${((currentStep + 1) / totalSteps) * 100}%` },
            ]}
          />
        </View>

        {/* Animated step content */}
        <Animated.View
          style={[styles.animatedContent, { transform: [{ translateX }] }]}
        >
          {renderStep()}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            label={
              currentStep === totalSteps - 1
                ? t('common.done')
                : t('common.next')
            }
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
    marginBottom: 32,
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
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    lineHeight: 36,
    fontFamily: 'DMSans_700Bold',
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
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
    padding: 16,
    marginBottom: 10,
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
