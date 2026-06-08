import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET || 'dev_refresh'}_refresh`;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

const createAccessToken = (id, role) =>
  jwt.sign({ id, role, tokenType: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

const createRefreshToken = (id, role) =>
  jwt.sign({ id, role, tokenType: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    ...authCookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    ...authCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', authCookieOptions);
  res.clearCookie('refreshToken', authCookieOptions);
};

const buildUserResponse = (user) => ({
  id: user.id,
  firstName: user.first_name ?? user.firstname,
  lastName: user.last_name ?? user.lastname,
  email: user.email,
  role: user.role,
  authProvider: user.auth_provider,
  phone: user.phone ?? null,
  bio: user.bio ?? '',
  preferences: user.preferences || {},
});

const findUserById = async (userId) => {
  const userRes = await pool.query(
    'SELECT id, first_name, last_name, email, role, auth_provider, phone, bio, preferences FROM users WHERE id = $1',
    [userId]
  );
  return userRes.rows[0] || null;
};

export const signup = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, role, auth_provider, phone, bio, preferences',
      [firstName, lastName, email, hashedPassword]
    );

    const createdUser = result.rows[0];
    const { id: userId, role } = createdUser;
    const accessToken = createAccessToken(userId, role);
    const refreshToken = createRefreshToken(userId, role);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      user: buildUserResponse({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
        role,
        auth_provider: 'local',
        phone: null,
        bio: '',
        preferences: {},
      }),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const users = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (users.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users.rows[0];
    const normalizedPassword = user.password_hash ?? user.password;
    if (!normalizedPassword) {
      return res.status(400).json({ message: 'This account uses Google sign-in. Continue with Google instead.' });
    }

    const passwordsMatch = await bcrypt.compare(password, normalizedPassword);
    if (!passwordsMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const accessToken = createAccessToken(user.id, user.role);
    const refreshToken = createRefreshToken(user.id, user.role);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

export const googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: 'Google credential is required' });
  }

  try {
    const googleResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);

    if (!googleResponse.ok) {
      return res.status(401).json({ message: 'Google token verification failed' });
    }

    const googleUser = await googleResponse.json();

    if (process.env.GOOGLE_CLIENT_ID && googleUser.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: 'Google client mismatch' });
    }

    const email = googleUser.email;
    const googleId = googleUser.sub;
    const firstName = googleUser.given_name || 'Google';
    const lastName = googleUser.family_name || 'User';

    let result = await pool.query('SELECT * FROM users WHERE email = $1 OR google_id = $2', [email, googleId]);
    let user = result.rows[0];

    if (!user) {
      result = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, auth_provider, google_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [firstName, lastName, email, null, 'google', googleId]
      );
      user = result.rows[0];
    } else if (!user.google_id || user.auth_provider !== 'google') {
      result = await pool.query(
        `UPDATE users
         SET first_name = COALESCE(first_name, $1),
             last_name = COALESCE(last_name, $2),
             auth_provider = 'google',
             google_id = $3
         WHERE id = $4
         RETURNING *`,
        [firstName, lastName, googleId, user.id]
      );
      user = result.rows[0];
    }

    const accessToken = createAccessToken(user.id, user.role);
    const refreshToken = createRefreshToken(user.id, user.role);
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during Google login', error: error.message });
  }
};

export const refreshSession = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token found' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await findUserById(decoded.id);

    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'User not found' });
    }

    const accessToken = createAccessToken(user.id, user.role);
    const nextRefreshToken = createRefreshToken(user.id, user.role);
    setAuthCookies(res, accessToken, nextRefreshToken);

    res.json({ user: buildUserResponse(user) });
  } catch (error) {
    clearAuthCookies(res);
    res.status(401).json({ message: 'Refresh token is not valid' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await findUserById(req.user?.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: buildUserResponse(user) });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current user', error: error.message });
  }
};

export const updateCurrentUser = async (req, res) => {
  const userId = req.user?.id;
  const {
    firstName,
    lastName,
    email,
    phone,
    bio,
    preferences = {},
  } = req.body || {};

  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const currentUserRes = await pool.query(
      'SELECT id, email, auth_provider FROM users WHERE id = $1',
      [userId]
    );

    if (currentUserRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = currentUserRes.rows[0];
    const normalizedEmail = String(email || '').trim();

    if (normalizedEmail && normalizedEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      const duplicate = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [normalizedEmail, userId]);
      if (duplicate.rows.length > 0) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    const updatedUser = await pool.query(
      `UPDATE users
       SET first_name = COALESCE(NULLIF($1, ''), first_name),
           last_name = COALESCE(NULLIF($2, ''), last_name),
           email = COALESCE(NULLIF($3, ''), email),
           phone = $4,
           bio = $5,
           preferences = $6::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, first_name, last_name, email, role, auth_provider, phone, bio, preferences`,
      [
        firstName ?? '',
        lastName ?? '',
        normalizedEmail || null,
        phone ?? null,
        bio ?? '',
        JSON.stringify(preferences || {}),
        userId,
      ]
    );

    res.json({ user: buildUserResponse(updatedUser.rows[0]) });
  } catch (error) {
    res.status(500).json({ message: 'Error updating current user', error: error.message });
  }
};

export const logout = async (req, res) => {
  clearAuthCookies(res);
  res.json({ message: 'Logged out successfully' });
};
