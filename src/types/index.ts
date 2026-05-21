export interface User {
  uid: string;
  email: string;
  displayName: string;
  language: 'en' | 'de';
  createdAt: Date;
}

export interface OnboardingAnswers {
  purpose:
    | 'job_interview'
    | 'business_presentation'
    | 'content_creation'
    | 'public_speaking'
    | 'personal_improvement'
    | 'other';
  videoLanguage: 'english' | 'deutsch' | 'other';
  focusArea:
    | 'filler_words'
    | 'body_language'
    | 'confidence'
    | 'speaking_pace'
    | 'everything';
}

export interface CategoryResult {
  name: string;
  score: number;
  observations: string[];
  tips: string[];
}

export interface AnalysisReport {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl: string;
  createdAt: Date;
  onboardingAnswers: OnboardingAnswers;
  categories: CategoryResult[];
  summary: string;
  exercises: string[];
  averageScore: number;
}

export interface Subscription {
  isActive: boolean;
  tier: 'free' | 'premium';
  analysesThisMonth: number;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  LanguageSelect: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  LanguageSelect: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  ProgressTab: undefined;
  SettingsTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Onboarding: undefined;
  AnalysisLoading: { videoUri: string; answers: OnboardingAnswers };
  Report: { report: AnalysisReport };
  Paywall: undefined;
};
