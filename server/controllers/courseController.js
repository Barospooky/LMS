import pool from '../config/db.js';

export const getCourses = async (req, res) => {
  const userId = req.user.id;
  try {
    const courses = await pool.query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM user_courses WHERE user_id = $1 AND course_id = c.id) AS isPurchased,
        (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) AS lessonsCount,
        (SELECT id FROM lessons WHERE course_id = c.id ORDER BY lesson_order ASC LIMIT 1) AS firstLessonId
      FROM courses c
    `, [userId]);
    
    const formattedCourses = courses.rows.map(course => ({
      ...course,
      isPurchased: parseInt(course.ispurchased, 10) > 0,
      lessonsCount: parseInt(course.lessonscount, 10) || 0,
      firstLessonId: course.firstlessonid ? parseInt(course.firstlessonid, 10) : null,
    }));
    
    res.json(formattedCourses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
};

export const getCourseDetails = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const courses = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (courses.rows.length === 0) return res.status(404).json({ message: 'Course not found' });

    const isPurchased = await pool.query('SELECT * FROM user_courses WHERE user_id = $1 AND course_id = $2', [userId, id]);
    
    const lessons = await pool.query('SELECT * FROM lessons WHERE course_id = $1 ORDER BY lesson_order', [id]);

    res.json({
      ...courses.rows[0],
      isPurchased: isPurchased.rows.length > 0,
      lessons: lessons.rows
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching course details', error: error.message });
  }
};

export const purchaseCourse = async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user.id;
  try {
    await pool.query(
      'INSERT INTO user_courses (user_id, course_id) VALUES ($1, $2) ON CONFLICT (user_id, course_id) DO NOTHING',
      [userId, courseId]
    );
    res.json({ message: 'Course purchased successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error purchasing course', error: error.message });
  }
};

export const getLessonQuiz = async (req, res) => {
  const { lessonId } = req.params;
  try {
    const quizzes = await pool.query('SELECT * FROM quizzes WHERE lesson_id = $1', [lessonId]);
    res.json(quizzes.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching quiz', error: error.message });
  }
};
