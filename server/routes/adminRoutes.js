import express from 'express';
import {
  getStatsOverview,
  getUsers,
  updateUserRole,
  getAdminCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  addLesson,
  updateLesson,
  deleteLesson
} from '../controllers/adminController.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { courseUpload, lessonUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// All routes require both login and admin/instructor role
router.use(auth);
router.use(requireRole('admin', 'instructor'));

// Stats Overview
router.get('/overview', getStatsOverview);

// User Management (Controller will restrict to Admin only)
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);

// Course CRUD
router.get('/courses', getAdminCourses);
router.post('/courses', courseUpload.single('thumbnail_file'), createCourse);
router.put('/courses/:id', courseUpload.single('thumbnail_file'), updateCourse);
router.delete('/courses/:id', deleteCourse);

// Lesson CRUD under a course
router.post('/courses/:courseId/lessons', lessonUpload.single('video_file'), addLesson);
router.put('/lessons/:lessonId', lessonUpload.single('video_file'), updateLesson);
router.delete('/lessons/:lessonId', deleteLesson);

export default router;
