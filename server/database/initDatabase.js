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

    // Seed transcripts for all 17 famous YouTube video tutorials
    const transcripts = {
      '8p9v_X3zEP4': 'In this video, the instructor teaches correct piano sitting posture: sit on the front half of the bench, keep your feet flat on the floor, and align your forearms parallel to the keyboard. Keep your shoulders relaxed and your fingers curved, as if you are gently holding a tennis ball in each hand. The lesson introduces the concept of the keyboard layout, showing how black keys are grouped in pairs of twos and threes. It teaches how to find Middle C (the white key immediately to the left of the group of two black keys) and exercises playing Middle C using finger 1 (thumb) of the right hand.',
      'L6_50Y93mEw': 'This lesson focuses on mastering all the white keys (A, B, C, D, E, F, G). The instructor demonstrates how white keys repeat in octaves across the 88-key piano. The lesson teaches the "Musical Alphabet" (A through G) and guides the student on finding and memorizing every single note relative to the groups of two and three black keys. You will practice playing simple step-wise runs up and down using the right hand (fingers 1, 2, and 3) playing C, D, and E in steady quarter notes.',
      '7hR6U9pU6lE': 'In this video, the instructor introduces the concept of chords, specifically major triads. You will learn how to construct a C Major Triad by playing three notes together: C (root), E (third), and G (fifth). The instructor shows the correct finger spacing using fingers 1 (thumb), 3 (middle finger), and 5 (pinky) of the right hand. The lesson details the sound difference between a bright Major chord and a darker Minor chord, and practices playing the C Major triad held down for four full beats (whole note) with the sustain pedal.',
      'Yp69GZ0u0pI': 'This lesson introduces the C Major Scale played with the right hand. The instructor explains the thumb-under technique: play C (finger 1), D (finger 2), E (finger 3), and then tuck your thumb under your middle finger to play F (finger 1), continuing G (2), A (3), B (4), and C (5). The lesson details how this smooth finger transition prevents running out of fingers and enables fluid, ascending and descending scale movement without choppy pauses.',
      
      'BBz-Jyr23M4': 'In this highly popular first guitar lesson, Justin teaches the absolute basics: how to hold the guitar resting on your right thigh, how to hold a pick between your thumb and index finger, and how to tune the strings (E, A, D, G, B, E). He introduces the first two essential open chords: the D major chord and the A major chord. He shows the exact finger placements: for D major, place finger 1 on the 2nd fret of the G string, finger 2 on the 2nd fret of the high E string, and finger 3 on the 3rd fret of the B string, strumming only the top 4 strings. For A major, place fingers 1, 2, and 3 in a straight line on the 2nd fret of the D, G, and B strings, strumming the top 5 strings. He emphasizes practicing shifting between these two chords using his "1-minute changes" exercise.',
      'Y8m_p8_qf-w': 'This lesson teaches the E Minor (Em) chord, which is one of the easiest chords to play on the guitar. Place finger 2 (middle) on the 2nd fret of the A string, and finger 3 (ring) on the 2nd fret of the D string. You strum all six strings together. The instructor demonstrates the core practice of steady down-strums on every beat in 4/4 time. He explains how to keep your hand relaxed and maintain a consistent rhythm without pausing during chord changes.',
      '6P3Z6B79_8s': 'In this video, you learn the G Major open chord. The instructor demonstrates two popular fingerings: the standard fingering (finger 1 on 2nd fret of A, finger 2 on 3rd fret of low E, finger 3 on 3rd fret of high E) and the 4-finger rock fingering. The lesson guides you through strumming exercises transitioning from G Major to C Major and D Major, highlighting common mistakes such as muting adjacent strings by not curling your fretting fingers high enough.',
      'ZfX_jF7f9k0': 'This lesson focuses on building a solid rhythm foundation. The instructor introduces the classic strumming pattern: Down, Down, Up, Up, Down, Up (D-D-U-U-D-U) in 4/4 meter. He shows how to keep your strumming arm moving constantly in a steady pendulum motion, even when you are not actually striking the strings, ensuring perfect micro-timing.',
      
      '0_u_mS6Y7-k': 'This introductory flute lesson teaches correct embouchure technique: form a tight smile, make a small aperture (hole) in the center of your lips, and blow a focused stream of air across the embouchure hole, rather than into it. The instructor demonstrates how to practice using only the headjoint of the flute. He explains how to hold the body of the flute horizontally, resting it on three primary contact points: the base of the left index finger, the right thumb, and the right pinky finger.',
      '5V_R_vV4t7w': 'In this lesson, the instructor teaches the first three basic notes: B, A, and G. For B, press the left thumb key and the left index finger key, plus the right pinky key. For A, add the left middle finger key. For G, add the left ring finger key. The instructor demonstrates breathing exercises to maintain a steady air pressure and produce a clean, clear tone without airy sounds or cracking the pitch.',
      'v8z2wYf6B3k': 'This lesson focuses on tonguing, which is the standard way to articulate notes on the flute. The instructor shows how to use the tip of your tongue to touch the roof of your mouth just behind your front teeth, saying the syllable "Too" or "Doo" as you blow. This acts like a valve to start and stop the airflow cleanly, producing crisp, separated notes instead of slurring them together.',
      'x0xL7W_yFp4': 'In this video, you will learn techniques for playing low notes (Low F, E, and D) cleanly. The instructor explains that low notes require a wider, warmer, and slower airflow with a slightly larger lip aperture. He warns against blowing too hard, which causes the notes to jump up an octave, and demonstrates finger exercises to coordinate pressing multiple keys in the right hand simultaneously.',
      'R_I8m9L-u_8': 'This advanced lesson teaches diaphragm breathing and lung expansion for woodwind players. The instructor demonstrates belly breathing: expand your stomach as you inhale, keeping your shoulders down, and use your core muscles to push a highly compressed, steady stream of air through the flute. This technique allows you to hold long phrases and play high register notes with beautiful tone and perfect pitch.',
      
      'vlHpWvsW040': 'In this first violin lesson, the instructor demonstrates the correct way to hold the violin: place the instrument on your left collarbone and secure it gently by resting your jaw on the chin rest, keeping your neck straight and shoulders relaxed. She then teaches the "Violin Bow Hold": place your right thumb on the underside of the bow frog, curve your fingers over the top, place your index finger on the leather grip, and rest your pinky on top of the bow stick. You will practice "pencil holding" exercises to build finger flexibility before applying the grip to the heavy bow.',
      'jW7_HjR9M0U': 'This lesson teaches Pizzicato (plucking the strings) to build pitch and left-hand coordination before using the bow. Rest your right thumb against the side of the fingerboard, and use the fleshy pad of your right index finger to pluck the open strings: G, D, A, and E. The instructor demonstrates simple plucking patterns in quarter notes and explains how to avoid pulling the string too hard, which creates a slapping buzz against the fingerboard.',
      'kY8_GfB5U4Y': 'In this video, the instructor teaches the first bowing exercises on open strings. You will learn the difference between a Down Bow (moving your arm away from your body, starting at the frog) and an Up Bow (moving your arm toward your body, starting at the tip). She emphasizes keeping the bow perfectly perpendicular to the strings, midway between the bridge and the fingerboard, by opening and closing your right elbow joint smoothly.',
      'hG9V8qU-1_0': 'This lesson introduces pitch creation using your left hand. The instructor shows how to curve your left wrist and place the tips of your fingers firmly on the fingerboard. You will learn the placement for finger 1 (index finger) on the A string to play the note B, and finger 2 (middle finger) to play C-sharp. She demonstrates how to check your intonation by playing the finger-held note alongside an open string to hear if it sounds perfectly in tune.'
    };

    for (const [videoId, transcriptText] of Object.entries(transcripts)) {
      try {
        await pool.query(
          "UPDATE lessons SET transcript = $1 WHERE video_url LIKE $2",
          [transcriptText, `%${videoId}%`]
        );
      } catch (err) {
        console.error(`Failed to seed transcript for video ID ${videoId}:`, err.message);
      }
    }

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
