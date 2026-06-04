import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (!req.user.role) {
      const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
      if (userRes.rows.length > 0) {
        req.user.role = userRes.rows[0].role;
      } else {
        req.user.role = 'student';
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default auth;
