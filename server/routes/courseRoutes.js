import express from 'express';
import { getCourses, getCourseDetails, purchaseCourse, getLessonQuiz, saveUserProgress, getUserProgress } from '../controllers/courseController.js';
import auth from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/quiz/:lessonId', auth, getLessonQuiz);
router.get('/progress/:courseId', auth, getUserProgress);
router.post('/progress', auth, saveUserProgress);
router.get('/', auth, getCourses);
router.get('/:id', auth, getCourseDetails);
router.post('/purchase', auth, purchaseCourse);

export default router;
