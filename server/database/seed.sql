-- Seed courses
INSERT INTO courses (title, description, price, category, difficulty, thumbnail)
SELECT
  'Full Stack Web Development',
  'Master frontend and backend web development using HTML, CSS, JavaScript, React, and Node.js.',
  1499.00,
  'development',
  'intermediate',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Full Stack Web Development'
);

INSERT INTO lessons (course_id, title, video_url, lesson_order)
SELECT c.id, v.title, v.video_url, v.lesson_order
FROM courses c
JOIN (
  VALUES
    ('HTML & CSS Foundations', 'https://www.youtube.com/watch?v=8p9v_X3zEP4', 1),
    ('JavaScript Basics', 'https://www.youtube.com/watch?v=L6_50Y93mEw', 2),
    ('Introduction to React Components', 'https://www.youtube.com/watch?v=7hR6U9pU6lE', 3),
    ('Backend API Development with Express', 'https://www.youtube.com/watch?v=Yp69GZ0u0pI', 4)
) AS v(title, video_url, lesson_order) ON TRUE
WHERE c.title = 'Full Stack Web Development'
  AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.course_id = c.id
      AND l.lesson_order = v.lesson_order
  );

INSERT INTO quizzes (lesson_id, question, options, correct_answer)
SELECT l.id, 'What is the main focus of this setup lesson?', '["Coding environment and posture","Advanced database scaling","React props validation","CSS Grid layouts"]'::jsonb, 'Coding environment and posture'
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE c.title = 'Full Stack Web Development'
  AND NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id
  );


INSERT INTO courses (title, description, price, category, difficulty, thumbnail)
SELECT
  'Product Management Essentials',
  'Learn the fundamentals of product lifecycle management, user research, roadmapping, and agile execution.',
  1299.00,
  'management',
  'beginner',
  'https://images.unsplash.com/photo-1507207611509-ec012433ff52?w=800'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Product Management Essentials'
);

INSERT INTO lessons (course_id, title, video_url, lesson_order)
SELECT c.id, v.title, v.video_url, v.lesson_order
FROM courses c
JOIN (
  VALUES
    ('Product Lifecycle Management', 'https://www.youtube.com/watch?v=BBz-Jyr23M4', 1),
    ('Building Strategic Roadmaps', 'https://www.youtube.com/watch?v=Y8m_p8_qf-w', 2),
    ('Product Metrics and Churn Analysis', 'https://www.youtube.com/watch?v=6P3Z6B79_8s', 3),
    ('Agile and Scrum Methodologies', 'https://www.youtube.com/watch?v=ZfX_jF7f9k0', 4)
) AS v(title, video_url, lesson_order) ON TRUE
WHERE c.title = 'Product Management Essentials'
  AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.course_id = c.id
      AND l.lesson_order = v.lesson_order
  );

INSERT INTO quizzes (lesson_id, question, options, correct_answer)
SELECT l.id, 'Which framework is commonly used to track product development stages?', '["Waterfall only","Product Lifecycle Management","React frameworks","SQL database transactions"]'::jsonb, 'Product Lifecycle Management'
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE c.title = 'Product Management Essentials'
  AND NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id
  );


INSERT INTO courses (title, description, price, category, difficulty, thumbnail)
SELECT
  'Introduction to Data Science',
  'Analyze data, create visualisations, learn statistics, and run simple machine learning models in Python.',
  1099.00,
  'datascience',
  'advanced',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Introduction to Data Science'
);

INSERT INTO lessons (course_id, title, video_url, lesson_order)
SELECT c.id, v.title, v.video_url, v.lesson_order
FROM courses c
JOIN (
  VALUES
    ('Data Science Foundations', 'https://www.youtube.com/watch?v=0_u_mS6Y7-k', 1),
    ('Data Wrangling with Pandas', 'https://www.youtube.com/watch?v=5V_R_vV4t7w', 2),
    ('Data Visualization with Seaborn', 'https://www.youtube.com/watch?v=v8z2wYf6B3k', 3),
    ('Basic Statistical Testing', 'https://www.youtube.com/watch?v=x0xL7W_yFp4', 4),
    ('Introduction to Machine Learning Models', 'https://www.youtube.com/watch?v=R_I8m9L-u_8', 5)
) AS v(title, video_url, lesson_order) ON TRUE
WHERE c.title = 'Introduction to Data Science'
  AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.course_id = c.id
      AND l.lesson_order = v.lesson_order
  );

INSERT INTO quizzes (lesson_id, question, options, correct_answer)
SELECT l.id, 'Which Python library is mostly used for data manipulation and analysis?', '["Numpy alone","Pandas","Flask","Django"]'::jsonb, 'Pandas'
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE c.title = 'Introduction to Data Science'
  AND NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id
  );


INSERT INTO courses (title, description, price, category, difficulty, thumbnail)
SELECT
  'Modern Digital Marketing',
  'Master SEO, SEM, social media advertising, email copy, conversion optimization, and Web Analytics.',
  1999.00,
  'marketing',
  'beginner',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800'
WHERE NOT EXISTS (
  SELECT 1 FROM courses WHERE title = 'Modern Digital Marketing'
);

INSERT INTO lessons (course_id, title, video_url, lesson_order)
SELECT c.id, v.title, v.video_url, v.lesson_order
FROM courses c
JOIN (
  VALUES
    ('Search Engine Optimization (SEO)', 'https://www.youtube.com/watch?v=vlHpWvsW040', 1),
    ('Paid Search & Social Campaigns', 'https://www.youtube.com/watch?v=jW7_HjR9M0U', 2),
    ('High-Conversion Email Marketing', 'https://www.youtube.com/watch?v=kY8_GfB5U4Y', 3),
    ('Google Analytics 4 & A/B Testing', 'https://www.youtube.com/watch?v=hG9V8qU-1_0', 4)
) AS v(title, video_url, lesson_order) ON TRUE
WHERE c.title = 'Modern Digital Marketing'
  AND NOT EXISTS (
    SELECT 1
    FROM lessons l
    WHERE l.course_id = c.id
      AND l.lesson_order = v.lesson_order
  );

INSERT INTO quizzes (lesson_id, question, options, correct_answer)
SELECT l.id, 'What does SEO stand for in digital marketing?', '["Search Engine Optimization","Social Engagement Operation","Structured Electronic Output","Site Evaluation Order"]'::jsonb, 'Search Engine Optimization'
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE c.title = 'Modern Digital Marketing'
  AND NOT EXISTS (
    SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id
  );
