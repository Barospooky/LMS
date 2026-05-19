/**
 * AI Service — Validation Middleware
 * Input validation helpers for all AI endpoints.
 * Uses no external libraries — keeps the AI module dependency-free.
 */

import { DIFFICULTY_LEVELS, ASSESSMENT_TYPES, SUPPORTED_INSTRUMENTS } from '../config/aiConstants.js';

/**
 * Validates the request body for the Assessment Generator.
 */
export const validateAssessmentInput = (req, res, next) => {
  const { lessonId, type, questionCount, difficulty, instrument, lessonTitle, moduleContent } = req.body;

  const errors = [];

  if (!lessonId) errors.push('lessonId is required.');
  if (!type || !ASSESSMENT_TYPES.includes(type))
    errors.push(`type must be one of: ${ASSESSMENT_TYPES.join(', ')}.`);
  if (!difficulty || !DIFFICULTY_LEVELS.includes(difficulty))
    errors.push(`difficulty must be one of: ${DIFFICULTY_LEVELS.join(', ')}.`);

  const count = Number(questionCount);
  if (!questionCount || isNaN(count) || count < 1 || count > 20)
    errors.push('questionCount must be a number between 1 and 20.');

  if (!lessonTitle) errors.push('lessonTitle is required.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

/**
 * Validates the request body for the Notes Generator.
 */
export const validateNotesInput = (req, res, next) => {
  const { lessonId, lessonTitle } = req.body;

  const errors = [];

  if (!lessonId) errors.push('lessonId is required.');
  if (!lessonTitle) errors.push('lessonTitle is required.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

/**
 * Validates the request body for the Doubt Solver.
 */
export const validateDoubtInput = (req, res, next) => {
  const { question, courseContext } = req.body;

  const errors = [];

  if (!question || typeof question !== 'string' || question.trim().length < 5)
    errors.push('question must be a string with at least 5 characters.');

  if (!courseContext || typeof courseContext !== 'object')
    errors.push('courseContext object is required (lessonTitle, instrument, etc.).');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

/**
 * Validates the request body for the Recommendation Engine.
 */
export const validateRecommendationInput = (req, res, next) => {
  const { studentId, performanceData } = req.body;

  const errors = [];

  if (!studentId) errors.push('studentId is required.');
  if (!performanceData || typeof performanceData !== 'object')
    errors.push('performanceData object is required.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

/**
 * Validates the request body for the Voice Analysis endpoint.
 */
export const validateVoiceAnalysisInput = (req, res, next) => {
  const { taskType, expectedNote, studentPerformanceData } = req.body;

  const errors = [];

  if (!taskType) errors.push('taskType is required.');
  if (!studentPerformanceData) errors.push('studentPerformanceData is required.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};
