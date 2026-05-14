INSERT INTO courses (title, description, price, instrument, thumbnail)
SELECT
  'Piano Masterclass',
  'Master the piano with these structured lessons.',
  49.99,
  'piano',
  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=2070&auto=format&fit=crop'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Piano Masterclass'
);

INSERT INTO lessons (course_id, title, video_url, lesson_order)
SELECT c.id, v.title, v.video_url, v.lesson_order
FROM courses c
JOIN (
  VALUES
    ('Piano Lesson 1', 'https://www.youtube.com/watch?v=8p9v_X3zEP4', 1),
    ('Piano Lesson 2', 'https://www.youtube.com/watch?v=L6_50Y93mEw', 2),
    ('Piano Lesson 3', 'https://www.youtube.com/watch?v=7hR6U9pU6lE', 3),
    ('Piano Lesson 4', 'https://www.youtube.com/watch?v=Yp69GZ0u0pI', 4)
) AS v(title, video_url, lesson_order) ON TRUE
WHERE c.title = 'Piano Masterclass'
  AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.course_id = c.id
      AND l.lesson_order = v.lesson_order
  );

INSERT INTO quizzes (lesson_id, question, options, correct_answer)
SELECT l.id, 'What is the main focus of this lesson?', '["Scales","Posture","Arpeggios","Rhythm"]'::jsonb, 'Posture'
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE c.title = 'Piano Masterclass'
  AND NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id
  );

INSERT INTO courses (title, description, price, instrument, thumbnail)
SELECT
  'Guitar Fundamentals',
  'Learn the basics of acoustic and electric guitar.',
  39.99,
  'guitar',
  'https://images.unsplash.com/photo-1510915363646-df03d474d59e?q=80&w=2070&auto=format&fit=crop'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Guitar Fundamentals'
);

INSERT INTO lessons (course_id, title, video_url, lesson_order)
SELECT c.id, v.title, v.video_url, v.lesson_order
FROM courses c
JOIN (
  VALUES
    ('Guitar Lesson 1', 'https://www.youtube.com/watch?v=BBz-Jyr23M4', 1),
    ('Guitar Lesson 2', 'https://www.youtube.com/watch?v=Y8m_p8_qf-w', 2),
    ('Guitar Lesson 3', 'https://www.youtube.com/watch?v=6P3Z6B79_8s', 3),
    ('Guitar Lesson 4', 'https://www.youtube.com/watch?v=ZfX_jF7f9k0', 4)
) AS v(title, video_url, lesson_order) ON TRUE
WHERE c.title = 'Guitar Fundamentals'
  AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.course_id = c.id
      AND l.lesson_order = v.lesson_order
  );

INSERT INTO quizzes (lesson_id, question, options, correct_answer)
SELECT l.id, 'Which string is the thickest?', '["E","A","D","G"]'::jsonb, 'E'
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE c.title = 'Guitar Fundamentals'
  AND NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id
  );

INSERT INTO courses (title, description, price, instrument, thumbnail)
SELECT
  'Flute Tutorial',
  'Breath control and fingerings for the flute.',
  29.99,
  'flute',
  'https://images.unsplash.com/photo-1573510317511-620257835064?q=80&w=2070&auto=format&fit=crop'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Flute Tutorial'
);

INSERT INTO lessons (course_id, title, video_url, lesson_order)
SELECT c.id, v.title, v.video_url, v.lesson_order
FROM courses c
JOIN (
  VALUES
    ('Flute Lesson 1', 'https://www.youtube.com/watch?v=0_u_mS6Y7-k', 1),
    ('Flute Lesson 2', 'https://www.youtube.com/watch?v=5V_R_vV4t7w', 2),
    ('Flute Lesson 3', 'https://www.youtube.com/watch?v=v8z2wYf6B3k', 3),
    ('Flute Lesson 4', 'https://www.youtube.com/watch?v=x0xL7W_yFp4', 4),
    ('Flute Lesson 5', 'https://www.youtube.com/watch?v=R_I8m9L-u_8', 5)
) AS v(title, video_url, lesson_order) ON TRUE
WHERE c.title = 'Flute Tutorial'
  AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.course_id = c.id
      AND l.lesson_order = v.lesson_order
  );

INSERT INTO quizzes (lesson_id, question, options, correct_answer)
SELECT l.id, 'How do you hold the flute?', '["Vertical","Horizontal","Diagonal","Upside down"]'::jsonb, 'Horizontal'
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE c.title = 'Flute Tutorial'
  AND NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id
  );

INSERT INTO courses (title, description, price, instrument, thumbnail)
SELECT
  'Violin Masterclass',
  'Master the bow and strings.',
  59.99,
  'violin',
  'https://images.unsplash.com/photo-1612225232501-9b5afb400005?q=80&w=2070&auto=format&fit=crop'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Violin Masterclass'
);

INSERT INTO lessons (course_id, title, video_url, lesson_order)
SELECT c.id, v.title, v.video_url, v.lesson_order
FROM courses c
JOIN (
  VALUES
    ('Violin Lesson 1', 'https://www.youtube.com/watch?v=vlHpWvsW040', 1),
    ('Violin Lesson 2', 'https://www.youtube.com/watch?v=jW7_HjR9M0U', 2),
    ('Violin Lesson 3', 'https://www.youtube.com/watch?v=kY8_GfB5U4Y', 3),
    ('Violin Lesson 4', 'https://www.youtube.com/watch?v=hG9V8qU-1_0', 4)
) AS v(title, video_url, lesson_order) ON TRUE
WHERE c.title = 'Violin Masterclass'
  AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.course_id = c.id
      AND l.lesson_order = v.lesson_order
  );

INSERT INTO quizzes (lesson_id, question, options, correct_answer)
SELECT l.id, 'What is the stick used to play the violin called?', '["Baton","Bow","Rod","Staff"]'::jsonb, 'Bow'
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE c.title = 'Violin Masterclass'
  AND NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id
  );
