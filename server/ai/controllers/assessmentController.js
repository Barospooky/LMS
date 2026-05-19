/**
 * AI Controller — Assessment Generator
 * Handles: POST /api/ai/assessment/generate
 *
 * Generates MCQ, Voice Practice, or Mixed assessments using Gemini AI.
 */

import pool from '../../config/db.js';
import { generateAutomatedAssessment } from '../services/quizEngineService.js';
import { successResponse, errorResponse, generateTraceId } from '../utils/responseUtils.js';

/**
 * POST /api/ai/assessment/generate
 *
 * Request body:
 * {
 *   lessonId      : number,
 *   lessonTitle   : string,    // optional, enriched from DB
 *   instrument    : string,    // optional, enriched from DB
 *   tradition     : string,    // optional
 *   type          : "mcq" | "voice_practice" | "mixed",
 *   questionCount : number,    // 1–20
 *   difficulty    : "beginner" | "intermediate" | "advanced"
 * }
 */
export const generateAssessment = async (req, res) => {
  const traceId = generateTraceId();

  try {
    const {
      lessonId,
      lessonTitle,
      instrument    = '',
      tradition     = 'general',
      type          = 'mixed',
      questionCount = 5,
      difficulty    = 'intermediate',
    } = req.body;

    if (!lessonId) {
      return res.status(400).json(errorResponse('MISSING_LESSON_ID', 'lessonId is required for assessment generation.'));
    }

    console.log(`[AI Assessment] ${traceId} — lessonId=${lessonId}, type=${type}, count=${questionCount}, difficulty=${difficulty}`);

    // 1. Fetch and enrich lesson info from database to guarantee actual video/transcript data is used
    const infoRes = await pool.query(`
      SELECT l.title as lesson_title, l.video_url, c.instrument
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1
    `, [lessonId]);

    if (infoRes.rows.length === 0) {
      return res.status(404).json(errorResponse('LESSON_NOT_FOUND', `Lesson not found for ID: ${lessonId}`));
    }

    const lesson = infoRes.rows[0];
    const enrichedTitle = lesson.lesson_title || lessonTitle || 'Music Lesson';
    const enrichedVideoUrl = lesson.video_url || '';
    const enrichedInstrument = lesson.instrument || instrument || 'vocal';

    // 2. Call automated Quiz Generation Engine Service (Step 1-8 Workflow)
    const assessmentData = await generateAutomatedAssessment({
      lessonId,
      lessonTitle: enrichedTitle,
      videoUrl: enrichedVideoUrl,
      instrument: enrichedInstrument,
      tradition,
      type,
      questionCount: parseInt(questionCount, 10) || 5,
      difficulty
    });

    // 3. Attach workflow metadata
    assessmentData.lessonId = lessonId;
    assessmentData.traceId = traceId;
    assessmentData.generatedAt = new Date().toISOString();

    return res.status(200).json(successResponse(assessmentData, 'Assessment generated successfully using Gemini AI.'));

  } catch (err) {
    console.error(`[AI Assessment] ${traceId} — Unexpected error in workflow:`, err.message);

    if (err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json(errorResponse('RATE_LIMIT', 'AI service is temporarily busy. Please try again in a moment.'));
    }

    return res.status(500).json(errorResponse('SERVER_ERROR', err.message));
  }
};
