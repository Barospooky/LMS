/**
 * AI Controller — Doubt Solver
 * Handles: POST /api/ai/doubt/ask
 *
 * Answers student doubts strictly in the context of the active lesson/course.
 */

import { getGeminiModel } from '../config/geminiClient.js';
import { buildDoubtPrompt } from '../prompts/doubtPrompts.js';
import { parseJsonResponse, successResponse, errorResponse, generateTraceId } from '../utils/responseUtils.js';

/**
 * POST /api/ai/doubt/ask
 *
 * Request body:
 * {
 *   question      : string,   // the student's doubt
 *   courseContext : {
 *     courseTitle   : string,
 *     lessonTitle   : string,
 *     instrument    : string,
 *     tradition     : string,
 *     moduleContent : string  // optional lesson content for grounding
 *   }
 * }
 */
export const solveDoubt = async (req, res) => {
  const traceId = generateTraceId();

  try {
    const { question, courseContext } = req.body;

    console.log(`[AI Doubt] ${traceId} — question="${question.slice(0, 80)}..."`);

    const prompt = buildDoubtPrompt({ question, courseContext });

    const model   = getGeminiModel();
    const result  = await model.generateContent(prompt);
    const rawText = result.response.text();

    let doubtData;
    try {
      doubtData = parseJsonResponse(rawText);
    } catch (parseErr) {
      console.error(`[AI Doubt] ${traceId} — JSON parse error:`, parseErr.message);
      return res.status(502).json(errorResponse('PARSE_ERROR', 'AI returned malformed JSON.'));
    }

    doubtData.traceId     = traceId;
    doubtData.answeredAt  = new Date().toISOString();

    return res.status(200).json(successResponse(doubtData, 'Doubt answered successfully.'));

  } catch (err) {
    console.error(`[AI Doubt] ${traceId} — Error:`, err.message);

    if (err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json(errorResponse('RATE_LIMIT', 'AI service is temporarily busy. Please try again.'));
    }

    return res.status(500).json(errorResponse('SERVER_ERROR', err.message));
  }
};
