/**
 * StartupErrorBoundary — makes startup JS errors VISIBLE instead of crashing.
 *
 * In a release / preview build there is no red-box. An unhandled JS error early
 * in startup is picked up by expo-updates' error recovery, which ABORTS the
 * process (the `expo.controller.errorRecoveryQueue` SIGABRT). That hides the
 * real error and just bounces the user back to the home screen.
 *
 * This module does two things:
 *   1. Installs a global ErrorUtils handler (as an import side-effect, so it is
 *      active before i18n/firebase module side-effects run) that captures fatal
 *      JS errors and shows them on screen instead of letting the process abort.
 *   2. A React error boundary that catches render/lifecycle errors in the tree.
 *
 * The error screen uses NO custom font and NO theme — so it cannot fail for the
 * same reason the app might (e.g. an unrecognised font family on iOS).
 *
 * This is a diagnostic aid. Once the underlying startup error is fixed, we can
 * decide whether to keep suppressing fatal errors or restore normal recovery.
 */
import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';

type BoundaryState = { error: Error | null; detail: string | null };

// Bridge between the non-React global handler and the mounted boundary.
let pushError: ((e: Error, detail?: string) => void) | null = null;
let pendingError: { e: Error; detail?: string } | null = null;

const report = (e: Error, detail?: string) => {
  if (pushError) pushError(e, detail);
  else pendingError = { e, detail }; // boundary not mounted yet — flush on mount
};

// ── Global JS error handler (runs once, at module import) ────────────────────
const g: any = global as any;
if (g.ErrorUtils && !g.__prezenceErrorHandlerInstalled) {
  g.__prezenceErrorHandlerInstalled = true;
  const previous = g.ErrorUtils.getGlobalHandler ? g.ErrorUtils.getGlobalHandler() : null;
  g.ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    const err = error instanceof Error ? error : new Error(String(error));
    // eslint-disable-next-line no-console
    console.error('[GlobalError]', isFatal ? '(fatal)' : '', err?.message, '\n', err?.stack);
    report(err, isFatal ? 'Caught by global handler (fatal)' : 'Caught by global handler');
    // Deliberately do NOT forward fatal errors to the previous handler: the
    // default / expo-updates handler aborts the process, which is exactly the
    // crash we are trying to see past. Non-fatal errors are forwarded so normal
    // behaviour is preserved.
    if (!isFatal && previous) {
      try { previous(error, isFatal); } catch { /* ignore */ }
    }
  });
}

export class StartupErrorBoundary extends React.Component<
  { children: React.ReactNode },
  BoundaryState
> {
  state: BoundaryState = { error: null, detail: null };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error?.message, '\n', error?.stack, '\n', info?.componentStack);
    this.setState({ detail: info?.componentStack ?? null });
  }

  componentDidMount() {
    pushError = (e, detail) => this.setState({ error: e, detail: detail ?? null });
    if (pendingError) {
      this.setState({ error: pendingError.e, detail: pendingError.detail ?? null });
      pendingError = null;
    }
  }

  componentWillUnmount() {
    pushError = null;
  }

  render() {
    const { error, detail } = this.state;
    if (!error) return this.props.children;

    return (
      <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
        <Text style={styles.title}>App-Startfehler abgefangen</Text>
        <Text style={styles.hint}>
          Dieser Bildschirm ersetzt den Crash. Kopiere den Text unten / mach ein Foto.
        </Text>
        <Text style={styles.label}>Fehler</Text>
        <Text style={styles.message}>
          {error.name}: {error.message}
        </Text>
        {!!error.stack && (
          <>
            <Text style={styles.label}>Stack</Text>
            <Text style={styles.mono}>{error.stack}</Text>
          </>
        )}
        {!!detail && (
          <>
            <Text style={styles.label}>Component / Quelle</Text>
            <Text style={styles.mono}>{detail}</Text>
          </>
        )}
      </ScrollView>
    );
  }
}

// Hardcoded, theme-independent, NO custom fontFamily (system default only).
const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#FCFBF9' },
  content: { padding: 20, paddingTop: 64 },
  title: { fontSize: 20, fontWeight: '700', color: '#B00020', marginBottom: 8 },
  hint: { fontSize: 13, color: '#555555', marginBottom: 20, lineHeight: 18 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8A',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 4,
  },
  message: { fontSize: 15, color: '#211F1B', lineHeight: 20 },
  mono: { fontSize: 11, color: '#333333', lineHeight: 16 },
});
