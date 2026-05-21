import * as FileSystem from 'expo-file-system';
import { OnboardingAnswers, AnalysisReport, CategoryResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
const GEMINI_MODEL = 'gemini-1.5-pro';
const GEMINI_FILES_API = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
const GEMINI_GENERATE_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const ANALYSIS_TIMEOUT_MS = 120000; // 2 minutes

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

  const purposeText = purposeLabels[answers.purpose] || answers.purpose;
  const focusText = focusLabels[answers.focusArea] || answers.focusArea;
  const langText = answers.videoLanguage === 'deutsch' ? 'German' : answers.videoLanguage === 'english' ? 'English' : 'Other';

  return `You are an elite communication coach with expertise in public speaking, rhetoric, body language, and personal presence. The user has submitted a video of themselves speaking. Your job is to analyze the video thoroughly and return a structured coaching report.

User context:
- Purpose: ${purposeText}
- Language spoken: ${langText}
- Focus area: ${focusText}

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

Respond in the same language the user spoke in the video.`;
}

async function uploadVideoToGeminiFiles(videoUri: string): Promise<string> {
  // Read file info
  const fileInfo = await FileSystem.getInfoAsync(videoUri);
  if (!fileInfo.exists) {
    throw new Error('Video file not found');
  }

  // Read file as base64
  const base64Data = await FileSystem.readAsStringAsync(videoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const mimeType = 'video/mp4';

  // Initiate resumable upload
  const initiateResponse = await fetch(
    `${GEMINI_FILES_API}?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String((fileInfo as any).size || base64Data.length),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: { display_name: `prezence_video_${Date.now()}.mp4` },
      }),
    }
  );

  if (!initiateResponse.ok) {
    const errText = await initiateResponse.text();
    throw new Error(`Failed to initiate upload: ${errText}`);
  }

  const uploadUrl = initiateResponse.headers.get('x-goog-upload-url');
  if (!uploadUrl) {
    throw new Error('No upload URL received from Gemini Files API');
  }

  // Convert base64 to binary for upload
  const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

  // Upload file bytes
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
    },
    body: binaryData,
  });

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    throw new Error(`Failed to upload video: ${errText}`);
  }

  const uploadResult = await uploadResponse.json();
  const fileUri = uploadResult?.file?.uri;

  if (!fileUri) {
    throw new Error('No file URI returned after upload');
  }

  // Poll for file to become ACTIVE
  await waitForFileActive(fileUri);

  return fileUri;
}

async function waitForFileActive(fileUri: string): Promise<void> {
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
      return;
    }

    if (fileData.state === 'FAILED') {
      throw new Error('File processing failed on Gemini servers');
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('File did not become active in time');
}

function extractJsonFromText(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // ignore
  }

  // Try to find JSON block in markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // ignore
    }
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // ignore
    }
  }

  throw new Error('Could not extract JSON from Gemini response');
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
  userId: string = 'anonymous'
): Promise<AnalysisReport> {
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ANALYSIS_TIMEOUT_MS)
  );

  const analysisPromise = doAnalyzeVideo(videoUri, answers, userLanguage, userId);

  return Promise.race([analysisPromise, timeoutPromise]);
}

async function doAnalyzeVideo(
  videoUri: string,
  answers: OnboardingAnswers,
  userLanguage: string,
  userId: string
): Promise<AnalysisReport> {
  // Step 1: Upload video to Gemini Files API
  let geminiFileUri: string;
  try {
    geminiFileUri = await uploadVideoToGeminiFiles(videoUri);
  } catch (error: any) {
    throw new Error(`UPLOAD_FAILED: ${error.message}`);
  }

  // Step 2: Build prompt
  const systemPrompt = buildSystemPrompt(answers, userLanguage);

  // Step 3: Send to Gemini 1.5 Pro
  const requestBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        parts: [
          {
            file_data: {
              mime_type: 'video/mp4',
              file_uri: geminiFileUri,
            },
          },
          {
            text: 'Please analyze this speaking video and return the structured JSON report as specified.',
          },
        ],
      },
    ],
    generation_config: {
      temperature: 0.4,
      top_p: 0.95,
      max_output_tokens: 4096,
    },
  };

  const response = await fetch(`${GEMINI_GENERATE_API}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GEMINI_API_ERROR: ${response.status} ${errText}`);
  }

  const geminiResponse = await response.json();

  // Extract text from response
  const textContent =
    geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('Empty response from Gemini API');
  }

  // Parse JSON from response
  let rawData: any;
  try {
    rawData = extractJsonFromText(textContent);
  } catch (parseError) {
    throw new Error(`PARSE_ERROR: Could not parse Gemini response as JSON`);
  }

  // Validate and normalize
  return validateAndNormalizeReport(rawData, videoUri, userId, answers);
}
