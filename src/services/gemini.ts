// SDK 54 new API — File class replaces getInfoAsync; Paths replaces cacheDirectory
import { File, Paths } from 'expo-file-system';
// Legacy import kept for two operations that have no new-API equivalent:
//   • copyAsync  — new File.copy() only accepts file:// URIs; legacy handles content://→file:// on Android
//   • uploadAsync / FileSystemUploadType — native binary streaming; no replacement in new API yet
import { copyAsync, uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { Video as VideoCompressor } from 'react-native-compressor';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OnboardingAnswers, AnalysisReport, CategoryResult, ComparisonResult, ComparisonCategoryItem } from '../types';
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
const ANALYSIS_TIMEOUT_MS = 240000; // 4 minutes — allows local compression of longer clips

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

Detect the language the speaker uses in the video automatically and write the ENTIRE report (observations, tips, summary, exercises) in that language. If the language is German, always use the informal "du" form (duzen) — never the formal "Sie" form.

Adapt your tone to their preferred feedback style: "gentle" = warm and encouraging while still honest; "direct" = candid and straight to the point; "balanced" = a mix of both. Give extra attention to their biggest challenge and chosen focus area.

Analyze the following 9 categories. For each category:
- Give a score from 1 to 10 (use the 10-100 point anchors below to calibrate precisely, then divide by 10 for the final integer you write in the JSON "score" field — e.g. a performance you judge at 80 on the anchor scale becomes score: 8. The JSON "score" field must always be a whole number from 1 to 10, never the 10-100 anchor number itself.)
- Write 2-4 specific observations (reference timestamps where possible)
- Give 2-3 actionable improvement tips
- Acknowledge strengths directly and specifically — never generically
- Name weaknesses clearly and honestly — but never in a discouraging way

Categories (anchors shown on a 10-100 scale purely to help you calibrate precisely — interpolate between bands as needed, then divide your judgment by 10 for the JSON "score" field):

1. Filler Words — count filler words/sounds (um, uh, like, "you know", "basically", etc.) relative to total words spoken.
   90-100: fewer than 1 filler per 100 words.
   50-60: roughly 3-5 fillers per 100 words — noticeable but not disruptive.
   10-20: more than 8 fillers per 100 words, or fillers appear in nearly every sentence.

2. Speaking Pace — estimate words per minute (WPM) and consistency.
   90-100: 130-160 WPM, steady and natural, no rushed or dragging stretches.
   50-60: consistently outside 130-160 WPM (e.g. 100-129 or 161-190), or noticeably inconsistent pace, but still understandable.
   10-20: below 90 or above 200 WPM sustained, or pace swings wildly enough to impair comprehension.

3. Use of Pauses — frequency and placement of pauses relative to sentence/clause boundaries.
   90-100: pauses are deliberate, placed at clause/sentence boundaries, roughly one meaningful pause every 15-20 seconds of speech.
   50-60: pauses exist but are either too rare (speech feels rushed, no breathing room) or too frequent/hesitant (breaks flow every few seconds).
   10-20: pauses are erratic, mostly filled with hesitation sounds ("um", "äh") rather than silence, or speech has almost no pauses at all.

4. Eye Contact — percentage of total speaking time spent looking at the camera lens (or, if visible, the audience).
   90-100: eye contact maintained roughly 80-100% of speaking time, only brief natural glances away.
   50-60: eye contact roughly 40-60% of speaking time, frequently looking away, down, or at notes/screen.
   10-20: eye contact below 20% of speaking time — mostly reading, looking down, or avoiding the camera.

5. Body Language & Gestures — openness of posture and purposefulness of hand/arm movement.
   90-100: open posture, purposeful gestures that emphasize key points roughly 70%+ of the time, minimal nervous movement.
   50-60: some purposeful gestures but repetitive, or posture partially closed (arms crossed / hands in pockets) part of the time.
   10-20: closed/rigid posture most of the time, or constant nervous fidgeting (touching face/hair, shifting weight) throughout.

6. Facial Expression — how often expression is animated/engaged versus flat or tense.
   90-100: expression actively matches content (natural smiles, eyebrow movement, emphasis) most of the time, appears relaxed.
   50-60: mostly neutral with occasional animation — engaged expression less than half the time.
   10-20: flat/expressionless or visibly tense (clenched jaw, forced smile, strained look) for nearly the entire video.

7. Voice Modulation — variation in pitch, volume, and energy tied to meaning.
   90-100: clear, intentional pitch/volume variation throughout, energy sustained to the end.
   50-60: some variation present but flattens into monotone for stretches longer than ~30 seconds.
   10-20: largely monotone throughout, minimal audible change in pitch, volume, or energy.

