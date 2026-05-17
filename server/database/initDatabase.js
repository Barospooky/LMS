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

    // Update prices and thumbnails before seeding to ensure they meet the minimum requirement and premium aesthetic
    await pool.query("UPDATE courses SET price = 1499.00, thumbnail = 'https://i.pinimg.com/736x/2b/23/d0/2b23d043f1697268576f30e9d1678103.jpg' WHERE title = 'Piano Masterclass'");
    await pool.query("UPDATE courses SET price = 1299.00, thumbnail = 'https://i.pinimg.com/736x/f2/63/66/f2636671751b616380bf29da0567fe30.jpg' WHERE title = 'Guitar Fundamentals'");
    await pool.query("UPDATE courses SET price = 1099.00, thumbnail = 'https://i.pinimg.com/736x/47/c7/4a/47c74a40ae1c9c85173c228cc4d4fa6f.jpg' WHERE title = 'Flute Tutorial'");
    await pool.query("UPDATE courses SET price = 1999.00, thumbnail = 'https://i.pinimg.com/1200x/41/c0/c7/41c0c7371e634fb47729339c291ae15e.jpg' WHERE title = 'Violin Masterclass'");
    
    await pool.query(seedSql);

    console.log('PostgreSQL schema and seed data are ready');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    throw error;
  }
};
