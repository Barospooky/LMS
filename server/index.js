import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './ai/index.js';
import { initDatabase } from './database/initDatabase.js';

dotenv.config();

const app = express();
const defaultAllowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean)
);

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || defaultAllowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('LMS Backend API is running...');
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await initDatabase();

  // Optionally copy a signature image into the frontend's public directory.
  // This keeps local customization possible without hardcoding machine-specific paths.
  try {
    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = process.env.SIGNATURE_SOURCE_PATH;
    const destPath = process.env.SIGNATURE_DEST_PATH || path.resolve(process.cwd(), '..', 'public', 'signature.png');
    if (sourcePath && fs.existsSync(sourcePath)) {
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.copyFileSync(sourcePath, destPath);
      console.log('Successfully copied user signature to frontend public directory.');
    } else if (sourcePath) {
      console.warn(`Signature source file not found: ${sourcePath}`);
    }
  } catch (err) {
    console.error('Error copying signature:', err);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
