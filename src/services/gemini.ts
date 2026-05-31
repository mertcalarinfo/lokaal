// SDK 54 new API — File class replaces getInfoAsync; Paths replaces cacheDirectory
import { File, Paths } from 'expo-file-system';
// Legacy import kept for two operations that have no new-API equivalent:
//   • copyAsync  — new File.copy() only accepts file:// URIs; legacy handles content://→file:// on Android
//   • uploadAsync / FileSystemUploadType — native binary streaming; no replacement in new API yet
import { copyAsync, uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OnboardingAnswers, AnalysisReport, CategoryResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Read the API key injected at build time via app.config.js → extra.geminiApiKey.
// Never hardcode this value here — use the .env file locally and an EAS secret
// for production / preview builds.
const GEMINI_API_KEY: string =
  (Constants.expoConfig?.extra?.geminiApiKey as string) || '';

// Diagnostic: confirm the key reached the bundle correctly.
// Logs only the first 10 characters so the full key is never exposed in logs.
console.log(
  '[Gemini] Key injection check —',
  GEMINI_API_KEY
    ? `key loaded ✓ (starts with: ${GEMINI_API_KEY.slice(0, 10)}…, length: ${GEMINI_API_KEY.length})`
    : 'KEY IS EMPTY ✗ — check EAS secret and app.config.js'
);

const GEMINI_MODEL = 'gemini-2.5-flash';
// Files API lives on v1beta — Google never promoted it to v1.
// The generateContent call is handled by the @google/generative-ai SDK,
// which picks the correct endpoint automatically — no manual URL needed.
const GEMINI_FILES_API = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
const ANALYSIS_TIMEOUT_MS = 120000; // 2 minutes

// Progress callback — receives a fraction 0..1 reflecting real pipeline stages.
type ProgressCb = (fraction: number) => void;

// Hard caps so the upload can never hang silently. These reject with a clear,
// user-facing message instead of leaving the progress bar stuck forever.
const UPLOAD_START_TIMEOUT_MS = 30000; // initiating the resumable upload
const UPLOAD_STREAM_TIMEOUT_MS = 90000; // streaming the video bytes to Gemini

/**
 * Race a promise against a timeout. If the promise doesn't settle in time, this
 * rejects with `<label> timed out after Ns`. The underlying native task may keep
 * running, but the JS flow proceeds so the UI can surface an error.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `${label} timed out after ${Math.round(ms / 1000)}s — check your internet connection and try again`
          )
        ),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

// Single SDK client shared across calls. Initialised at module load so the
// key is captured once from Constants (which is static after build).
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function buildSystemPrompt(answers: OnboardingAnswers, userLanguage: string): string {
  const purposeLabels: Record<string, string> = {
    job_interview: 'Job Interview',
    business_presentation: 'Business Presentation',
    content_creation: 'Content Creation',
    public_speaking: 'Public Speaking',
    personal_improvement: 'Personal Improvement',
    other: 'Other',
  };

  const focusLabels: Record<string, string> = {
    filler_words: 'Filler Words',
    body_language: 'Body Language',
    confidence: 'Confidence',
    speaking_pace: 'Speaking Pace',
    everything: 'All categories equally',
  };

  const experienceLabels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };

  const challengeLabels: Record<string, string> = {
    nervousness: 'Nervousness & anxiety',
    structure: 'Structuring their thoughts',
    engagement: 'Keeping the audience engaged',
    clarity: 'Speaking clearly',
    confidence: 'Sounding confident',
  };

  const feedbackLabels: Record<string, string> = {
    gentle: 'Gentle & encouraging',
    balanced: 'Balanced',
    direct: 'Direct & honest',
  };

  const purposeText = purposeLabels[answers.purpose] || answers.purpose;
  const focusText = focusLabels[answers.focusArea] || answers.focusArea;
  const experienceText = experienceLabels[answers.experienceLevel] || answers.experienceLevel;
  const challengeText = challengeLabels[answers.biggestChallenge] || answers.biggestChallenge;
  const feedbackText = feedbackLabels[answers.feedbackStyle] || answers.feedbackStyle;

  return `You are an elite communication coach with expertise in public speaking, rhetoric, body language, and personal presence. The user has submitted a video of themselves speaking. Your job is to analyze the video thoroughly and return a structured coaching report.

User context (use this to tailor every part of your feedback):
- Goal / preparing for: ${purposeText}
- Experience level: ${experienceText}
- Biggest self-reported challenge: ${challengeText}
- Area they most want feedback on: ${focusText}
- Preferred feedback tone: ${feedbackText}

Detect the language the speaker uses in the video automatically and write the ENTIRE report (observations, tips, summary, exercises) in that language.

Adapt your tone to their preferred feedback style: "gentle" = warm and encouraging while still honest; "direct" = candid and straight to the point; "balanced" = a mix of both. Give extra attention to their biggest challenge and chosen focus area.

Analyze the following 9 categories. For each category:
- Give a score from 1 to 10
- Write 2-4 specific observations (reference timestamps where possible)
- Give 2-3 actionable improvement tips
- Acknowledge strengths directly and specifically — never generically
- Name weaknesses clearly and honestly — but never in a discouraging way

Categories:
1. Filler Words (ähm, äh, like, you know, basically, etc.)
2. Speaking Pace (too fast, too slow, inconsistent)
3. Use of Pauses (strategic vs. nervous pauses)
4. Eye Contact (with camera / audience)
5. Body Language & Gestures (open vs. closed, purposeful vs. nervous)
6. Facial Expression (engaged, neutral, tense)
7. Voice Modulation (monotone vs. dynamic, energy, tone variation)
8. Content Structure (clear intro, main points, conclusion — red thread)
9. Overall Confidence & Presence (how the speaker comes across as a whole)

After all 9 categories:
- Write a free-text summary (max 150 words) that feels personal, warm, and honest
- Identify the 3 weakest categories and provide one concrete exercise per weakness

Return your analysis as JSON in this exact format:
{
  "categories": [
    {
      "name": "Filler Words",
      "score": 7,
      "observations": ["observation 1", "observation 2"],
      "tips": ["tip 1", "tip 2"]
    }
  ],
  "summary": "...",
  "exercises": ["exercise 1", "exercise 2", "exercise 3"]
}

The video can be up to 5 minutes long. Provide deep analysis but be concise and structured in your descriptions. Ensure your entire response strictly fits into a single, valid JSON object. Do not exceed length limits; prioritize density of feedback over wordiness so the JSON structure never breaks or gets truncated. Keep each observation and tip to one short sentence, and keep the summary under 120 words.

Respond in the same language the user spoke in the video.`;
}

async function uploadVideoToGeminiFiles(
  videoUri: string,
  onProgress?: ProgressCb
): Promise<string> {
  const mimeType = 'video/mp4';

  // Step 0: On Android, content:// URIs cannot be read directly by the Gemini
  // HTTP client — copy them to a local file:// path in the cache directory first.
  // Uses legacy copyAsync because the new File.copy() does not support content:// source URIs.
  let localUri = videoUri;
  if (videoUri.startsWith('content://')) {
    // Build the destination path via the new Paths.cache (SDK 54) to avoid the
    // deprecated FileSystem.cacheDirectory string constant.
    const dest = new File(Paths.cache, `prezence_${Date.now()}.mp4`).uri;
    console.log('[Gemini] Copying content:// URI to cache:', dest);
    await copyAsync({ from: videoUri, to: dest });
    localUri = dest;
  }

  // Step 1: Get file info using the SDK 54 File class (replaces deprecated getInfoAsync).
  // file.exists and file.size are synchronous property reads — no await needed.
  const file = new File(localUri);
  if (!file.exists) {
    throw new Error(`Video file not found at: ${localUri}`);
  }
  const fileSize: number = file.size;
  console.log('[Gemini] Uploading video:', localUri, '— size:', fileSize, 'bytes');

  // Step 2: Initiate resumable upload to get the upload URL (bounded by a timeout)
  const initiateResponse = await withTimeout(
    fetch(`${GEMINI_FILES_API}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(fileSize),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: { display_name: `prezence_video_${Date.now()}.mp4` },
      }),
    }),
    UPLOAD_START_TIMEOUT_MS,
    'Starting the video upload'
  );

  if (!initiateResponse.ok) {
    const errText = await initiateResponse.text();
    console.error('[Gemini] Initiate upload failed:', initiateResponse.status, errText);
    throw new Error(`Failed to initiate upload: ${initiateResponse.status} ${errText}`);
  }

  const uploadUrl = initiateResponse.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('No upload URL received from Gemini Files API');
  }
  console.log('[Gemini] Got upload URL, streaming file bytes natively...');
  onProgress?.(0.1); // upload initiated

  // Step 3: Upload the file bytes using legacy uploadAsync — this streams the file
  // at the native layer and avoids reading the entire video into the JS heap
  // (which would OOM for any file larger than ~20MB). There is no equivalent in
  // the SDK 54 new File API yet, so the legacy import is intentional here.
  // Bounded by a timeout so a stalled native upload surfaces an error instead of
  // hanging the progress bar forever.
  const uploadResult = await withTimeout(
    uploadAsync(uploadUrl, localUri, {
      httpMethod: 'POST',
      headers: {
        'Content-Type': mimeType,
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Offset': '0',
      },
      uploadType: FileSystemUploadType.BINARY_CONTENT,
    }),
    UPLOAD_STREAM_TIMEOUT_MS,
    'Uploading the video'
  );

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    console.error('[Gemini] Upload failed:', uploadResult.status, uploadResult.body);
    throw new Error(`Failed to upload video: ${uploadResult.status} ${uploadResult.body}`);
  }
  onProgress?.(0.45); // bytes uploaded

  let uploadResultJson: any;
  try {
    uploadResultJson = JSON.parse(uploadResult.body);
  } catch {
    console.error('[Gemini] Could not parse upload response:', uploadResult.body);
    throw new Error('Could not parse upload response from Gemini');
  }

  const fileUri = uploadResultJson?.file?.uri;
  if (!fileUri) {
    console.error('[Gemini] No file URI in upload response:', uploadResultJson);
    throw new Error('No file URI returned after upload');
  }

  console.log('[Gemini] Upload complete, file URI:', fileUri);

  // Step 4: Poll until the file is ACTIVE (Gemini processes it server-side)
  await waitForFileActive(fileUri, onProgress);

  return fileUri;
}

async function waitForFileActive(
  fileUri: string,
  onProgress?: ProgressCb
): Promise<void> {
  const fileName = fileUri.split('/').pop();
  const maxAttempts = 30;
  const pollIntervalMs = 3000;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${GEMINI_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to check file status');
    }

    const fileData = await response.json();

    if (fileData.state === 'ACTIVE') {
      onProgress?.(0.65); // processing complete
      return;
    }

    if (fileData.state === 'FAILED') {
      throw new Error('File processing failed on Gemini servers');
    }

    // Map polling attempts onto the 0.45→0.65 band so the bar keeps moving
    // while Gemini processes the file server-side.
    onProgress?.(Math.min(0.45 + (i / maxAttempts) * 0.2, 0.64));

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('File did not become active in time');
}

/**
 * extractJSON — pull the first valid JSON object out of any Gemini response.
 *
 * Gemini may return any of these shapes even when responseMimeType is set:
 *   • Bare JSON              {"categories":[...]}
 *   • Markdown-fenced        ```json\n{"categories":[...]}\n```
 *   • Fenced without label   ```\n{"categories":[...]}\n```
 *   • Prose + JSON           "Here is the analysis:\n```json\n{...}\n```"
 *   • JSON with control chars (invisible Unicode, \r, BOM)
 *
 * Strategy (in order):
 *   1. Extract content from ```json ... ``` fence (most common Gemini quirk)
 *   2. Extract content from plain ``` ... ``` fence
 *   3. Slice from first '{' to last '}' in the whole text
 *   4. Strip all control characters and try again
 */
function extractJSON(text: string): string {
  // 1. ```json ... ``` fence
  const jsonFenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (jsonFenceMatch?.[1]) return jsonFenceMatch[1].trim();

  // 2. Plain ``` ... ``` fence
  const plainFenceMatch = text.match(/```\s*([\s\S]*?)```/);
  if (plainFenceMatch?.[1]) {
    const inner = plainFenceMatch[1].trim();
    if (inner.startsWith('{')) return inner;
  }

  // 3. First '{' to last '}' — works for prose-wrapped JSON
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return text.substring(start, end + 1).trim();
  }

  // 4. Nothing found — return the whole text stripped of control characters
  //    so JSON.parse at least gets a clean string to reject with a clear error.
  return text.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
}

