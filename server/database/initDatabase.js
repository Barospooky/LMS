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
  const dbName = process.env.DB_NAME || 'lms';
  
  // Create a temporary pool to connect to 'postgres' database to ensure 'lms' exists
  const tempPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123',
    port: Number(process.env.DB_PORT) || 5432,
    database: 'postgres'
  });

  try {
    // Check if database exists
    const res = await tempPool.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
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

    // Run seed
    await pool.query(seedSql);

    console.log('PostgreSQL schema and seed data are ready');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    throw error;
  }
};
