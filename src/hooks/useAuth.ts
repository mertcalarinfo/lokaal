/**
 * useAuth — re-exported from the shared AuthContext.
 *
 * All auth state now lives in a single React Context (AuthProvider) so every
 * consumer sees the same state. Previously each call to useAuth() created an
 * independent useState island, which meant markOnboardingCompleted() in
 * OnboardingScreen didn't update AppNavigator's view of the user — causing the
 * onboarding loop.
 *
 * No callers need to change: the returned interface is identical.
 */

export { useAuth } from '../contexts/AuthContext';
