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

  // Copy signature image from gemini brain to public directory
  try {
    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = 'C:\\Users\\ELCOT\\.gemini\\antigravity\\brain\\9cc299a1-9224-4559-88b1-0eadeda6a125\\media__1779168901011.png';
    const destPath = 'd:\\LMS\\LMS\\public\\signature.png';
    if (fs.existsSync(sourcePath)) {
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.copyFileSync(sourcePath, destPath);
      console.log('Successfully copied user signature to frontend public directory!');
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
