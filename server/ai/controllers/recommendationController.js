/**
 * AI Controller — Recommendation Engine
 * Handles: POST /api/ai/recommend
 *
 * Analyses student performance and returns personalised learning recommendations.
 */

import { getGeminiModel } from '../config/geminiClient.js';
import { buildRecommendationPrompt } from '../prompts/recommendationPrompts.js';
import { parseJsonResponse, successResponse, errorResponse, generateTraceId } from '../utils/responseUtils.js';

/**
 * POST /api/ai/recommend
 *
 * Request body:
 * {
 *   studentId       : string | number,
 *   studentName     : string,
 *   performanceData : {
 *     quizScores        : number[],    // e.g. [80, 60, 90]
 *     voiceAccuracy     : number[],    // e.g. [70, 85]
 *     completedLessons  : number[],    // lesson IDs
 *     weakTopics        : string[],    // e.g. ["pitch", "rhythm"]
 *     strongTopics      : string[],    // e.g. ["music_theory"]
 *     practiceStreak    : number,      // consecutive days practiced
 *     totalLessons      : number,
 *     currentLesson     : string,
 *     instrument        : string,
 *     tradition         : string
 *   },
 *   availableModules : [{ title: string, difficulty: string }]
 * }
 */
export const getRecommendations = async (req, res) => {
  const traceId = generateTraceId();

  try {
    const {
      studentId,
      studentName = 'Student',
      performanceData,
      availableModules = [],
    } = req.body;

    console.log(`[AI Recommend] ${traceId} — studentId=${studentId}`);

    const prompt = buildRecommendationPrompt({ studentName, performanceData, availableModules });

    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    let recommendData;
    try {
      recommendData = parseJsonResponse(rawText);
    } catch (parseErr) {
      console.error(`[AI Recommend] ${traceId} — JSON parse error:`, parseErr.message);
      return res.status(502).json(errorResponse('PARSE_ERROR', 'AI returned malformed JSON.'));
    }

    recommendData.studentId = studentId;
    recommendData.traceId = traceId;
    recommendData.generatedAt = new Date().toISOString();

    return res.status(200).json(successResponse(recommendData, 'Recommendations generated successfully.'));

  } catch (err) {
    console.error(`[AI Recommend] ${traceId} — Error:`, err.message);

    if (err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json(errorResponse('RATE_LIMIT', 'AI service is temporarily busy. Please try again.'));
    }

    return res.status(500).json(errorResponse('SERVER_ERROR', err.message));
  }
};
