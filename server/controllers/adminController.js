import pool from '../config/db.js';
import path from 'path';

const toPublicUploadUrl = (req, filePath) => {
  if (!filePath) return '';

  const normalized = filePath.replace(/\\/g, '/');
  const uploadsIndex = normalized.indexOf('uploads/');
  const relativePath = uploadsIndex >= 0 ? normalized.slice(uploadsIndex + 'uploads/'.length) : path.basename(normalized);
  return `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
};

// Stats Overview
export const getStatsOverview = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    if (role === 'admin') {
      const coursesCount = await pool.query('SELECT COUNT(*) FROM courses');
      const usersCount = await pool.query('SELECT COUNT(*) FROM users');
      const enrollmentsCount = await pool.query('SELECT COUNT(*) FROM user_courses');
      
      const revenueRes = await pool.query("SELECT SUM(amount) AS total FROM payments WHERE status = 'paid'");
      const totalRevenue = parseFloat(revenueRes.rows[0].total || 0);

      const recentUsers = await pool.query(
        'SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY id DESC LIMIT 5'
      );

      const recentEnrollments = await pool.query(`
        SELECT uc.user_id, uc.course_id, uc.purchased_at,
               u.first_name, u.last_name, u.email,
               c.title AS course_title
        FROM user_courses uc
        JOIN users u ON uc.user_id = u.id
        JOIN courses c ON uc.course_id = c.id
        ORDER BY uc.purchased_at DESC
        LIMIT 5
      `);

      const categoryDistribution = await pool.query(`
        SELECT category, COUNT(*) AS count
        FROM courses
        GROUP BY category
      `);

      const revenueTrend = await pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month_label,
          DATE_TRUNC('month', created_at) AS month_start,
          COALESCE(SUM(amount), 0) AS revenue
        FROM payments
        WHERE status = 'paid'
          AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month_start ASC
      `);

      const enrollmentTrend = await pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', purchased_at), 'Mon') AS month_label,
          DATE_TRUNC('month', purchased_at) AS month_start,
          COUNT(*) AS enrollments
        FROM user_courses
        WHERE purchased_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', purchased_at)
        ORDER BY month_start ASC
      `);

      const topCourses = await pool.query(`
        SELECT
          c.id,
          c.title,
          COUNT(uc.course_id) AS enrollments
        FROM courses c
        LEFT JOIN user_courses uc ON uc.course_id = c.id
        GROUP BY c.id, c.title
        ORDER BY enrollments DESC, c.title ASC
        LIMIT 5
      `);

      return res.json({
        stats: {
          totalCourses: parseInt(coursesCount.rows[0].count, 10),
          totalUsers: parseInt(usersCount.rows[0].count, 10),
          totalEnrollments: parseInt(enrollmentsCount.rows[0].count, 10),
          totalRevenue
        },
        recentUsers: recentUsers.rows,
        recentEnrollments: recentEnrollments.rows,
        categoryDistribution: categoryDistribution.rows,
        revenueTrend: revenueTrend.rows,
        enrollmentTrend: enrollmentTrend.rows,
        topCourses: topCourses.rows
      });
    } else {
      // Instructor view
      const coursesCount = await pool.query('SELECT COUNT(*) FROM courses WHERE instructor_id = $1', [userId]);
      const enrollmentsRes = await pool.query(`
        SELECT COUNT(uc.*) FROM user_courses uc 
        JOIN courses c ON uc.course_id = c.id 
        WHERE c.instructor_id = $1
      `, [userId]);

      const recentEnrollments = await pool.query(`
        SELECT uc.user_id, uc.course_id, uc.purchased_at,
               u.first_name, u.last_name, u.email,
               c.title AS course_title
        FROM user_courses uc
        JOIN users u ON uc.user_id = u.id
        JOIN courses c ON uc.course_id = c.id
        WHERE c.instructor_id = $1
        ORDER BY uc.purchased_at DESC
        LIMIT 5
      `, [userId]);

      const enrollmentTrend = await pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', uc.purchased_at), 'Mon') AS month_label,
          DATE_TRUNC('month', uc.purchased_at) AS month_start,
          COUNT(uc.*) AS enrollments
        FROM user_courses uc
        JOIN courses c ON uc.course_id = c.id
        WHERE c.instructor_id = $1 AND uc.purchased_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
        GROUP BY DATE_TRUNC('month', uc.purchased_at)
        ORDER BY month_start ASC
      `, [userId]);

      const topCourses = await pool.query(`
        SELECT
          c.id,
          c.title,
          COUNT(uc.course_id) AS enrollments
        FROM courses c
        LEFT JOIN user_courses uc ON uc.course_id = c.id
        WHERE c.instructor_id = $1
        GROUP BY c.id, c.title
        ORDER BY enrollments DESC, c.title ASC
        LIMIT 5
      `, [userId]);

      return res.json({
        stats: {
          totalCourses: parseInt(coursesCount.rows[0].count, 10),
          totalUsers: 0, // Instructors don't see total global users
          totalEnrollments: parseInt(enrollmentsRes.rows[0].count, 10),
          totalRevenue: 0 // Instructors don't see revenue currently
        },
        recentUsers: [], // Instructors don't see global recent users
        recentEnrollments: recentEnrollments.rows,
        categoryDistribution: [],
        revenueTrend: [],
        enrollmentTrend: enrollmentTrend.rows,
        topCourses: topCourses.rows
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats overview', error: error.message });
  }
};