/** Thin wrapper: extract then parse, preserving the raw text for diagnostics. */
function extractJsonFromText(text: string): any {
  const clean = extractJSON(text);
  try {
    return JSON.parse(clean);
  } catch (e: any) {
    // Surface enough context to diagnose without logging the full (potentially
    // large) video-analysis response — first 600 chars is usually enough.
    throw new Error(
      `JSON.parse failed after extraction.\n` +
      `Extracted (first 600 chars): ${clean.slice(0, 600)}\n` +
      `Original (first 200 chars): ${text.slice(0, 200)}`
    );
  }
}

function validateAndNormalizeReport(rawData: any, videoUrl: string, userId: string, answers: OnboardingAnswers): AnalysisReport {
  if (!rawData.categories || !Array.isArray(rawData.categories)) {
    throw new Error('Invalid report: missing categories array');
  }

  const categoryNames = [
    'Filler Words',
    'Speaking Pace',
    'Use of Pauses',
    'Eye Contact',
    'Body Language & Gestures',
    'Facial Expression',
    'Voice Modulation',
    'Content Structure',
    'Overall Confidence & Presence',
  ];

  const categories: CategoryResult[] = categoryNames.map((name, index) => {
    const found = rawData.categories.find(
      (c: any) =>
        c.name?.toLowerCase().includes(name.toLowerCase().split(' ')[0].toLowerCase()) ||
        index < rawData.categories.length
    );

    const raw = rawData.categories[index] || found || {};

    return {
      name,
      score: Math.min(10, Math.max(1, Number(raw.score) || 5)),
      observations: Array.isArray(raw.observations)
        ? raw.observations.slice(0, 4).map(String)
        : ['No observations available'],
      tips: Array.isArray(raw.tips)
        ? raw.tips.slice(0, 3).map(String)
        : ['Practice regularly to improve'],
    };
  });

  const averageScore =
    Math.round(
      (categories.reduce((sum, c) => sum + c.score, 0) / categories.length) * 10
    ) / 10;

  const exercises: string[] = Array.isArray(rawData.exercises)
    ? rawData.exercises.slice(0, 3).map(String)
    : ['Record yourself speaking for 5 minutes daily', 'Practice in front of a mirror', 'Join a speaking club or group'];

  return {
    id: uuidv4(),
    userId,
    videoUrl,
    thumbnailUrl: '',
    createdAt: new Date(),
    onboardingAnswers: answers,
    categories,
    summary: typeof rawData.summary === 'string' ? rawData.summary : 'Analysis complete. Keep up the great work!',
    exercises,
    averageScore,
  };
}

