import express from 'express';
import auth from '../middleware/authMiddleware.js';
import authRateLimit from '../middleware/rateLimit.js';
import { signup, login, googleLogin, refreshSession, getCurrentUser, updateCurrentUser, logout } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', authRateLimit({ max: 8 }), signup);
router.post('/login', authRateLimit({ max: 10 }), login);
router.post('/google', authRateLimit({ max: 10 }), googleLogin);
router.post('/refresh', refreshSession);
router.get('/me', auth, getCurrentUser);
router.patch('/me', auth, updateCurrentUser);
router.post('/logout', logout);

export default router;
