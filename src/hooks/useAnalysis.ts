import { useState, useCallback, useRef } from 'react';
import { AnalysisReport, OnboardingAnswers } from '../types';
import { analyzeVideo } from '../services/gemini';
import { uploadVideo, saveReport } from '../services/storage';

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
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

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

      try {
        // Step 1: Upload to Firebase Storage (for saving the video URL)
        setState('uploading');
        let videoUrl = videoUri;

        try {
          videoUrl = await uploadVideo(videoUri, userId, (progress) => {
            if (!cancelledRef.current) {
              setUploadProgress(progress);
            }
          });
        } catch (uploadErr: any) {
          // If Firebase storage fails, continue with local URI for Gemini analysis
          console.warn('Firebase upload failed, using local URI:', uploadErr.message);
          videoUrl = videoUri;
        }

        if (cancelledRef.current) {
          setState('cancelled');
          return null;
        }

        // Step 2: Analyze with Gemini
        setState('analyzing');

        const analysisReport = await analyzeVideo(videoUri, answers, userLanguage, userId);

        if (cancelledRef.current) {
          setState('cancelled');
          return null;
        }

        // Update report with the Firebase storage URL if available
        const finalReport: AnalysisReport = {
          ...analysisReport,
          videoUrl,
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
    report,
    error,
    rawError,
    startAnalysis,
    cancel,
    reset,
    saveCurrentReport,
  };
};
