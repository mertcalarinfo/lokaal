export interface User {
  uid: string;
  email: string;
  displayName: string;
  language?: 'en' | 'de';
  onboardingCompleted?: boolean;
  // Persisted coaching goals collected once during onboarding. Editable in
  // Settings. Passed to Gemini on every analysis so feedback stays tailored.
  onboardingAnswers?: OnboardingAnswers;
  // Profilbild — in Firebase Storage gespeichert, URL in Firestore users/{uid}.photoURL.
  photoURL?: string;
  // Dauerhafter Pro-Status — NUR serverseitig (Cloud Function) setzbar, Client kann ihn nicht schreiben.
  isPro?: boolean;
  // Ob der Nutzer JEMALS Pro hatte — NUR serverseitig setzbar.
  hadProBefore?: boolean;
  // Zeitpunkt an dem Pro zuletzt ausgelaufen ist — NUR serverseitig setzbar.
  proExpiredAt?: Date;
  // Monatlicher Analysen-Zähler (Free-Limit). usageMonth = "YYYY-MM", Reset durch Monatsabgleich.
  usageMonth?: string;
  usageCount?: number;
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
  /** Optional user-chosen title, replaces the date-based label everywhere the report appears. */
  customName?: string;
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
  // Versteckter Code-Einlöse-Screen (erreichbar über 10× Tap auf das Logo).
  AccessCode: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Paywall: undefined;
  // Edit coaching goals as a root-level modal, reachable from Settings.
  EditGoals: undefined;
};

export type MainTabParamList = {
  HomeTab:     undefined;
  ProgressTab: undefined;
  CompareTab:  undefined;
  SettingsTab: undefined;
};

// ── Video-Vergleich ───────────────────────────────────────────────────────────

export interface ComparisonCategoryItem {
  category:    string;
  direction:   'improved' | 'declined' | 'same';
  observation: string;
}

export interface ComparisonResult {
  overallChange:        string;
  categoryComparisons:  ComparisonCategoryItem[];
  /** null wenn der Nutzer keinen Kontext eingegeben hat */
  contextResponse:      string | null;
  coachComment:         string;
}

export interface SavedComparison {
  id:          string;
  userId:      string;
  createdAt:   Date;
  video1Label: string;
  video2Label: string;
  video1Url?:  string;
  video2Url?:  string;
  userContext: string;
  result:      ComparisonResult;
  /** Optional user-chosen title, replaces the date-based label everywhere the comparison appears. */
  customName?: string;
}

export type HomeStackParamList = {
  Home: undefined;
  // videoUri present = pre-analysis fallback flow; mode='edit' = editing goals
  Onboarding: { videoUri?: string; mode?: 'edit' } | undefined;
  AnalysisLoading: { videoUri: string; answers: OnboardingAnswers };
  // saved=true when opened from the Progress tab (report already in Firestore)
  // returnTo='progress' makes the back button switch to the Progress tab instead of going Home
  Report: { report: AnalysisReport; saved?: boolean; returnTo?: 'progress' };
  Paywall: undefined;
};
