/**
 * AI Routes — Doubt Solver
 * Base path: /api/ai/doubt
 */

import express from 'express';
import { solveDoubt } from '../controllers/doubtController.js';
import { validateDoubtInput } from '../middleware/validateAiInput.js';
import auth from '../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/ai/doubt/ask
 * Submit a student doubt and receive a context-grounded AI answer.
 * Protected: requires valid JWT.
 */
router.post('/ask', auth, validateDoubtInput, solveDoubt);

export default router;
