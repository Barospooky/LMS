/**
 * AI Routes — Voice Analysis
 * Base path: /api/ai/voice
 */

import express from 'express';
import { analyzeVoicePerformance } from '../controllers/voiceAnalysisController.js';
import { validateVoiceAnalysisInput } from '../middleware/validateAiInput.js';
import auth from '../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/ai/voice/analyze
 * Submit extracted audio metrics for AI-powered pitch/rhythm/tone analysis.
 * Protected: requires valid JWT.
 */
router.post('/analyze', auth, validateVoiceAnalysisInput, analyzeVoicePerformance);

export default router;
