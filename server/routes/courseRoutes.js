import express from 'express';
import {
  getCourses,
  getCourseDetails,
  purchaseCourse,
  getLessonQuiz,
  saveUserProgress,
  getUserProgress,
  getLandingCourses,
  submitLessonAssessment,
  getCertificateStatus,
  getCourseResources,
  createCourseResource,
  getCourseDiscussions,
  createCourseDiscussion,
  createDiscussionReply,
  resolveDiscussionThread,
} from '../controllers/courseController.js';
import auth from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/landing', getLandingCourses);
router.get('/quiz/:lessonId', auth, getLessonQuiz);
router.get('/progress/:courseId', auth, getUserProgress);
router.post('/progress', auth, saveUserProgress);
router.get('/certificates/:courseId', auth, getCertificateStatus);
router.post('/assessments/submit', auth, submitLessonAssessment);
router.get('/:courseId/resources', auth, getCourseResources);
router.post('/:courseId/resources', auth, createCourseResource);
router.get('/:courseId/discussions', auth, getCourseDiscussions);
router.post('/:courseId/discussions', auth, createCourseDiscussion);
router.post('/:courseId/discussions/:threadId/replies', auth, createDiscussionReply);
router.patch('/:courseId/discussions/:threadId/resolve', auth, resolveDiscussionThread);
router.get('/', auth, getCourses);
router.get('/:id', auth, getCourseDetails);
router.post('/purchase', auth, purchaseCourse);

export default router;
