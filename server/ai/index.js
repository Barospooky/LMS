/**
 * AI Service — Master Router
 * Mounts all AI sub-routes under /api/ai
 *
 * Integration:
 *   In server/index.js add ONE line:
 *   import aiRoutes from './ai/index.js';
 *   app.use('/api/ai', aiRoutes);
 */

import express from 'express';
import assessmentRoutes    from './routes/assessmentRoutes.js';
import notesRoutes         from './routes/notesRoutes.js';
import doubtRoutes         from './routes/doubtRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import voiceRoutes         from './routes/voiceRoutes.js';
import chatbotRoutes       from './routes/chatbotRoutes.js';

const router = express.Router();

// Health-check — GET /api/ai/healt
router.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'Melody LMS — AI Service',
    version: '1.0.0',
    features: ['assessment', 'notes', 'doubt', 'recommendation', 'voice'],
    timestamp: new Date().toISOString(),
  });
});

// Feature routers
router.use('/assessment',  assessmentRoutes);    // POST /api/ai/assessment/generate
router.use('/notes',       notesRoutes);         // POST /api/ai/notes/generate
router.use('/doubt',       doubtRoutes);         // POST /api/ai/doubt/ask
router.use('/recommend',   recommendationRoutes); // POST /api/ai/recommend
router.use('/recommendation', recommendationRoutes); // POST /api/ai/recommendation
router.use('/voice',       voiceRoutes);         // POST /api/ai/voice/analyze
router.use('/chatbot',     chatbotRoutes);       // POST /api/ai/chatbot

export default router;
