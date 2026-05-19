/**
 * AI Routes — Recommendation Engine
 * Base path: /api/ai/recommend
 */

import express from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';
import { validateRecommendationInput } from '../middleware/validateAiInput.js';
import auth from '../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/ai/recommend
 * Submit student performance data and receive personalised AI recommendations.
 * Protected: requires valid JWT.
 */
router.post('/', auth, validateRecommendationInput, getRecommendations);
router.post('/adaptive-path', auth, validateRecommendationInput, getRecommendations);

export default router;
