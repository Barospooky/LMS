-- Demo users for discussions, enrollments, and client walkthroughs
INSERT INTO users (first_name, last_name, email, password_hash, auth_provider, role, bio, preferences)
VALUES
  ('Priya', 'Sharma', 'priya.demo@example.com', NULL, 'demo', 'student', 'Software Engineer at TCS', '{"jobTitle":"Software Engineer at TCS"}'::jsonb),
  ('Arjun', 'Menon', 'arjun.demo@example.com', NULL, 'demo', 'student', 'Product Manager at Flipkart', '{"jobTitle":"Product Manager at Flipkart"}'::jsonb),
  ('Sneha', 'Rao', 'sneha.demo@example.com', NULL, 'demo', 'student', 'Data Analyst at Wipro', '{"jobTitle":"Data Analyst at Wipro"}'::jsonb),
  ('Amplepro', 'Mentor', 'mentor.demo@example.com', NULL, 'demo', 'instructor', 'Lead instructor for demo courses', '{"jobTitle":"Lead Instructor"}'::jsonb)
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  bio = EXCLUDED.bio,
  preferences = EXCLUDED.preferences,
  updated_at = CURRENT_TIMESTAMP;

-- Demo courses
INSERT INTO courses (title, description, price, category, difficulty, thumbnail)
SELECT *
FROM (
  VALUES
    (
      'Full Stack Web Development',
      'Learn to build complete web applications using HTML, CSS, JavaScript, React, Node.js, Express, and PostgreSQL.',
      1499.00,
      'development',
      'intermediate',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200'
    ),
    (
      'Introduction to Data Science',
      'Understand data analysis, visualization, Python basics, machine learning concepts, and real-world data workflows.',
      999.00,
      'datascience',
      'beginner',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200'
    ),
    (
      'Modern Digital Marketing',
      'Learn SEO, social media marketing, email campaigns, paid ads, analytics, and campaign planning.',
      799.00,
      'marketing',
      'beginner',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200'
    ),
    (
      'Music Performance Foundations',
      'Build strong musical fundamentals with pitch control, rhythm practice, vocal warmups, ear training, and a final performance checklist.',
      899.00,
      'music',
      'beginner',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200'
    )
) AS v(title, description, price, category, difficulty, thumbnail)
WHERE NOT EXISTS (
  SELECT 1 FROM courses c WHERE c.title = v.title
);

UPDATE courses c
SET
  description = v.description,
  price = v.price,
  category = v.category,
  difficulty = v.difficulty,
  thumbnail = v.thumbnail,
  updated_at = CURRENT_TIMESTAMP
FROM (
  VALUES
    (
      'Full Stack Web Development',
      'Learn to build complete web applications using HTML, CSS, JavaScript, React, Node.js, Express, and PostgreSQL.',
      1499.00,
      'development',
      'intermediate',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200'
    ),
    (
      'Introduction to Data Science',
      'Understand data analysis, visualization, Python basics, machine learning concepts, and real-world data workflows.',
      999.00,
      'datascience',
      'beginner',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200'
    ),
    (
      'Modern Digital Marketing',
      'Learn SEO, social media marketing, email campaigns, paid ads, analytics, and campaign planning.',
      799.00,
      'marketing',
      'beginner',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200'
    ),
    (
      'Music Performance Foundations',
      'Build strong musical fundamentals with pitch control, rhythm practice, vocal warmups, ear training, and a final performance checklist.',
      899.00,
      'music',
      'beginner',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200'
    )
) AS v(title, description, price, category, difficulty, thumbnail)
WHERE c.title = v.title;

WITH instructor AS (
  SELECT id FROM users WHERE email = 'mentor.demo@example.com' LIMIT 1
)
UPDATE courses
SET instructor_id = (SELECT id FROM instructor)
WHERE title IN (
  'Full Stack Web Development',
  'Introduction to Data Science',
  'Modern Digital Marketing',
  'Music Performance Foundations'
);

