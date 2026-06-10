import express from 'express';
import auth from '../middleware/authMiddleware.js';
import authRateLimit from '../middleware/rateLimit.js';
import {
  signup,
  login,
  googleLogin,
  forgotPassword,
  validateResetToken,
  resetPassword,
  refreshSession,
  getCurrentUser,
  updateCurrentUser,
  logout,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', authRateLimit({ max: 8 }), signup);
router.post('/login', authRateLimit({ max: 10 }), login);
router.post('/google', authRateLimit({ max: 10 }), googleLogin);
router.post('/forgot-password', authRateLimit({ max: 5 }), forgotPassword);
router.get('/validate-token', authRateLimit({ max: 20 }), validateResetToken);
router.post('/reset-password', authRateLimit({ max: 5 }), resetPassword);
router.post('/refresh', refreshSession);
router.get('/me', auth, getCurrentUser);
router.patch('/me', auth, updateCurrentUser);
router.post('/logout', logout);

export default router;