8. Content Structure — presence and clarity of intro, main points, and conclusion.
   90-100: clear opening that states the topic/goal within the first 10-15 seconds, logically ordered main points with signposting ("first... next... finally"), and a clear conclusion or summary.
   50-60: structure is present but weak — e.g. missing a clear conclusion, or transitions between points are unclear.
   10-20: no discernible structure — ideas are out of order, rambling, no clear intro or conclusion.

9. Overall Confidence & Presence — composite of composure and visible nervousness across the whole video.
   90-100: consistent composure, commands attention, minimal nervous tells (no visible shaking, no reading verbatim from notes/screen).
   50-60: adequate presence but noticeable nervousness at times (some fidgeting, brief voice shake, occasional avoidance of camera).
   10-20: presence undermined by visible anxiety — shaking, reading from notes/screen throughout, avoiding the camera, or trailing off mid-sentence repeatedly.

After all 9 categories:
- Write a free-text summary (max 120 words). Begin immediately with the single most important finding — no greeting, no "great to see you working on yourself", no warm-up sentence. Be direct and honest; the tone must match the scores. Low scores get blunt, constructive criticism. High scores get direct acknowledgement of what works.
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

CRITICAL: The "name" field of each category MUST use the EXACT English names listed above (e.g. "Filler Words", "Body Language & Gestures", "Overall Confidence & Presence"). Never translate the "name" field — only translate "observations", "tips", "summary", and "exercises".

The video can be up to 5 minutes long. Provide deep analysis but be concise and structured in your descriptions. Ensure your entire response strictly fits into a single, valid JSON object. Do not exceed length limits; prioritize density of feedback over wordiness so the JSON structure never breaks or gets truncated. Keep each observation and tip to one short sentence, and keep the summary under 120 words.

Respond in the same language the user spoke in the video.`;
}

async function uploadVideoToGeminiFiles(
  videoUri: string,
  onProgress?: ProgressCb
): Promise<string> {
  const mimeType = 'video/mp4';

  // Step 0: Compress the video BEFORE uploading. A full-quality phone clip can be
  // 50–100 MB+ for just over a minute, which is far too slow to upload over a
  // typical mobile/Wi-Fi upstream (that was the real cause of the 42% stall /
  // 90s upload timeout). 'auto' downscales to roughly 720p — more than enough for
  // speech/body-language analysis — and the resulting file is a local file:// URI,
  // which also resolves the Android content:// problem for free.
  let localUri = videoUri;
  try {
    console.log('[Gemini] Compressing video before upload…');
    const compressed = await VideoCompressor.compress(
      videoUri,
      { compressionMethod: 'auto' },
      (p) => onProgress?.(0.05 + p * 0.15) // compression spans 5%→20% of the bar
    );
    localUri = compressed;
    const cf = new File(compressed);
    console.log(
      '[Gemini] Compressed →',
      compressed,
      '— size:',
      cf.exists ? cf.size : '?',
      'bytes'
    );
  } catch (compressErr: any) {
    // Compression failed — fall back to the original. content:// URIs still need
    // to be copied to a readable file:// path for the native upload.
    console.warn('[Gemini] Compression failed, using original video:', compressErr?.message);
    if (videoUri.startsWith('content://')) {
      const dest = new File(Paths.cache, `prezence_${Date.now()}.mp4`).uri;
      await copyAsync({ from: videoUri, to: dest });
      localUri = dest;
    }
  }
  onProgress?.(0.2);

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
  onProgress?.(0.25); // upload initiated (after compression)

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

// ─── Video-Vergleich ─────────────────────────────────────────────────────────

const COMPARE_TIMEOUT_MS = 480_000; // 8 min — zwei Uploads + Processing

/** Maps a 0-1 sub-fraction onto the range [from, to] for the outer progress bar. */
function subProgress(cb: ProgressCb | undefined, from: number, to: number): ProgressCb {
  return (p) => cb?.(from + p * (to - from));
}

function buildComparePrompt(userContext: string): string {
  const ctx = userContext.trim();
  return `You are an elite communication coach. The user has submitted TWO speaking videos.
Video 1 is the EARLIER recording, Video 2 is the MORE RECENT recording.

Your job: compare them and identify meaningful developments in the speaker's communication skills.
${ctx ? `\nUser context (address this explicitly in contextResponse): "${ctx}"\n` : ''}
Detect the language the speaker uses and write your ENTIRE response in that language.
If German, always use informal "du" — never "Sie".

Start every field directly with the content — no greeting, no "it's great that you're working on yourself", no opening pleasantry. Be honest and specific: if there is clear improvement, say so directly; if there is decline or no progress, say that too.

Identify the 2–3 most noteworthy changes across these categories:
Filler Words · Speaking Pace · Use of Pauses · Eye Contact · Body Language & Gestures ·
Facial Expression · Voice Modulation · Content Structure · Overall Confidence & Presence

