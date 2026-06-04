import pool from '../config/db.js';

// Stats Overview
export const getStatsOverview = async (req, res) => {
  try {
    const coursesCount = await pool.query('SELECT COUNT(*) FROM courses');
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    const enrollmentsCount = await pool.query('SELECT COUNT(*) FROM user_courses');
    
    // Revenue sum of all payments with status 'paid'
    const revenueRes = await pool.query("SELECT SUM(amount) AS total FROM payments WHERE status = 'paid'");
    const totalRevenue = parseFloat(revenueRes.rows[0].total || 0);

    // Recent user activity (e.g., last 5 registrations)
    const recentUsers = await pool.query(
      'SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY id DESC LIMIT 5'
    );

    // Recent enrollments with course details
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

    // Course distribution count by category
    const categoryDistribution = await pool.query(`
      SELECT category, COUNT(*) AS count
      FROM courses
      GROUP BY category
    `);

    res.json({
      stats: {
        totalCourses: parseInt(coursesCount.rows[0].count, 10),
        totalUsers: parseInt(usersCount.rows[0].count, 10),
        totalEnrollments: parseInt(enrollmentsCount.rows[0].count, 10),
        totalRevenue
      },
      recentUsers: recentUsers.rows,
      recentEnrollments: recentEnrollments.rows,
      categoryDistribution: categoryDistribution.rows
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats overview', error: error.message });
  }
};

// User management
export const getUsers = async (req, res) => {
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

// Course CRUD
export const createCourse = async (req, res) => {
  const { title, description, price, category, difficulty, thumbnail } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO courses (title, description, price, category, difficulty, thumbnail)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, price || 0.00, category || 'general', difficulty || 'beginner', thumbnail || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

export const updateCourse = async (req, res) => {
  const { id } = req.params;
  const { title, description, price, category, difficulty, thumbnail } = req.body;

  try {
    const result = await pool.query(
      `UPDATE courses
       SET title = $1, description = $2, price = $3, category = $4, difficulty = $5, thumbnail = $6
       WHERE id = $7
       RETURNING *`,
      [title, description, price || 0.00, category || 'general', difficulty || 'beginner', thumbnail || '', id]
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
    // Check if there are active enrollments
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

  try {
    const result = await pool.query(
      `INSERT INTO lessons (course_id, title, video_url, lesson_order, transcript)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [courseId, title, video_url, lesson_order || 1, transcript || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error adding lesson', error: error.message });
  }
};

export const updateLesson = async (req, res) => {
  const { lessonId } = req.params;
  const { title, video_url, lesson_order, transcript } = req.body;

  try {
    const result = await pool.query(
      `UPDATE lessons
       SET title = $1, video_url = $2, lesson_order = $3, transcript = $4
       WHERE id = $5
       RETURNING *`,
      [title, video_url, lesson_order, transcript, lessonId]
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
    const result = await pool.query('DELETE FROM lessons WHERE id = $1 RETURNING id', [lessonId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lesson', error: error.message });
  }
};
