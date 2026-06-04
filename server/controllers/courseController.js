import pool from '../config/db.js';
import { getGeminiModel } from '../ai/config/geminiClient.js';
import { generateAutomatedAssessment } from '../ai/services/quizEngineService.js';
import fs from 'fs';

export const getCourses = async (req, res) => {
  const userId = req.user.id;
  const { search, category, difficulty, sort } = req.query;
  
  try {
    let query = `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM user_courses WHERE user_id = $1 AND course_id = c.id) AS isPurchased,
        (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) AS lessonsCount,
        (SELECT id FROM lessons WHERE course_id = c.id ORDER BY lesson_order ASC LIMIT 1) AS firstLessonId
      FROM courses c
      WHERE 1=1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (search) {
      query += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      query += ` AND c.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (difficulty) {
      query += ` AND c.difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    if (sort) {
      if (sort === 'price_asc') {
        query += ` ORDER BY c.price ASC`;
      } else if (sort === 'price_desc') {
        query += ` ORDER BY c.price DESC`;
      } else if (sort === 'title') {
        query += ` ORDER BY c.title ASC`;
      } else {
        query += ` ORDER BY c.created_at DESC`;
      }
    } else {
      query += ` ORDER BY c.created_at DESC`;
    }

    const courses = await pool.query(query, params);
    
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
  const regenerate = req.query.regenerate === 'true';

  try {
    // 1. Fetch recent questions from the DB first
    const existingQuizzes = await pool.query(
      'SELECT * FROM quizzes WHERE lesson_id = $1 ORDER BY id DESC LIMIT 5',
      [lessonId]
    );
    
    // If we already have 5 or more questions and are not regenerating, return them in correct sequential order
    if (existingQuizzes.rows.length >= 5 && !regenerate) {
      return res.json(existingQuizzes.rows.reverse());
    }

    // 2. Fetch lesson and course context to get category, title, and video url
    const infoRes = await pool.query(`
      SELECT l.title as lesson_title, l.video_url, c.category
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1
    `, [lessonId]);

    if (infoRes.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const lesson = infoRes.rows[0];

    // Clear old placeholder question only if it's the very first time (i.e. only 1 question exists in the DB)
    if (existingQuizzes.rows.length <= 1) {
      await pool.query('DELETE FROM quizzes WHERE lesson_id = $1', [lessonId]);
    }

    // 3. Trigger the high-fidelity dynamic Quiz Generation Engine!
    // This transcribes the video, analyzes content, checks vector embeddings, removes duplicates, and inserts questions.
    console.log(`[Core Quiz Controller] Invoking AI Assessment Engine for Lesson: "${lesson.lesson_title}"`);
    await generateAutomatedAssessment({
      lessonId,
      lessonTitle: lesson.lesson_title,
      videoUrl: lesson.video_url || '',
      instrument: lesson.category || 'general',
      tradition: 'general',
      type: 'mixed', // 3 MCQ + 2 Voice Practice as requested!
      questionCount: 5,
      difficulty: 'intermediate'
    });

    // 4. Fetch the newly inserted 5 questions from the DB (with correct database IDs)
    const finalQuizzes = await pool.query(
      'SELECT * FROM quizzes WHERE lesson_id = $1 ORDER BY id DESC LIMIT 5',
      [lessonId]
    );
    
    return res.json(finalQuizzes.rows.reverse());
  } catch (error) {
    console.error('Error in getLessonQuiz:', error);
    try {
      fs.writeFileSync('d:\\LMS\\LMS\\server\\ai-error.log', `[${new Date().toISOString()}] Error: ${error.message}\nStack: ${error.stack}\n`);
    } catch (fsErr) {
      console.error('Failed to write log file:', fsErr);
    }
    
    // Offline / Error safe fallback
    const fallbackQuizzes = await pool.query(
      'SELECT * FROM quizzes WHERE lesson_id = $1 ORDER BY id DESC LIMIT 5',
      [lessonId]
    );
    if (fallbackQuizzes.rows.length > 0) {
      return res.json(fallbackQuizzes.rows.reverse());
    }
    res.status(500).json({ message: 'Error fetching/generating quiz', error: error.message });
  }
};

export const saveUserProgress = async (req, res) => {
  const { courseId, lessonId } = req.body;
  const userId = req.user.id;
  try {
    await pool.query(
      `INSERT INTO user_progress (user_id, course_id, lesson_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id, course_id, lesson_id) DO NOTHING`,
      [userId, courseId, lessonId]
    );
    res.json({ message: 'Lesson progress saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving user progress', error: error.message });
  }
};

export const getUserProgress = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;
  try {
    const progress = await pool.query(
      'SELECT lesson_id FROM user_progress WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    const completedLessons = progress.rows.map(row => row.lesson_id);
    res.json({ completedLessons });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user progress', error: error.message });
  }
};

export const getLandingCourses = async (req, res) => {
  try {
    const courses = await pool.query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) AS lessonsCount
      FROM courses c
    `);
    
    const formattedCourses = courses.rows.map(course => ({
      ...course,
      lessonsCount: parseInt(course.lessonscount, 10) || 0,
    }));
    
    res.json(formattedCourses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching landing courses', error: error.message });
  }
};
