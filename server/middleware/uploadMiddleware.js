import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadRoot = path.resolve(process.cwd(), 'uploads');
const courseThumbDir = path.join(uploadRoot, 'courses');
const lessonVideoDir = path.join(uploadRoot, 'lessons');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(courseThumbDir);
ensureDir(lessonVideoDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'thumbnail_file') {
      cb(null, courseThumbDir);
      return;
    }
    if (file.fieldname === 'video_file') {
      cb(null, lessonVideoDir);
      return;
    }

    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'thumbnail_file') {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Thumbnail must be an image file'));
  }

  if (file.fieldname === 'video_file') {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Lesson video must be an MP4, WebM, MOV, or MKV file'));
  }

  cb(null, true);
};

export const courseUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const lessonUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});

export const buildUploadUrl = (req, filePath) => {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  return `${req.protocol}://${req.get('host')}/uploads/${normalized}`;
};