-- Demo lessons with YouTube links and transcript summaries
WITH lesson_values(course_title, title, video_url, lesson_order, transcript) AS (
  VALUES
    ('Full Stack Web Development', 'Introduction to Full Stack Development', 'https://www.youtube.com/watch?v=nu_pCVPKzTk', 1, 'Overview of frontend, backend, databases, APIs, and how a complete web app is assembled.'),
    ('Full Stack Web Development', 'HTML, CSS, and Responsive Design', 'https://www.youtube.com/watch?v=G3e-cpL7ofc', 2, 'Build semantic layouts, responsive sections, and polished landing pages for modern products.'),
    ('Full Stack Web Development', 'JavaScript Fundamentals', 'https://www.youtube.com/watch?v=EerdGm-ehJQ', 3, 'Practice variables, functions, arrays, objects, events, and browser-based interactivity.'),
    ('Full Stack Web Development', 'React Essentials', 'https://www.youtube.com/watch?v=SqcY0GlETPk', 4, 'Understand components, props, state, hooks, routing, and reusable UI composition.'),
    ('Full Stack Web Development', 'Backend with Node.js and Express', 'https://www.youtube.com/watch?v=Oe421EPjeBE', 5, 'Create REST APIs, route handlers, middleware, and server-side business logic.'),
    ('Full Stack Web Development', 'PostgreSQL and Database Design', 'https://www.youtube.com/watch?v=qw--VYLpxG4', 6, 'Design tables, relationships, queries, and data models for real applications.'),
    ('Full Stack Web Development', 'Authentication and Payments', 'https://www.youtube.com/watch?v=F-sFp_AvHc8', 7, 'Implement login, signup, password reset, protected routes, and payment checkout concepts.'),
    ('Full Stack Web Development', 'Final Project and Certificate', 'https://www.youtube.com/watch?v=ZxKM3DCV2kE', 8, 'Bring the pieces together into a mini LMS project and prepare for final certification.'),

    ('Introduction to Data Science', 'What is Data Science?', 'https://www.youtube.com/watch?v=ua-CiDNNj30', 1, 'Explore data science roles, workflows, business questions, and project structure.'),
    ('Introduction to Data Science', 'Python for Data Analysis', 'https://www.youtube.com/watch?v=LHBE6Q9XlzI', 2, 'Use Python fundamentals for lists, dictionaries, functions, notebooks, and analysis tasks.'),
    ('Introduction to Data Science', 'Working with Data', 'https://www.youtube.com/watch?v=vmEHCJofslg', 3, 'Load CSV files, clean missing values, format columns, and prepare datasets for analysis.'),
    ('Introduction to Data Science', 'Data Visualization', 'https://www.youtube.com/watch?v=3Xc3CA655Y4', 4, 'Create visual reports using charts, patterns, comparisons, and storytelling techniques.'),
    ('Introduction to Data Science', 'Machine Learning Basics', 'https://www.youtube.com/watch?v=GwIo3gDZCVQ', 5, 'Learn supervised learning, unsupervised learning, features, labels, and model evaluation.'),
    ('Introduction to Data Science', 'Final Assessment', 'https://www.youtube.com/watch?v=7eh4d6sabA0', 6, 'Review the full data workflow and complete the final knowledge checkpoint.'),

    ('Modern Digital Marketing', 'Digital Marketing Overview', 'https://www.youtube.com/watch?v=nU-IIXBWlS4', 1, 'Understand digital channels, marketing funnels, campaign goals, and audience targeting.'),
    ('Modern Digital Marketing', 'SEO Fundamentals', 'https://www.youtube.com/watch?v=xsVTqzratPs', 2, 'Learn keyword research, on-page SEO, technical basics, and content optimization.'),
    ('Modern Digital Marketing', 'Social Media Strategy', 'https://www.youtube.com/watch?v=I2pwcAVonKI', 3, 'Plan social content, choose platforms, measure engagement, and build community trust.'),
    ('Modern Digital Marketing', 'Paid Ads and Analytics', 'https://www.youtube.com/watch?v=83V_0R9f8Dg', 4, 'Draft campaign objectives, audiences, budgets, conversion events, and reporting dashboards.'),
    ('Modern Digital Marketing', 'Email Marketing', 'https://www.youtube.com/watch?v=9S5Gf3A2p4I', 5, 'Create lead magnets, newsletter sequences, subject lines, and automation flows.'),
    ('Modern Digital Marketing', 'Final Campaign Project', 'https://www.youtube.com/watch?v=hF515-0Tduk', 6, 'Prepare a campaign plan with channels, goals, creative direction, and success metrics.'),

    ('Music Performance Foundations', 'Music Learning Roadmap', 'https://www.youtube.com/watch?v=rgaTLrZGlk0', 1, 'Understand pitch, rhythm, ear training, daily practice habits, and performance goals.'),
    ('Music Performance Foundations', 'Pitch and Ear Training', 'https://www.youtube.com/watch?v=rgaTLrZGlk0', 2, 'Practice matching notes, identifying intervals, and developing reliable pitch control.'),
    ('Music Performance Foundations', 'Rhythm and Timing Practice', 'https://www.youtube.com/watch?v=rgaTLrZGlk0', 3, 'Use claps, counts, metronome drills, and simple patterns to strengthen timing.'),
    ('Music Performance Foundations', 'Vocal Warmups and Breath Control', 'https://www.youtube.com/watch?v=rgaTLrZGlk0', 4, 'Warm up safely, manage breath support, and build consistent tone for short performances.'),
    ('Music Performance Foundations', 'Final Performance and Certificate', 'https://www.youtube.com/watch?v=rgaTLrZGlk0', 5, 'Record a short final performance, review the checklist, and complete certification.'))