// User management
export const getUsers = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  try {
    const users = await pool.query(
      'SELECT id, first_name, last_name, email, role, auth_provider, created_at FROM users ORDER BY id ASC'
    );
    res.json(users.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  const { id } = req.params;
  const { role } = req.body;

  if (!['student', 'admin', 'instructor'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, first_name, last_name, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User role updated successfully', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
};

export const getAdminCourses = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const courses = await pool.query('SELECT * FROM courses ORDER BY created_at DESC');
      res.json(courses.rows);
    } else {
      const courses = await pool.query('SELECT * FROM courses WHERE instructor_id = $1 ORDER BY created_at DESC', [req.user.id]);
      res.json(courses.rows);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
};

export const createCourse = async (req, res) => {
  const { title, description, price, category, difficulty, thumbnail } = req.body;
  const uploadedThumbnail = req.file ? toPublicUploadUrl(req, req.file.path) : '';
  const thumbnailValue = uploadedThumbnail || thumbnail || '';
  const instructorId = req.user.id; // Assign to creator

  try {
    const result = await pool.query(
      `INSERT INTO courses (title, description, price, category, difficulty, thumbnail, instructor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, price || 0.00, category || 'general', difficulty || 'beginner', thumbnailValue, instructorId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

export const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { title, description, price, category, difficulty, thumbnail } = req.body;
  const uploadedThumbnail = req.file ? toPublicUploadUrl(req, req.file.path) : '';
  const thumbnailValue = uploadedThumbnail || thumbnail || '';

  try {
    if (req.user.role === 'instructor') {
      const courseCheck = await pool.query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
      if (courseCheck.rows.length === 0 || courseCheck.rows[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'You can only edit your own courses' });
      }
    }

    const result = await pool.query(
      `UPDATE courses
       SET title = $1, description = $2, price = $3, category = $4, difficulty = $5, thumbnail = $6
       WHERE id = $7
       RETURNING *`,
      [title, description, price || 0.00, category || 'general', difficulty || 'beginner', thumbnailValue, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
};

export const deleteCourse = async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.role === 'instructor') {
      const courseCheck = await pool.query('SELECT instructor_id FROM courses WHERE id = $1', [id]);
      if (courseCheck.rows.length === 0 || courseCheck.rows[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'You can only delete your own courses' });
      }
    }

    const enrollments = await pool.query('SELECT COUNT(*) FROM user_courses WHERE course_id = $1', [id]);
    const enrollmentCount = parseInt(enrollments.rows[0].count, 10);

    if (enrollmentCount > 0) {
      return res.status(400).json({
        message: 'This course cannot be deleted because it has active student enrollments.'
      });
    }

    const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting course', error: error.message });
  }
};

// Lesson CRUD
export const addLesson = async (req, res) => {
  const { courseId } = req.params;
  const { title, video_url, lesson_order, transcript } = req.body;
  const uploadedVideo = req.file ? toPublicUploadUrl(req, req.file.path) : '';
  const videoValue = uploadedVideo || video_url || '';

  try {
    if (req.user.role === 'instructor') {
      const courseCheck = await pool.query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
      if (courseCheck.rows.length === 0 || courseCheck.rows[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'You can only add lessons to your own courses' });
      }
    }

    const result = await pool.query(
      `INSERT INTO lessons (course_id, title, video_url, lesson_order, transcript)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [courseId, title, videoValue, lesson_order || 1, transcript || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error adding lesson', error: error.message });
  }
};

export const updateLesson = async (req, res) => {
  const { lessonId } = req.params;
  const { title, video_url, lesson_order, transcript } = req.body;
  const uploadedVideo = req.file ? toPublicUploadUrl(req, req.file.path) : '';
  const videoValue = uploadedVideo || video_url || '';

  try {
    if (req.user.role === 'instructor') {
      const courseCheck = await pool.query(`
        SELECT c.instructor_id FROM lessons l 
        JOIN courses c ON l.course_id = c.id 
        WHERE l.id = $1
      `, [lessonId]);
      if (courseCheck.rows.length === 0 || courseCheck.rows[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'You can only edit lessons in your own courses' });
      }
    }

    const result = await pool.query(
      `UPDATE lessons
       SET title = $1, video_url = $2, lesson_order = $3, transcript = $4
       WHERE id = $5
       RETURNING *`,
      [title, videoValue, lesson_order, transcript, lessonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating lesson', error: error.message });
  }
};

export const deleteLesson = async (req, res) => {
  const { lessonId } = req.params;

  try {
    if (req.user.role === 'instructor') {
      const courseCheck = await pool.query(`
        SELECT c.instructor_id FROM lessons l 
        JOIN courses c ON l.course_id = c.id 
        WHERE l.id = $1
      `, [lessonId]);
      if (courseCheck.rows.length === 0 || courseCheck.rows[0].instructor_id !== req.user.id) {
        return res.status(403).json({ message: 'You can only delete lessons in your own courses' });
      }
    }

    const result = await pool.query('DELETE FROM lessons WHERE id = $1 RETURNING id', [lessonId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lesson', error: error.message });
  }
};
