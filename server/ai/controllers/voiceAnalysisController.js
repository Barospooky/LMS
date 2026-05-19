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
 *     detectedPitch      : number | null,
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
      instrument = 'vocal',
      tradition = 'general',
      lessonTitle = '',
      studentPerformanceData,
    } = req.body;

    console.log(`[AI Voice] ${traceId} — taskType=${taskType}, expectedNote=${expectedNote}`);

    // 1. Audio too loud / clipping check (bypass Gemini to protect quota and hearing)
    if (studentPerformanceData?.isTooLoud || studentPerformanceData?.avgRms > 0.45) {
      console.log(`[AI Voice] ${traceId} — Bypassing Gemini: Audio is too loud / noise detected (avgRms=${studentPerformanceData?.avgRms}).`);
      const analysisData = {
        overallScore: 0,
        passed: false,
        pitchAnalysis: {
          status: 'off',
          deviationCents: 0,
          feedback: "The input audio is too loud or contains too much background noise. Please reduce your volume or move to a quieter environment."
        },
        overallFeedback: 'Loud noise detected. To protect your hearing and get accurate analysis, please lower the volume and try again.',
        improvementTip: 'Ensure you are in a quiet room and singing/playing at a moderate volume.',
        encouragement: 'Let\'s try that again with lower volume!',
        traceId,
        analyzedAt: new Date().toISOString()
      };
      return res.status(200).json(successResponse(analysisData, 'Voice analysis bypassed due to excessive noise/volume.'));
    }

    // 2. Audio too weak / quiet check (low signal strength check)
    if (studentPerformanceData?.isWeakSignal) {
      console.log(`[AI Voice] ${traceId} — Bypassing Gemini: Audio signal is weak (avgRms=${studentPerformanceData?.avgRms}).`);
      const analysisData = {
        overallScore: 55, // partial score, not failing with 0
        passed: false,
        status: "weak_audio",
        message: "Voice detected but audio quality is low.",
        pitchAnalysis: {
          status: 'weak_audio',
          deviationCents: 0,
          feedback: "Voice detected but audio quality is low."
        },
        overallFeedback: 'Voice detected but audio quality is low. Try singing slightly louder or closer to the microphone.',
        improvementTip: 'Check your microphone settings, speak closer to the mic, and make sure your input volume is sufficient.',
        encouragement: 'Try again with a slightly louder voice!',
        traceId,
        analyzedAt: new Date().toISOString()
      };
      return res.status(200).json(successResponse(analysisData, 'Voice analysis completed with weak signal.'));
    }

    // 3. Audio detected but pitch tracking failed (waveform exists but no periodic pitch, e.g. talking/noise)
    if (studentPerformanceData?.detectedPitchHz === null && studentPerformanceData?.maxRms > 0.01) {
      console.log(`[AI Voice] ${traceId} — Bypassing Gemini: Audio detected but pitch tracking failed.`);
      const analysisData = {
        overallScore: 60, // partial score, not 0
        passed: false,
        pitchAnalysis: {
          status: 'off',
          deviationCents: 0,
          feedback: "Unstable pitch or spoken voice detected. Try to hum a clear, steady musical note."
        },
        overallFeedback: 'Voice detected but pitch was unstable or too brief. Make sure you sing/play a steady, continuous tone.',
        improvementTip: 'Try to hold a single steady vowel sound (like "Aaah") at a constant pitch.',
        encouragement: 'You are close! Keep practicing your pitch stability.',
        traceId,
        analyzedAt: new Date().toISOString()
      };
      return res.status(200).json(successResponse(analysisData, 'Voice analysis completed with unstable pitch.'));
    }

    const prompt = buildVoiceAnalysisPrompt({
      taskType,
      expectedNote,
      studentPerformanceData,
      instrument,
      tradition,
      lessonTitle,
    });

    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    let analysisData;
    try {
      analysisData = parseJsonResponse(rawText);
    } catch (parseErr) {
      console.error(`[AI Voice] ${traceId} — JSON parse error:`, parseErr.message);
      return res.status(502).json(errorResponse('PARSE_ERROR', 'AI returned malformed JSON.'));
    }

    analysisData.traceId = traceId;
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
