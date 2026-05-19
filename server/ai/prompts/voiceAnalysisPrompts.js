/**
 * AI Service — Voice Analysis Prompt Handler
 * Builds prompts for AI-driven voice/pitch/rhythm analysis.
 *
 * NOTE: Because browser-side audio analysis is required to extract
 * numeric pitch/frequency data, this module receives pre-processed
 * performance metrics from the frontend (or a Web Audio API layer).
 * The AI then interprets those metrics and generates human-readable feedback.
 */

import { buildMusicLMSPreamble } from '../utils/promptUtils.js';

/**
 * Build the prompt for voice performance analysis.
 *
 * @param {object} params
 * @param {string} params.taskType - e.g. 'sing_note', 'match_pitch'
 * @param {string} params.expectedNote - The target note/phrase
 * @param {object} params.studentPerformanceData - Metrics from Web Audio API
 * @param {string} params.instrument
 * @param {string} params.tradition
 */
export const buildVoiceAnalysisPrompt = ({
  taskType,
  expectedNote,
  studentPerformanceData,
  instrument = 'vocal',
  tradition  = 'general',
  lessonTitle = '',
}) => {
  const {
    detectedPitchHz     = null,
    expectedPitchHz     = null,
    pitchDeviationCents = null,
    rhythmDelayMs       = null,
    sustainDurationMs   = null,
    expectedDurationMs  = null,
    amplitudeVariance   = null,
    rawTranscription    = null,
  } = studentPerformanceData;

  return `
${buildMusicLMSPreamble({ instrument, tradition, lessonTitle })}

You are a professional music teacher analysing a student's voice/music performance.
Based on the performance metrics below, provide accurate, constructive, and encouraging feedback.

Task Information:
- Task Type     : ${taskType}
- Expected Note : ${expectedNote || 'N/A'}
- Instrument    : ${instrument}
- Tradition     : ${tradition}

Performance Metrics:
- Detected Pitch (Hz)    : ${detectedPitchHz !== null ? detectedPitchHz : 'Not detected'}
- Expected Pitch (Hz)    : ${expectedPitchHz !== null ? expectedPitchHz : 'N/A'}
- Pitch Deviation (cents): ${pitchDeviationCents !== null ? pitchDeviationCents : 'N/A'} cents
  (0 cents = perfect, +cents = too high, -cents = too low; ±50 cents = ~half semitone)
- Rhythm Delay (ms)      : ${rhythmDelayMs !== null ? rhythmDelayMs : 'N/A'} ms
  (0 = on beat, positive = delayed, negative = early)
- Sustain Duration (ms)  : ${sustainDurationMs !== null ? sustainDurationMs : 'N/A'} ms
- Expected Duration (ms) : ${expectedDurationMs !== null ? expectedDurationMs : 'N/A'} ms
- Amplitude Variance     : ${amplitudeVariance !== null ? amplitudeVariance : 'N/A'}
  (low = steady tone, high = wavering)
${rawTranscription ? `- Student Sang/Said: "${rawTranscription}"` : ''}

Interpretation Thresholds:
- Pitch perfect    : within ±10 cents
- Pitch acceptable : within ±25 cents
- Pitch off        : more than ±25 cents
- Rhythm perfect   : within ±50ms
- Rhythm delayed   : more than +100ms
- Good sustain     : within 80–120% of expected duration

Return ONLY this exact JSON structure:
{
  "taskType": "${taskType}",
  "expectedNote": "${expectedNote || 'N/A'}",
  "overallScore": <0-100 integer>,
  "passed": <true if overall score >= 70>,
  "pitchAnalysis": {
    "status": "<perfect | acceptable | slightly_high | slightly_low | off>",
    "deviationCents": ${pitchDeviationCents || 0},
    "feedback": "<specific pitch feedback message>"
  },
  "rhythmAnalysis": {
    "status": "<perfect | acceptable | delayed | early | off>",
    "delayMs": ${rhythmDelayMs || 0},
    "feedback": "<specific rhythm feedback message>"
  },
  "sustainAnalysis": {
    "status": "<perfect | too_short | too_long | acceptable>",
    "feedback": "<sustain feedback or null>"
  },
  "toneQuality": {
    "status": "<steady | slightly_wavering | wavering>",
    "feedback": "<tone quality feedback>"
  },
  "overallFeedback": "<encouraging 1-2 sentence summary that a music teacher would say>",
  "improvementTip": "<one specific, actionable tip to improve next attempt>",
  "encouragement": "<short motivating message>"
}
`.trim();
};
