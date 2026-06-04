import express from 'express';
import {
  getStatsOverview,
  getUsers,
  updateUserRole,
  createCourse,
  updateCourse,
  deleteCourse,
  addLesson,
  updateLesson,
  deleteLesson
} from '../controllers/adminController.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All routes require both login and admin role
router.use(auth);
router.use(requireRole('admin'));

// Stats Overview
router.get('/overview', getStatsOverview);

// User Management
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);

// Course CRUD
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// Lesson CRUD under a course
router.post('/courses/:courseId/lessons', addLesson);
router.put('/lessons/:lessonId', updateLesson);
router.delete('/lessons/:lessonId', deleteLesson);

export default router;