INSERT INTO lessons (course_id, title, video_url, lesson_order, transcript)
SELECT c.id, lv.title, lv.video_url, lv.lesson_order, lv.transcript
FROM lesson_values lv
JOIN courses c ON c.title = lv.course_title
WHERE NOT EXISTS (
  SELECT 1
  FROM lessons l
  WHERE l.course_id = c.id AND l.lesson_order = lv.lesson_order
);

WITH lesson_values(course_title, title, video_url, lesson_order, transcript) AS (
  VALUES
    ('Full Stack Web Development', 'Introduction to Full Stack Development', 'https://www.youtube.com/watch?v=nu_pCVPKzTk', 1, 'Overview of frontend, backend, databases, APIs, and how a complete web app is assembled.'),
    ('Full Stack Web Development', 'HTML, CSS, and Responsive Design', 'https://www.youtube.com/watch?v=G3e-cpL7ofc', 2, 'Build semantic layouts, responsive sections, and polished landing pages for modern products.'),
    ('Full Stack Web Development', 'JavaScript Fundamentals', 'https://www.youtube.com/watch?v=EerdGm-ehJQ', 3, 'Practice variables, functions, arrays, objects, events, and browser-based interactivity.'),
    ('Full Stack Web Development', 'React Essentials', 'https://www.youtube.com/watch?v=SqcY0GlETPk', 4, 'Understand components, props, state, hooks, routing, and reusable UI composition.'),
    ('Full Stack Web Development', 'Backend with Node.js and Express', 'https://www.youtube.com/watch?v=Oe421EPjeBE', 5, 'Create REST APIs, route handlers, middleware, and server-side business logic.'),
    ('Full Stack Web Development', 'PostgreSQL and Database Design', 'https://www.youtube.com/watch?v=qw--VYLpxG4', 6, 'Design tables, relationships, queries, and data models for real applications.'),
    ('Full Stack Web Development', 'Authentication and Payments', 'https://www.youtube.com/watch?v=F-sFp_AvHc8', 7, 'Implement login, signup, password reset, protected routes, and payment checkout concepts.'),
    ('Full Stack Web Development', 'Final Project and Certificate', 'https://www.youtube.com/watch?v=ZxKM3DCV2kE', 8, 'Bring the pieces together into a mini LMS project and prepare for final certification.'),
    ('Introduction to Data Science', 'What is Data Science?', 'https://www.youtube.com/watch?v=ua-CiDNNj30', 1, 'Explore data science roles, workflows, business questions, and project structure.'),
    ('Introduction to Data Science', 'Python for Data Analysis', 'https://www.youtube.com/watch?v=LHBE6Q9XlzI', 2, 'Use Python fundamentals for lists, dictionaries, functions, notebooks, and analysis tasks.'),
    ('Introduction to Data Science', 'Working with Data', 'https://www.youtube.com/watch?v=vmEHCJofslg', 3, 'Load CSV files, clean missing values, format columns, and prepare datasets for analysis.'),
    ('Introduction to Data Science', 'Data Visualization', 'https://www.youtube.com/watch?v=3Xc3CA655Y4', 4, 'Create visual reports using charts, patterns, comparisons, and storytelling techniques.'),
    ('Introduction to Data Science', 'Machine Learning Basics', 'https://www.youtube.com/watch?v=GwIo3gDZCVQ', 5, 'Learn supervised learning, unsupervised learning, features, labels, and model evaluation.'),
    ('Introduction to Data Science', 'Final Assessment', 'https://www.youtube.com/watch?v=7eh4d6sabA0', 6, 'Review the full data workflow and complete the final knowledge checkpoint.'),
    ('Modern Digital Marketing', 'Digital Marketing Overview', 'https://www.youtube.com/watch?v=nU-IIXBWlS4', 1, 'Understand digital channels, marketing funnels, campaign goals, and audience targeting.'),
    ('Modern Digital Marketing', 'SEO Fundamentals', 'https://www.youtube.com/watch?v=xsVTqzratPs', 2, 'Learn keyword research, on-page SEO, technical basics, and content optimization.'),
    ('Modern Digital Marketing', 'Social Media Strategy', 'https://www.youtube.com/watch?v=I2pwcAVonKI', 3, 'Plan social content, choose platforms, measure engagement, and build community trust.'),
    ('Modern Digital Marketing', 'Paid Ads and Analytics', 'https://www.youtube.com/watch?v=83V_0R9f8Dg', 4, 'Draft campaign objectives, audiences, budgets, conversion events, and reporting dashboards.'),
    ('Modern Digital Marketing', 'Email Marketing', 'https://www.youtube.com/watch?v=9S5Gf3A2p4I', 5, 'Create lead magnets, newsletter sequences, subject lines, and automation flows.'),
    ('Modern Digital Marketing', 'Final Campaign Project', 'https://www.youtube.com/watch?v=hF515-0Tduk', 6, 'Prepare a campaign plan with channels, goals, creative direction, and success metrics.'),
    ('Music Performance Foundations', 'Music Learning Roadmap', 'https://www.youtube.com/watch?v=rgaTLrZGlk0', 1, 'Understand pitch, rhythm, ear training, daily practice habits, and performance goals.'),
    ('Music Performance Foundations', 'Pitch and Ear Training', 'https://www.youtube.com/watch?v=rgaTLrZGlk0', 2, 'Practice matching notes, identifying intervals, and developing reliable pitch control.'),
    ('Music Performance Foundations', 'Rhythm and Timing Practice', 'https://www.youtube.com/watch?v=rgaTLrZGlk0', 3, 'Use claps, counts, metronome drills, and simple patterns to strengthen timing.'),
    ('Music Performance Foundations', 'Vocal Warmups and Breath Control', 'https://www.youtube.com/watch?v=rgaTLrZGlk0', 4, 'Warm up safely, manage breath support, and build consistent tone for short performances.'),
    ('Music Performance Foundations', 'Final Performance and Certificate', 'https://www.youtube.com/watch?v=rgaTLrZGlk0', 5, 'Record a short final performance, review the checklist, and complete certification.'))
