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
      await pool.query("ALTER TABLE courses ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'beginner'");
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

    // Emergency migration: Add transcript column to lessons table
    try {
      await pool.query("ALTER TABLE lessons ADD COLUMN IF NOT EXISTS transcript TEXT");
    } catch (e) { /* ignore if already applied */ }

    await pool.query(seedSql);

    console.log('PostgreSQL schema and seed data are ready');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    throw error;
  }
};
