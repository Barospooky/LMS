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
    pitchConfidence     = 1.0,
    avgRms              = 0.1,
    maxRms              = 0.2,
  } = studentPerformanceData;

  return `
${buildMusicLMSPreamble({ instrument, tradition, lessonTitle })}

You are a professional music teacher and trainer analysing a student's voice/music performance.
Based on the performance metrics below, provide accurate, highly constructive, encouraging, and beginner-friendly feedback.

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
- Sustain Duration (ms)  : ${sustainDurationMs !== null ? sustainDurationMs : 'N/A'} ms
- Expected Duration (ms) : ${expectedDurationMs !== null ? expectedDurationMs : 'N/A'} ms
- Amplitude Variance     : ${amplitudeVariance !== null ? amplitudeVariance : 'N/A'}
  (low = steady tone, high = wavering)
- Pitch Confidence (0-1) : ${pitchConfidence !== null ? pitchConfidence : 1.0}
  (percentage of stable pitch frames captured)
- Audio Energy (avg RMS) : ${avgRms !== null ? avgRms : 0.1}
  (overall input volume signal strength)
${rawTranscription ? `- Student Sang/Said: "${rawTranscription}"` : ''}

CRITICAL Music Trainer Grading Guidelines:
1. ADAPTIVE PITCH TOLERANCE (Beginner-Friendly):
   - Pitch perfect    : within ±30 cents (allow minor natural fluctuations).
   - Pitch acceptable : within ±80 cents (allow beginner instability / vibrato).
   - Pitch off        : more than ±80 cents.
2. DO NOT INSTANTLY FAIL:
   - If audio energy (avg RMS) was detected, NEVER give a 0 score. Human singing naturally wavers.
   - If the student made an effort but the pitch was slightly off or unstable, provide a partial passing score (e.g. 70-79) or a supportive partial score (e.g. 55-65) along with constructive suggestions.
3. FINAL SCORING COMPOSITION:
   - Combine: Pitch Accuracy (60%), Stability & Confidence (20%), Rhythm & Duration (10%), and Audio Clarity (10%).
   - Do not use binary pass/fail logic. Be a real trainer.
4. DETAILED HUMAN-LIKE FEEDBACK:
   - Avoid generic phrases like "Try Again" or "Passed".
   - Use descriptive terms such as "Pitch slightly unstable", "Voice detected but too soft", "Try holding the note longer", "Great vocal support", "Rhythm timing slightly delayed", or "Steady pitch matching".

Return ONLY this exact JSON structure:
{
  "taskType": "${taskType}",
  "expectedNote": "${expectedNote || 'N/A'}",
  "overallScore": <0-100 integer>,
  "passed": <true if overall score >= 70>,
  "pitchAnalysis": {
    "status": "<perfect | acceptable | slightly_high | slightly_low | off>",
    "deviationCents": ${pitchDeviationCents || 0},
    "feedback": "<specific, descriptive pitch feedback message>"
  },
  "rhythmAnalysis": {
    "status": "<perfect | acceptable | delayed | early | off>",
    "delayMs": ${rhythmDelayMs || 0},
    "feedback": "<descriptive rhythm feedback message>"
  },
  "sustainAnalysis": {
    "status": "<perfect | too_short | too_long | acceptable>",
    "feedback": "<sustain feedback or null>"
  },
  "toneQuality": {
    "status": "<steady | slightly_wavering | wavering>",
    "feedback": "<tone quality stability feedback>"
  },
  "overallFeedback": "<encouraging 1-2 sentence summary that a music teacher would say>",
  "improvementTip": "<one specific, actionable tip to improve next attempt>",
  "encouragement": "<short motivating message>"
}
`.trim();
};
