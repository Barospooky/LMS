import pool from '../config/db.js';
import { getGeminiModel } from '../ai/config/geminiClient.js';
import { generateAutomatedAssessment } from '../ai/services/quizEngineService.js';
import fs from 'fs';
import path from 'path';

const ensureLessonAssessment = async ({ courseId, lessonId, lessonTitle }) => {
  const existing = await pool.query(
    'SELECT * FROM assessments WHERE course_id = $1 AND lesson_id = $2 LIMIT 1',
    [courseId, lessonId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const created = await pool.query(
    `INSERT INTO assessments (course_id, lesson_id, title, assessment_type, passing_score, is_published)
     VALUES ($1, $2, $3, 'lesson_quiz', 70, TRUE)
     RETURNING *`,
    [courseId, lessonId, `${lessonTitle} Assessment`]
  );

  return created.rows[0];
};

const getCourseCompletionStats = async (userId, courseId) => {
  const totalLessonsRes = await pool.query('SELECT COUNT(*)::int AS total FROM lessons WHERE course_id = $1', [courseId]);
  const completedLessonsRes = await pool.query(
    'SELECT COUNT(*)::int AS total FROM user_progress WHERE user_id = $1 AND course_id = $2',
    [userId, courseId]
  );
  const passedAssessmentsRes = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM assessment_submissions sub
     JOIN assessments a ON a.id = sub.assessment_id
     WHERE sub.user_id = $1
       AND a.course_id = $2
       AND sub.passed = TRUE`,
    [userId, courseId]
  );

  return {
    totalLessons: totalLessonsRes.rows[0]?.total || 0,
    completedLessons: completedLessonsRes.rows[0]?.total || 0,
    passedAssessments: passedAssessmentsRes.rows[0]?.total || 0,
  };
};

const issueCertificateIfEligible = async ({ userId, courseId }) => {
  const stats = await getCourseCompletionStats(userId, courseId);

  if (!stats.totalLessons || stats.completedLessons < stats.totalLessons || stats.passedAssessments < stats.totalLessons) {
    return null;
  }

  const existingCertificate = await pool.query(
    'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2 LIMIT 1',
    [userId, courseId]
  );

  if (existingCertificate.rows.length > 0) {
    return existingCertificate.rows[0];
  }

  const certificateNumber = `AMP-${courseId}-${userId}-${Date.now()}`;
  const certificate = await pool.query(
    `INSERT INTO certificates (user_id, course_id, certificate_number, issued_at, verified_at, pdf_url)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
     RETURNING *`,
    [userId, courseId, certificateNumber]
  );

  return certificate.rows[0];
};

const parseOptionalLessonId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const groupRepliesByThread = (replies = []) =>
  replies.reduce((acc, reply) => {
    if (!acc[reply.thread_id]) {
      acc[reply.thread_id] = [];
    }
    acc[reply.thread_id].push(reply);
    return acc;
  }, {});

const isMusicCategory = (category = '') =>
  ['music', 'vocal', 'singing', 'guitar', 'piano', 'violin', 'drums'].includes(
    String(category).toLowerCase().trim()
  );

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
      SELECT l.id AS lesson_id, l.title as lesson_title, l.video_url, c.category, c.id AS course_id
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1
    `, [lessonId]);

    if (infoRes.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const lesson = infoRes.rows[0];
    await ensureLessonAssessment({
      courseId: lesson.course_id,
      lessonId: lesson.lesson_id,
      lessonTitle: lesson.lesson_title,
    });

    const aiQuizEnabled = process.env.AI_QUIZ_ENABLED !== 'false';
    if (!aiQuizEnabled) {
      console.warn(`[Core Quiz Controller] AI quiz generation disabled. Using stored/client fallback for lesson ${lessonId}.`);
      if (existingQuizzes.rows.length > 0) {
        return res.json(existingQuizzes.rows.reverse());
      }

      return res.status(503).json({
        message: 'AI quiz generation is disabled. Using offline fallback quiz.',
      });
    }

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
      type: isMusicCategory(lesson.category) ? 'mixed' : 'mcq',
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
    const isQuotaError = error?.status === 429 || String(error?.message || '').includes('quota');
    if (isQuotaError) {
      console.warn('AI quiz generation quota exceeded. Falling back to stored/client quiz questions.');
    } else {
      console.error('Error in getLessonQuiz:', error);
    }

    try {
      const logPath = path.resolve(process.cwd(), 'ai-error.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] Error: ${error.message}\nStack: ${error.stack}\n\n`);
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

export const getCourseResources = async (req, res) => {
  const { courseId } = req.params;
  const lessonId = parseOptionalLessonId(req.query.lessonId);

  try {
    const resources = await pool.query(
      `
      SELECT
        cr.*,
        u.first_name,
        u.last_name,
        l.title AS lesson_title
      FROM course_resources cr
      LEFT JOIN users u ON u.id = cr.uploaded_by
      LEFT JOIN lessons l ON l.id = cr.lesson_id
      WHERE cr.course_id = $1
        AND ($2::int IS NULL OR cr.lesson_id IS NULL OR cr.lesson_id = $2)
      ORDER BY CASE WHEN cr.lesson_id IS NULL THEN 0 ELSE 1 END, cr.created_at DESC
      `,
      [courseId, lessonId]
    );

    res.json({
      resources: resources.rows,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching course resources', error: error.message });
  }
};

export const createCourseResource = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;
  const role = req.user.role;
  const { title, description = '', resourceUrl, resourceType = 'link', fileName = '', lessonId = null } = req.body;

  if (!['admin', 'instructor'].includes(role)) {
    return res.status(403).json({ message: 'Only instructors and admins can add resources' });
  }

  if (!title || !resourceUrl) {
    return res.status(400).json({ message: 'title and resourceUrl are required' });
  }

  try {
    const lessonIdValue = parseOptionalLessonId(lessonId);
    const created = await pool.query(
      `
      INSERT INTO course_resources
        (course_id, lesson_id, title, description, resource_type, resource_url, file_name, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [courseId, lessonIdValue, title.trim(), description, resourceType, resourceUrl.trim(), fileName || null, userId]
    );

    res.status(201).json({
      message: 'Resource added successfully',
      resource: created.rows[0],
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating resource', error: error.message });
  }
};

export const getCourseDiscussions = async (req, res) => {
  const { courseId } = req.params;
  const lessonId = parseOptionalLessonId(req.query.lessonId);

  try {
    const threadsRes = await pool.query(
      `
      SELECT
        t.*,
        u.first_name,
        u.last_name,
        COALESCE(COUNT(r.id), 0)::int AS reply_count
      FROM discussion_threads t
      LEFT JOIN users u ON u.id = t.user_id
      LEFT JOIN discussion_replies r ON r.thread_id = t.id
      WHERE t.course_id = $1
        AND ($2::int IS NULL OR t.lesson_id IS NULL OR t.lesson_id = $2)
      GROUP BY t.id, u.first_name, u.last_name
      ORDER BY t.is_answered DESC, t.updated_at DESC, t.created_at DESC
      `,
      [courseId, lessonId]
    );

    const threadIds = threadsRes.rows.map((thread) => thread.id);
    let repliesByThread = {};

    if (threadIds.length > 0) {
      const repliesRes = await pool.query(
        `
        SELECT
          r.*,
          u.first_name,
          u.last_name
        FROM discussion_replies r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE r.thread_id = ANY($1::int[])
        ORDER BY r.created_at ASC
        `,
        [threadIds]
      );
      repliesByThread = groupRepliesByThread(repliesRes.rows);
    }

    const threads = threadsRes.rows.map((thread) => ({
      ...thread,
      replies: repliesByThread[thread.id] || [],
    }));

    res.json({ threads });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching discussions', error: error.message });
  }
};

export const createCourseDiscussion = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;
  const { title, body, lessonId = null } = req.body;

  if (!body || !body.trim()) {
    return res.status(400).json({ message: 'Discussion body is required' });
  }

  try {
    const lessonIdValue = parseOptionalLessonId(lessonId);
    const discussionTitle = (title && title.trim()) || 'Course discussion';

    const created = await pool.query(
      `
      INSERT INTO discussion_threads
        (course_id, lesson_id, user_id, title, body)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [courseId, lessonIdValue, userId, discussionTitle, body.trim()]
    );

    res.status(201).json({
      message: 'Discussion posted successfully',
      thread: created.rows[0],
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating discussion', error: error.message });
  }
};

export const createDiscussionReply = async (req, res) => {
  const { courseId, threadId } = req.params;
  const userId = req.user.id;
  const { body } = req.body;

  if (!body || !body.trim()) {
    return res.status(400).json({ message: 'Reply body is required' });
  }

  try {
    const threadRes = await pool.query(
      'SELECT * FROM discussion_threads WHERE id = $1 AND course_id = $2 LIMIT 1',
      [threadId, courseId]
    );

    if (threadRes.rows.length === 0) {
      return res.status(404).json({ message: 'Discussion thread not found' });
    }

    const reply = await pool.query(
      `
      INSERT INTO discussion_replies (thread_id, user_id, body)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [threadId, userId, body.trim()]
    );

    await pool.query(
      'UPDATE discussion_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [threadId]
    );

    res.status(201).json({
      message: 'Reply posted successfully',
      reply: reply.rows[0],
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating reply', error: error.message });
  }
};

export const resolveDiscussionThread = async (req, res) => {
  const { courseId, threadId } = req.params;
  const { replyId = null } = req.body;
  const role = req.user.role;

  if (!['admin', 'instructor'].includes(role)) {
    return res.status(403).json({ message: 'Only instructors and admins can mark answers' });
  }

  try {
    const threadRes = await pool.query(
      'SELECT * FROM discussion_threads WHERE id = $1 AND course_id = $2 LIMIT 1',
      [threadId, courseId]
    );

    if (threadRes.rows.length === 0) {
      return res.status(404).json({ message: 'Discussion thread not found' });
    }

    const replyIdValue = parseOptionalLessonId(replyId);

    if (replyIdValue) {
      const replyRes = await pool.query(
        'SELECT * FROM discussion_replies WHERE id = $1 AND thread_id = $2 LIMIT 1',
        [replyIdValue, threadId]
      );
      if (replyRes.rows.length === 0) {
        return res.status(404).json({ message: 'Reply not found for this thread' });
      }

      await pool.query(
        'UPDATE discussion_replies SET is_solution = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [replyIdValue]
      );
    }

    await pool.query(
      `
      UPDATE discussion_threads
      SET
        is_answered = TRUE,
        answered_reply_id = COALESCE($3, answered_reply_id),
        resolved_by = $1,
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [req.user.id, threadId, replyIdValue]
    );

    res.json({ message: 'Discussion marked as answered' });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving discussion', error: error.message });
  }
};

export const submitLessonAssessment = async (req, res) => {
  const { courseId, lessonId, score = 0, totalQuestions = 0, responses = [] } = req.body;
  const userId = req.user.id;

  if (!courseId || !lessonId) {
    return res.status(400).json({ message: 'courseId and lessonId are required' });
  }

  try {
    const lessonRes = await pool.query(
      `SELECT l.id, l.title, l.course_id, c.title AS course_title
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       WHERE l.id = $1 AND l.course_id = $2
       LIMIT 1`,
      [lessonId, courseId]
    );

    if (lessonRes.rows.length === 0) {
      return res.status(404).json({ message: 'Lesson not found for this course' });
    }

    const lesson = lessonRes.rows[0];
    const assessment = await ensureLessonAssessment({
      courseId: lesson.course_id,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    });

    const passingScore = Number(assessment.passing_score || 70);
    const normalizedScore = Number(score) || 0;
    const normalizedTotal = Number(totalQuestions) || 0;
    const passed = normalizedTotal > 0 ? (normalizedScore / normalizedTotal) * 100 >= passingScore : normalizedScore >= passingScore;

    const submission = await pool.query(
      `INSERT INTO assessment_submissions
        (assessment_id, user_id, score, passed, total_questions, response_payload, submitted_at, graded_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (assessment_id, user_id)
       DO UPDATE SET
         score = EXCLUDED.score,
         passed = EXCLUDED.passed,
         total_questions = EXCLUDED.total_questions,
         response_payload = EXCLUDED.response_payload,
         submitted_at = CURRENT_TIMESTAMP,
         graded_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [assessment.id, userId, normalizedScore, passed, normalizedTotal, JSON.stringify(responses)]
    );

    await pool.query(
      `INSERT INTO user_progress (user_id, course_id, lesson_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, course_id, lesson_id) DO NOTHING`,
      [userId, courseId, lessonId]
    );

    const completionStats = await getCourseCompletionStats(userId, courseId);
    const certificate = await issueCertificateIfEligible({ userId, courseId });

    res.json({
      message: 'Assessment submitted successfully',
      submission: submission.rows[0],
      passed,
      completion: completionStats,
      certificateEarned: Boolean(certificate),
      certificate: certificate || null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting assessment', error: error.message });
  }
};

export const getCertificateStatus = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  try {
    const certificate = await pool.query(
      'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2 LIMIT 1',
      [userId, courseId]
    );

    const completion = await getCourseCompletionStats(userId, courseId);
    const status = {
      earned: certificate.rows.length > 0,
      certificate: certificate.rows[0] || null,
      completion,
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching certificate status', error: error.message });
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
    const certificate = await pool.query(
      'SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2 LIMIT 1',
      [userId, courseId]
    );

    res.json({
      completedLessons,
      certificateEarned: certificate.rows.length > 0,
      certificate: certificate.rows[0] || null,
    });
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
