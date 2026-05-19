/**
 * AI Controller — Notes Generator
 * Handles: POST /api/ai/notes/generate
 *
 * Generates structured study notes from lesson content using Gemini AI.
 */

import { getGeminiModel } from '../config/geminiClient.js';
import { buildNotesPrompt } from '../prompts/notesPrompts.js';
import { parseJsonResponse, successResponse, errorResponse, generateTraceId } from '../utils/responseUtils.js';

/**
 * POST /api/ai/notes/generate
 *
 * Request body:
 * {
 *   lessonId      : number,
 *   lessonTitle   : string,
 *   lessonOrder   : number,   // module number
 *   instrument    : string,
 *   tradition     : string,
 *   moduleContent : string    // lesson description or transcript
 * }
 */
export const generateNotes = async (req, res) => {
  const traceId = generateTraceId();

  try {
    const {
      lessonId,
      lessonTitle,
      lessonOrder   = 1,
      instrument    = '',
      tradition     = '',
      moduleContent = '',
    } = req.body;

    console.log(`[AI Notes] ${traceId} — lessonId=${lessonId}, lesson="${lessonTitle}"`);

    const prompt = buildNotesPrompt({ lessonTitle, instrument, tradition, moduleContent, lessonOrder });

    const model   = getGeminiModel();
    const result  = await model.generateContent(prompt);
    const rawText = result.response.text();

    let notesData;
    try {
      notesData = parseJsonResponse(rawText);
    } catch (parseErr) {
      console.error(`[AI Notes] ${traceId} — JSON parse error:`, parseErr.message);
      return res.status(502).json(errorResponse('PARSE_ERROR', 'AI returned malformed JSON.'));
    }

    notesData.lessonId    = lessonId;
    notesData.traceId     = traceId;
    notesData.generatedAt = new Date().toISOString();

    return res.status(200).json(successResponse(notesData, 'Notes generated successfully.'));

  } catch (err) {
    console.error(`[AI Notes] ${traceId} — Error:`, err.message);

    if (err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json(errorResponse('RATE_LIMIT', 'AI service is temporarily busy. Please try again.'));
    }

    return res.status(500).json(errorResponse('SERVER_ERROR', err.message));
  }
};
