import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import aiRoutes from './ai/index.js';
import { initDatabase } from './database/initDatabase.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('LMS Backend API is running...');
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
