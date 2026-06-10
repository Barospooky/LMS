import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, 'schema.sql');
const seedPath = path.join(__dirname, 'seed.sql');

export const initDatabase = async () => {
  const { Pool } = pg;
  const useConnectionString = Boolean(process.env.DATABASE_URL);
  const useSsl =
    process.env.DB_SSL === 'true' ||
    process.env.NODE_ENV === 'production' ||
    useConnectionString;
  const dbName = process.env.DB_NAME || 'lms';

  if (!useConnectionString) {
    // Local Postgres can create the target database if it does not exist yet.
    const tempPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '123',
      port: Number(process.env.DB_PORT) || 5432,
      database: 'postgres',
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    });

    try {
      const res = await tempPool.query(
        `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`
      );
      if (res.rowCount === 0) {
        console.log(`Database ${dbName} does not exist. Creating...`);
        await tempPool.query(`CREATE DATABASE ${dbName}`);
        console.log(`Database ${dbName} created successfully.`);
      }
    } catch (error) {
      console.error('Error checking/creating database:', error.message);
    } finally {
      await tempPool.end();
    }
  } else {
    console.log('Using managed PostgreSQL via DATABASE_URL; skipping CREATE DATABASE step.');
  }

  try {
    const schemaSql = await fs.readFile(schemaPath, 'utf-8');
    const seedSql = await fs.readFile(seedPath, 'utf-8');

    // Run schema
    await pool.query(schemaSql);
    
    // Run migrations/fixes if needed
    try {
      await pool.query("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL");
    } catch (e) { /* ignore if already applied */ }
    
    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) NOT NULL DEFAULT 'local'");
    } catch (e) { /* ignore if already applied */ }
    
    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE");
    } catch (e) { /* ignore if already applied */ }

    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student'");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    } catch (e) { /* ignore */ }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN NOT NULL DEFAULT FALSE,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query("ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE");
      await pool.query("ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS used_at TIMESTAMP");
      await pool.query("CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)");
      await pool.query("CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash)");
    } catch (e) { /* ignore */ }

    try {
      const colCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='courses' AND column_name='instrument'
      `);
      if (colCheck.rowCount > 0) {
        await pool.query("ALTER TABLE courses RENAME COLUMN instrument TO category");
        console.log("Renamed courses.instrument to courses.category");
      }
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100)");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_id INT REFERENCES users(id) ON DELETE SET NULL");
      // Optional: Set default instructor to first admin user if we want
      // await pool.query("UPDATE courses SET instructor_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1) WHERE instructor_id IS NULL");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE courses ALTER COLUMN thumbnail TYPE TEXT");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'beginner'");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE lessons ALTER COLUMN video_url TYPE TEXT");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS transcript TEXT");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) NOT NULL DEFAULT 'video'");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    } catch (e) { /* ignore */ }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_progress (
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, course_id, lesson_id)
        )
      `);
    } catch (e) { /* ignore if already applied */ }

    try {
      await pool.query("ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'text'");
    } catch (e) { /* ignore if already applied */ }

    try {
      await pool.query("ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE user_courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    } catch (e) { /* ignore */ }

    const extraTablesSql = `
      CREATE TABLE IF NOT EXISTS modules (
        id SERIAL PRIMARY KEY,
        course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        module_order INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS learning_paths (
        id SERIAL PRIMARY KEY,
        organization_name VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS path_enrollments (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        learning_path_id INT NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, learning_path_id)
      );

      CREATE TABLE IF NOT EXISTS lesson_progress (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        status VARCHAR(30) NOT NULL DEFAULT 'not_started',
        progress_percent INT NOT NULL DEFAULT 0,
        last_position_seconds INT NOT NULL DEFAULT 0,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, lesson_id)
      );

      CREATE TABLE IF NOT EXISTS assessments (
        id SERIAL PRIMARY KEY,
        course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        assessment_type VARCHAR(50) NOT NULL DEFAULT 'quiz',
        passing_score INT NOT NULL DEFAULT 70,
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assessment_questions (
        id SERIAL PRIMARY KEY,
        assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        question_type VARCHAR(50) NOT NULL DEFAULT 'mcq',
        correct_answer TEXT,
        explanation TEXT,
        question_order INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS question_options (
        id SERIAL PRIMARY KEY,
        question_id INT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
        option_label VARCHAR(10),
        option_text TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS assessment_submissions (
        id SERIAL PRIMARY KEY,
        assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score INT NOT NULL DEFAULT 0,
        passed BOOLEAN NOT NULL DEFAULT FALSE,
        total_questions INT NOT NULL DEFAULT 0,
        response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        graded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (assessment_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        certificate_number VARCHAR(100) UNIQUE NOT NULL,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        pdf_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, course_id)
      );

      CREATE TABLE IF NOT EXISTS course_resources (
        id SERIAL PRIMARY KEY,
        course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        resource_type VARCHAR(50) NOT NULL DEFAULT 'link',
        resource_url TEXT NOT NULL,
        file_name VARCHAR(255),
        uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS discussion_threads (
        id SERIAL PRIMARY KEY,
        course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        is_answered BOOLEAN NOT NULL DEFAULT FALSE,
        answered_reply_id INT,
        resolved_by INT REFERENCES users(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS discussion_replies (
        id SERIAL PRIMARY KEY,
        thread_id INT NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        is_solution BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await pool.query(extraTablesSql);
    } catch (e) { /* ignore if already applied */ }

    try {
      await pool.query("ALTER TABLE assessments ADD COLUMN IF NOT EXISTS lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS total_questions INT NOT NULL DEFAULT 0");
    } catch (e) { /* ignore */ }

    try {
      await pool.query("ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS response_payload JSONB NOT NULL DEFAULT '{}'::jsonb");
    } catch (e) { /* ignore */ }

    await pool.query(seedSql);

    console.log('PostgreSQL schema and seed data are ready');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    throw error;
  }
};
