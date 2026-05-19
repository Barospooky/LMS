/**
 * AI Routes — Assessment Generator
 * Base path: /api/ai/assessment
 */

import express from 'express';
import { generateAssessment } from '../controllers/assessmentController.js';
import { validateAssessmentInput } from '../middleware/validateAiInput.js';
import auth from '../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/ai/assessment/generate
 * Generate an AI assessment (MCQ / Voice Practice / Mixed) for a lesson.
 * Protected: requires valid JWT.
 */
router.post('/generate', auth, validateAssessmentInput, generateAssessment);

export default router;
