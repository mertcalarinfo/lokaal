export interface User {
  uid: string;
  email: string;
  displayName: string;
  language?: 'en' | 'de';
  onboardingCompleted?: boolean;
  // Persisted coaching goals collected once during onboarding. Editable in
  // Settings. Passed to Gemini on every analysis so feedback stays tailored.
  onboardingAnswers?: OnboardingAnswers;
  createdAt: Date;
}

export interface OnboardingAnswers {
  // What the user is preparing for.
  purpose:
    | 'job_interview'
    | 'business_presentation'
    | 'content_creation'
    | 'public_speaking'
    | 'personal_improvement'
    | 'other';
  // How experienced they are with public speaking.
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  // What they personally struggle with most.
  biggestChallenge:
    | 'nervousness'
    | 'structure'
    | 'engagement'
    | 'clarity'
    | 'confidence';
  // The area they most want the AI to focus on.
  focusArea:
    | 'filler_words'
    | 'body_language'
    | 'confidence'
    | 'speaking_pace'
    | 'everything';
  // How they want feedback delivered.
  feedbackStyle: 'gentle' | 'balanced' | 'direct';
  // NOTE: video language is no longer asked — Gemini detects it automatically.
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
  OnboardingIntro: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  LanguageSelect: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Paywall: undefined;
  // Edit coaching goals as a root-level modal, reachable from Settings.
  EditGoals: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  ProgressTab: undefined;
  SettingsTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  // videoUri present = pre-analysis fallback flow; mode='edit' = editing goals
  Onboarding: { videoUri?: string; mode?: 'edit' } | undefined;
  AnalysisLoading: { videoUri: string; answers: OnboardingAnswers };
  // saved=true when opened from the Progress tab (report already in Firestore)
  Report: { report: AnalysisReport; saved?: boolean };
  Paywall: undefined;
};