Return ONLY valid JSON — no markdown fences, no extra text:
{
  "overallChange": "2-3 sentences describing the overall development",
  "categoryComparisons": [
    {
      "category": "Category name in the speaker's language",
      "direction": "improved",
      "observation": "One specific sentence comparing this category between both videos"
    }
  ],
  "contextResponse": "Specific response to user context, or null",
  "coachComment": "2-3 sentences of honest, motivating closing comment"
}

Rules:
- Exactly 2–3 items in categoryComparisons
- direction must be exactly "improved", "declined", or "same"
- contextResponse must be null (JSON null, not the string "null") if no user context was given
- Reference what you actually see — be specific, not generic`;
}

function validateComparisonResult(raw: any): ComparisonResult {
  const validDirections = new Set(['improved', 'declined', 'same']);
  const cats: ComparisonCategoryItem[] = Array.isArray(raw.categoryComparisons)
    ? raw.categoryComparisons.slice(0, 3).map((c: any) => ({
        category:    String(c.category   || ''),
        direction:   validDirections.has(c.direction) ? c.direction : 'same',
        observation: String(c.observation || ''),
      }))
    : [];

  return {
    overallChange:       typeof raw.overallChange  === 'string' ? raw.overallChange  : '',
    categoryComparisons: cats,
    contextResponse:     typeof raw.contextResponse === 'string' && raw.contextResponse
                           ? raw.contextResponse : null,
    coachComment:        typeof raw.coachComment   === 'string' ? raw.coachComment   : '',
  };
}

export async function compareVideos(
  videoUri1:   string,
  videoUri2:   string,
  userContext: string,
  onProgress?: ProgressCb,
): Promise<ComparisonResult> {
  return Promise.race([
    doCompareVideos(videoUri1, videoUri2, userContext, onProgress),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), COMPARE_TIMEOUT_MS)
    ),
  ]);
}

async function doCompareVideos(
  videoUri1:   string,
  videoUri2:   string,
  userContext: string,
  onProgress?: ProgressCb,
): Promise<ComparisonResult> {
  // API probe
  console.log('[Gemini Compare] Probing API…');
  try {
    const probe = genAI.getGenerativeModel({ model: GEMINI_MODEL, generationConfig: { maxOutputTokens: 8 } });
    await probe.generateContent('Hello');
  } catch (err: any) {
    throw new Error(`GEMINI_API_ERROR: probe failed — ${err.message}`);
  }
  onProgress?.(0.04);

  // Upload video 1  (progress 0.04 → 0.40)
  console.log('[Gemini Compare] Uploading video 1…');
  let fileUri1: string;
  try {
    fileUri1 = await uploadVideoToGeminiFiles(videoUri1, subProgress(onProgress, 0.04, 0.40));
  } catch (err: any) {
    throw new Error(`UPLOAD_FAILED_V1: ${err.message}`);
  }

  // Upload video 2  (progress 0.40 → 0.76)
  console.log('[Gemini Compare] Uploading video 2…');
  let fileUri2: string;
  try {
    fileUri2 = await uploadVideoToGeminiFiles(videoUri2, subProgress(onProgress, 0.40, 0.76));
  } catch (err: any) {
    throw new Error(`UPLOAD_FAILED_V2: ${err.message}`);
  }

  // generateContent with both files  (progress 0.76 → 0.95)
  onProgress?.(0.76);
  console.log('[Gemini Compare] Sending both videos for comparison…');

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      // Low temperature so comparisons are consistent across runs — see doAnalyzeVideo.
      temperature:       0.1,
      topP:              0.95,
      maxOutputTokens:   4096,
      responseMimeType:  'application/json',
    },
  });

  let sdkResponse: any;
  try {
    sdkResponse = await model.generateContent([
      { fileData: { mimeType: 'video/mp4', fileUri: fileUri1 } },
      { fileData: { mimeType: 'video/mp4', fileUri: fileUri2 } },
      buildComparePrompt(userContext),
    ]);
  } catch (err: any) {
    throw new Error(`GEMINI_API_ERROR: ${err.message}`);
  }
  onProgress?.(0.95);

  const text = sdkResponse.response.text();
  if (!text) throw new Error('Empty response from Gemini');

  let raw: any;
  try {
    raw = extractJsonFromText(text);
  } catch (err: any) {
    throw new Error(`PARSE_ERROR: ${err.message}`);
  }

  const result = validateComparisonResult(raw);
  onProgress?.(1);
  return result;
}

// ─── Single-video analysis ────────────────────────────────────────────────────

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
      // Low temperature so the same video scores consistently across runs —
      // the analysis is a judgment/rubric task, not creative writing.
      temperature: 0.1,
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
