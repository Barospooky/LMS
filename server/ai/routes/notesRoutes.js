/**
 * AI Routes — Notes Generator
 * Base path: /api/ai/notes
 */

import express from 'express';
import { generateNotes } from '../controllers/notesController.js';
import { validateNotesInput } from '../middleware/validateAiInput.js';
import auth from '../../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/ai/notes/generate
 * Generate structured AI study notes for a lesson.
 * Protected: requires valid JWT.
 */
router.post('/generate', auth, validateNotesInput, generateNotes);

export default router;
