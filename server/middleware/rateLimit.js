const buckets = new Map();

const cleanupWindowMs = 60 * 60 * 1000;

const authRateLimit = ({
  windowMs = 15 * 60 * 1000,
  max = 20,
  message = 'Too many authentication attempts, please try again later.',
} = {}) => (req, res, next) => {
  const key = `${req.ip}:${req.originalUrl}`;
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > max) {
    return res.status(429).json({ message });
  }

  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt + cleanupWindowMs < now) {
      buckets.delete(key);
    }
  }
}).unref();

export default authRateLimit;