UPDATE lessons l
SET
  title = lv.title,
  video_url = lv.video_url,
  transcript = lv.transcript,
  updated_at = CURRENT_TIMESTAMP
FROM lesson_values lv
JOIN courses c ON c.title = lv.course_title
WHERE l.course_id = c.id
  AND l.lesson_order = lv.lesson_order;

-- Seed enough quiz questions so demos work even without AI generation.
WITH lesson_targets AS (
  SELECT l.id AS lesson_id, l.title AS lesson_title, c.title AS course_title
  FROM lessons l
  JOIN courses c ON c.id = l.course_id
  WHERE c.title IN (
    'Full Stack Web Development',
    'Introduction to Data Science',
    'Modern Digital Marketing',
    'Music Performance Foundations'
  )
),
quiz_values AS (
  SELECT
    lt.lesson_id,
    q.question,
    q.options::jsonb AS options,
    q.correct_answer,
    q.type
  FROM lesson_targets lt
  CROSS JOIN LATERAL (
    VALUES
      ('What is the main goal of "' || lt.lesson_title || '"?', '["Understand the lesson concept","Skip the module","Change account settings","Delete course data"]', 'Understand the lesson concept', 'text'),
      ('Which activity best supports this lesson?', '["Practice with the provided resource","Ignore the video","Reset the password","Change the thumbnail"]', 'Practice with the provided resource', 'text'),
      ('What should a learner do after watching the lesson?', '["Attempt the quiz and mark progress","Close the LMS","Delete discussion posts","Skip certification"]', 'Attempt the quiz and mark progress', 'text'),
      ('Why are resources attached to this lesson?', '["To support revision and implementation","To replace the course","To hide the video","To remove assessments"]', 'To support revision and implementation', 'text'),
      ('How does this lesson contribute to certification?', '["It builds completion and assessment readiness","It disables certificates","It changes the user role","It removes purchase access"]', 'It builds completion and assessment readiness', 'text')
  ) AS q(question, options, correct_answer, type)
)
INSERT INTO quizzes (lesson_id, question, options, correct_answer, type)
SELECT lesson_id, question, options, correct_answer, type
FROM quiz_values qv
WHERE NOT EXISTS (
  SELECT 1
  FROM quizzes q
  WHERE q.lesson_id = qv.lesson_id
    AND q.question = qv.question
);

