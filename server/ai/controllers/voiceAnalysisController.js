/**
 * AI Controller — Voice Analysis
 * Handles: POST /api/ai/voice/analyze
 *
 * Receives pre-processed audio metrics from the frontend (Web Audio API)
 * and uses Gemini AI to interpret and generate feedback.
 *
 * Architecture Note:
 * Actual audio capture and pitch extraction happen in the browser (React frontend)
 * using the Web Audio API or a library like pitchy/ml5.js.
 * The frontend sends extracted numeric metrics (Hz, cents, ms) to this endpoint.
 * This controller interprets those metrics with AI and returns feedback JSON.
 */

import { getGeminiModel } from '../config/geminiClient.js';
import { buildVoiceAnalysisPrompt } from '../prompts/voiceAnalysisPrompts.js';
import { parseJsonResponse, successResponse, errorResponse, generateTraceId } from '../utils/responseUtils.js';

/**
 * POST /api/ai/voice/analyze
 *
 * Request body:
 * {
 *   taskType                : string,    // e.g. "sing_note", "match_pitch"
 *   expectedNote            : string,    // e.g. "Sa", "C4", "Pa"
 *   instrument              : string,
 *   tradition               : string,
 *   lessonTitle             : string,
 *   studentPerformanceData  : {
 *     detectedPitchHz       : number | null,
 *     expectedPitchHz       : number | null,
 *     pitchDeviationCents   : number | null,   // + = too high, - = too low
 *     rhythmDelayMs         : number | null,   // + = delayed, - = early
 *     sustainDurationMs     : number | null,
 *     expectedDurationMs    : number | null,
 *     amplitudeVariance     : number | null,   // 0 = steady, high = wavering
 *     rawTranscription      : string | null    // optional speech-to-text
 *   }
 * }
 */
export const analyzeVoicePerformance = async (req, res) => {
  const traceId = generateTraceId();

  try {
    const {
      taskType,
      expectedNote,
      instrument              = 'vocal',
      tradition               = 'general',
      lessonTitle             = '',
      studentPerformanceData,
    } = req.body;

    console.log(`[AI Voice] ${traceId} — taskType=${taskType}, expectedNote=${expectedNote}`);

    const prompt = buildVoiceAnalysisPrompt({
      taskType,
      expectedNote,
      studentPerformanceData,
      instrument,
      tradition,
      lessonTitle,
    });

    const model   = getGeminiModel();
    const result  = await model.generateContent(prompt);
    const rawText = result.response.text();

    let analysisData;
    try {
      analysisData = parseJsonResponse(rawText);
    } catch (parseErr) {
      console.error(`[AI Voice] ${traceId} — JSON parse error:`, parseErr.message);
      return res.status(502).json(errorResponse('PARSE_ERROR', 'AI returned malformed JSON.'));
    }

    analysisData.traceId    = traceId;
    analysisData.analyzedAt = new Date().toISOString();

    return res.status(200).json(successResponse(analysisData, 'Voice analysis completed successfully.'));

  } catch (err) {
    console.error(`[AI Voice] ${traceId} — Error:`, err.message);

    if (err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json(errorResponse('RATE_LIMIT', 'AI service is temporarily busy. Please try again.'));
    }

    return res.status(500).json(errorResponse('SERVER_ERROR', err.message));
  }
};
