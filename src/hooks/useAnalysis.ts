import { useState, useCallback, useRef } from 'react';
import { AnalysisReport, OnboardingAnswers } from '../types';
import { analyzeVideo } from '../services/gemini';
import { saveReport } from '../services/storage';

export type AnalysisState =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'complete'
  | 'error'
  | 'cancelled';

interface AnalysisHookState {
  state: AnalysisState;
  uploadProgress: number;
  /** Unified real progress 0..100 across Firebase upload + Gemini pipeline */
  progress: number;
  report: AnalysisReport | null;
  error: string | null;
  /** Raw error message from the thrown exception — shown directly in debug alerts */
  rawError: string | null;
}

interface AnalysisHookActions {
  startAnalysis: (
    videoUri: string,
    answers: OnboardingAnswers,
    userId: string,
    userLanguage: string
  ) => Promise<AnalysisReport | null>;
  cancel: () => void;
  reset: () => void;
  saveCurrentReport: () => Promise<void>;
}

export const useAnalysis = (): AnalysisHookState & AnalysisHookActions => {
  const [state, setState] = useState<AnalysisState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  // Single source of truth for the progress bar. Never let it move backwards
  // (Firebase upload and Gemini stages report on different scales).
  const bumpProgress = useCallback((pct: number) => {
    setProgress((prev) => (pct > prev ? Math.min(100, Math.round(pct)) : prev));
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setState('cancelled');
    setError(null);
    setRawError(null);
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState('idle');
    setUploadProgress(0);
    setProgress(0);
    setReport(null);
    setError(null);
    setRawError(null);
  }, []);

  const startAnalysis = useCallback(
    async (
      videoUri: string,
      answers: OnboardingAnswers,
      userId: string,
      userLanguage: string
    ): Promise<AnalysisReport | null> => {
      cancelledRef.current = false;
      setError(null);
      setReport(null);
      setUploadProgress(0);
      setProgress(0);

      try {
        // The video is uploaded ONCE — directly to Gemini inside analyzeVideo.
        // Previously it was also pre-uploaded to Firebase Storage, so the same
        // file went up twice and doubled the wait before analysis even began.
        // Gemini's 0..1 pipeline now maps straight onto the full 0–100% bar.
        setState('uploading');

        const analysisReport = await analyzeVideo(
          videoUri,
          answers,
          userLanguage,
          userId,
          (frac) => {
            if (cancelledRef.current) return;
            bumpProgress(frac * 100);
            // Up to ~45% is the upload; after that the model is processing.
            if (frac < 0.5) {
              setState('uploading');
              setUploadProgress(Math.min(100, Math.round((frac / 0.45) * 100)));
            } else {
              setState('analyzing');
            }
          }
        );

        if (cancelledRef.current) {
          setState('cancelled');
          return null;
        }

        // The video stays at its local URI — it was not re-uploaded to Firebase.
        const finalReport: AnalysisReport = {
          ...analysisReport,
          videoUrl: videoUri,
          userId,
        };

        setReport(finalReport);
        setState('complete');
        return finalReport;
      } catch (err: any) {
        if (cancelledRef.current) {
          setState('cancelled');
          return null;
        }

        // Always log the real error so it's visible in the dev console
        console.error('[useAnalysis] Analysis failed:', err?.message, err);

        // Store the full raw message for display in the UI
        const fullMessage: string = err?.message || String(err) || 'Unknown error';
        setRawError(fullMessage);

        let errorMessage = 'generic';
        if (err.message?.includes('TIMEOUT')) {
          errorMessage = 'timeout';
        } else if (err.message?.includes('UPLOAD_FAILED')) {
          errorMessage = 'uploadFailed';
        } else if (err.message?.includes('GEMINI_API_ERROR') || err.message?.includes('PARSE_ERROR')) {
          errorMessage = 'analysisFailed';
        }

        setError(errorMessage);
        setState('error');
        return null;
      }
    },
    []
  );

  const saveCurrentReport = useCallback(async () => {
    if (!report) return;

    try {
      await saveReport(report);
    } catch (err: any) {
      throw new Error(`Failed to save report: ${err.message}`);
    }
  }, [report]);

  return {
    state,
    uploadProgress,
    progress,
    report,
    error,
    rawError,
    startAnalysis,
    cancel,
    reset,
    saveCurrentReport,
  };
};