-- Course resources
WITH resource_values(course_title, lesson_order, title, description, resource_type, resource_url, file_name) AS (
  VALUES
    ('Full Stack Web Development', NULL, 'Full Stack Roadmap PDF', 'A client-demo roadmap covering frontend, backend, database, deployment, and certification checkpoints.', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Full Stack Roadmap.pdf'),
    ('Full Stack Web Development', 4, 'React Component Checklist', 'Checklist for building reusable, readable React components.', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'React Component Checklist.pdf'),
    ('Full Stack Web Development', 3, 'JavaScript Practice Sheet', 'Practice prompts for variables, arrays, objects, functions, and DOM events.', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'JavaScript Practice Sheet.pdf'),
    ('Full Stack Web Development', 6, 'LMS Database Schema', 'Sample schema notes for courses, lessons, users, progress, payments, and certificates.', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'LMS Database Schema.pdf'),
    ('Introduction to Data Science', NULL, 'Data Science Roadmap PDF', 'A beginner-friendly learning path from Python basics to model evaluation.', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Data Science Roadmap.pdf'),
    ('Introduction to Data Science', 3, 'Sample Dataset CSV', 'A compact dataset for cleaning and visualization practice.', 'csv', 'https://people.sc.fsu.edu/~jburkardt/data/csv/airtravel.csv', 'Data Science Sample Dataset.csv'),
    ('Modern Digital Marketing', 2, 'SEO Checklist', 'Keyword, metadata, content, and technical SEO checklist for campaign planning.', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'SEO Checklist.pdf'),
    ('Modern Digital Marketing', 3, 'Social Media Calendar Template', 'A campaign calendar template for weekly content planning.', 'link', 'https://example.com/social-media-calendar-template', 'Social Media Calendar Template.xlsx'),
    ('Music Performance Foundations', NULL, 'Music Practice Tracker', 'Daily checklist for pitch, rhythm, breath, ear training, and performance review.', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Music Practice Tracker.pdf'),
    ('Music Performance Foundations', 2, 'Pitch Matching Exercises', 'Short warmup sequence for matching notes and improving ear training.', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Pitch Matching Exercises.pdf')
)
INSERT INTO course_resources (course_id, lesson_id, title, description, resource_type, resource_url, file_name, uploaded_by)
SELECT
  c.id,
  l.id,
  rv.title,
  rv.description,
  rv.resource_type,
  rv.resource_url,
  rv.file_name,
  u.id
FROM resource_values rv
JOIN courses c ON c.title = rv.course_title
LEFT JOIN lessons l ON l.course_id = c.id AND l.lesson_order = rv.lesson_order
LEFT JOIN users u ON u.email = 'mentor.demo@example.com'
WHERE NOT EXISTS (
  SELECT 1
  FROM course_resources cr
  WHERE cr.course_id = c.id
    AND cr.title = rv.title
);

-- Discussion threads and replies
WITH thread_values(course_title, lesson_order, user_email, title, body, is_answered) AS (
  VALUES
    ('Full Stack Web Development', 4, 'priya.demo@example.com', 'Props vs state in React', 'I completed the React lesson, but I am confused about props vs state. Can someone explain with an example?', TRUE),
    ('Full Stack Web Development', 3, 'arjun.demo@example.com', 'JavaScript practice sheet download', 'Where can I download the JavaScript practice sheet for this module?', TRUE),
    ('Full Stack Web Development', 8, 'sneha.demo@example.com', 'Final project database choice', 'For the final project, should we use PostgreSQL or MongoDB?', FALSE),
    ('Music Performance Foundations', 2, 'priya.demo@example.com', 'Pitch practice routine', 'How many minutes should I spend on pitch matching every day before recording the final performance?', TRUE)
)
INSERT INTO discussion_threads (course_id, lesson_id, user_id, title, body, is_answered)
SELECT c.id, l.id, u.id, tv.title, tv.body, tv.is_answered
FROM thread_values tv
JOIN courses c ON c.title = tv.course_title
LEFT JOIN lessons l ON l.course_id = c.id AND l.lesson_order = tv.lesson_order
JOIN users u ON u.email = tv.user_email
WHERE NOT EXISTS (
  SELECT 1
  FROM discussion_threads dt
  WHERE dt.course_id = c.id
    AND dt.title = tv.title
);

WITH reply_values(thread_title, user_email, body, is_solution) AS (
  VALUES
    ('Props vs state in React', 'mentor.demo@example.com', 'Props are values passed into a component from outside. State is data managed inside the component and updated through user actions or app logic.', TRUE),
    ('JavaScript practice sheet download', 'mentor.demo@example.com', 'Open the Resources tab in this course. The JavaScript Practice Sheet is attached to the JavaScript Fundamentals lesson.', TRUE),
    ('Final project database choice', 'mentor.demo@example.com', 'For this LMS demo, use PostgreSQL because the backend already models users, courses, lessons, progress, payments, and certificates relationally.', FALSE),
    ('Pitch practice routine', 'mentor.demo@example.com', 'Start with 10 minutes per day: 3 minutes breathing, 4 minutes pitch matching, and 3 minutes listening back to your recording.', TRUE)
)
INSERT INTO discussion_replies (thread_id, user_id, body, is_solution)
SELECT dt.id, u.id, rv.body, rv.is_solution
FROM reply_values rv
JOIN discussion_threads dt ON dt.title = rv.thread_title
JOIN users u ON u.email = rv.user_email
WHERE NOT EXISTS (
  SELECT 1
  FROM discussion_replies dr
  WHERE dr.thread_id = dt.id
    AND dr.body = rv.body
);

UPDATE discussion_threads dt
SET
  is_answered = TRUE,
  answered_reply_id = dr.id,
  resolved_by = dr.user_id,
  resolved_at = COALESCE(dt.resolved_at, CURRENT_TIMESTAMP),
  updated_at = CURRENT_TIMESTAMP
FROM discussion_replies dr
WHERE dr.thread_id = dt.id
  AND dr.is_solution = TRUE
  AND dt.title IN (
    'Props vs state in React',
    'JavaScript practice sheet download',
    'Pitch practice routine'
  );