export async function analyzeVideo(
  videoUri: string,
  answers: OnboardingAnswers,
  userLanguage: string,
  userId: string = 'anonymous',
  onProgress?: ProgressCb
): Promise<AnalysisReport> {
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ANALYSIS_TIMEOUT_MS)
  );

  const analysisPromise = doAnalyzeVideo(videoUri, answers, userLanguage, userId, onProgress);

  return Promise.race([analysisPromise, timeoutPromise]);
}

async function doAnalyzeVideo(
  videoUri: string,
  answers: OnboardingAnswers,
  userLanguage: string,
  userId: string,
  onProgress?: ProgressCb
): Promise<AnalysisReport> {
  // Step 0: Connectivity probe — send a minimal text prompt via the SDK to
  // confirm the key is valid and the network can reach Gemini before uploading.
  console.log('[Gemini] Probing API key with text-only request...');
  try {
    const probeModel = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { maxOutputTokens: 8 },
    });
    const probeResult = await probeModel.generateContent('Hello');
    const probeText = probeResult.response.text();
    console.log('[Gemini] API key probe OK — response:', probeText);
  } catch (error: any) {
    console.error('[Gemini] API key probe FAILED:', error.message, error);
    throw new Error(`GEMINI_API_ERROR: probe failed — ${error.message}`);
  }
  onProgress?.(0.05); // probe ok

  // Step 1: Upload video to Gemini Files API
  let geminiFileUri: string;
  try {
    geminiFileUri = await uploadVideoToGeminiFiles(videoUri, onProgress);
  } catch (error: any) {
    console.error('[Gemini] Video upload failed:', error);
    throw new Error(`UPLOAD_FAILED: ${error.message}`);
  }

  // Step 2: Build model with system instruction
  const systemPrompt = buildSystemPrompt(answers, userLanguage);

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.4,
      topP: 0.95,
      // Max buffer for gemini-2.5-flash so the full 9-category JSON for videos
      // up to 5 minutes is never truncated mid-object (4096 cut off ~1m30s+).
      maxOutputTokens: 8192,
      // Force pure JSON output — prevents the model from wrapping the
      // response in markdown code fences (```json ... ```) which broke parsing.
      responseMimeType: 'application/json',
    },
  });

  // Step 3: Send video + prompt via SDK — it handles correct field names and
  // API version automatically, eliminating the camelCase/snake_case ambiguity.
  console.log('[Gemini] Sending video to model for analysis...');
  onProgress?.(0.7); // analysis request sent
  let sdkResponse;
  try {
    sdkResponse = await model.generateContent([
      {
        fileData: {
          mimeType: 'video/mp4',
          fileUri: geminiFileUri,
        },
      },
      'Please analyze this speaking video and return the structured JSON report as specified.',
    ]);
  } catch (error: any) {
    console.error('[Gemini] generateContent failed:', error.message, error);
    throw new Error(`GEMINI_API_ERROR: ${error.message}`);
  }
  onProgress?.(0.95); // model returned

  const textContent = sdkResponse.response.text();
  console.log('[Gemini] Response received, length:', textContent.length);

  if (!textContent) {
    throw new Error('Empty response from Gemini API');
  }

  // Parse JSON from response
  let rawData: any;
  try {
    rawData = extractJsonFromText(textContent);
  } catch (parseError: any) {
    // parseError.message already contains extracted + original text snippets
    console.error('[Gemini] JSON parse failed:', parseError.message);
    throw new Error(`PARSE_ERROR: ${parseError.message}`);
  }

  // Validate and normalize
  const report = validateAndNormalizeReport(rawData, videoUri, userId, answers);
  onProgress?.(1); // done
  return report;
}
