import express from 'express';
import auth from '../middleware/authMiddleware.js';
import { signup, login, googleLogin, refreshSession, getCurrentUser, logout } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/refresh', refreshSession);
router.get('/me', auth, getCurrentUser);
router.post('/logout', logout);

export default router;
