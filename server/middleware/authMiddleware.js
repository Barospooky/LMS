import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET || 'dev_refresh'}_refresh`;

const signAccessToken = (id, role) =>
  jwt.sign({ id, role, tokenType: 'access' }, ACCESS_SECRET, { expiresIn: '15m' });

const readToken = (req) => {
  const bearerToken = req.header('Authorization')?.replace('Bearer ', '');
  return bearerToken || req.cookies?.accessToken || null;
};

const loadUserRole = async (userId) => {
  const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  return userRes.rows[0]?.role || 'student';
};

const attachUserRole = async (decoded) => {
  const role = decoded.role || (await loadUserRole(decoded.id));
  return { ...decoded, role };
};

const tryRefresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return null;

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const role = decoded.role || (await loadUserRole(decoded.id));
    const accessToken = signAccessToken(decoded.id, role);
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    return { id: decoded.id, role };
  } catch (error) {
    return null;
  }
};

const auth = async (req, res, next) => {
  const token = readToken(req);

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = await attachUserRole(decoded);
    next();
  } catch (error) {
    const refreshed = await tryRefresh(req, res);
    if (!refreshed) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = refreshed;
    next();
  }
};

export default auth;
