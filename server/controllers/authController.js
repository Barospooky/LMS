import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import pool from '../config/db.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET || 'dev_refresh'}_refresh`;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
const PASSWORD_RESET_EXPIRY_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES) || 30;

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
    'SELECT id, first_name, last_name, email, role, auth_provider, phone, bio, preferences, password_changed_at FROM users WHERE id = $1',
    [userId]
  );
  return userRes.rows[0] || null;
};

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const tokenIssuedBeforePasswordChange = (decoded, passwordChangedAt) => {
  if (!passwordChangedAt || !decoded.iat) return false;
  return decoded.iat * 1000 < new Date(passwordChangedAt).getTime();
};

const getFrontendUrl = () =>
  process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';

const buildResetUrl = (token) =>
  `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;

const buildResetResponse = (token) => {
  const response = {
    message: "If this email is registered, you'll receive a reset link shortly. Check your inbox.",
  };

  if (process.env.NODE_ENV !== 'production' && token) {
    response.resetToken = token;
    response.resetUrl = buildResetUrl(token);
  }

  return response;
};

const isSmtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getSmtpTransporter = () => {
  if (!isSmtpConfigured()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendSmtpEmail = async ({ to, subject, html, text }) => {
  const transporter = getSmtpTransporter();
  if (!transporter || !to) {
    return false;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
  });

  return true;
};

const sendResendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.RESEND_API_KEY || !to) {
    return false;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Amplepro Academy <no-reply@amplepro.in>',
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend email failed: ${errorText}`);
  }

  return true;
};

const sendEmail = async (message) => {
  if (isSmtpConfigured()) {
    return sendSmtpEmail(message);
  }

  return sendResendEmail(message);
};

const sendPasswordResetEmail = async (email, resetUrl) => {
  const subject = 'Reset your Amplepro password';
  const text = `Reset your Amplepro password using this link: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#102f31">
      <h2>Reset your Amplepro password</h2>
      <p>Use the button below to set a new password.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#0b302f;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Reset My Password</a></p>
      <p>This link expires in 30 minutes. If you didn't request this, ignore this email.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html, text });
};

const sendPasswordChangedEmail = async (email) => {
  const subject = 'Your Amplepro password was changed';
  const text = "Your Amplepro password was changed. If this wasn't you, contact support immediately.";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#102f31">
      <h2>Password changed</h2>
      <p>Your Amplepro password was changed.</p>
      <p>If this wasn't you, contact support immediately.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html, text });
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

export const forgotPassword = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, password_hash, auth_provider FROM users WHERE LOWER(email) = $1',
      [email]
    );

    const user = userResult.rows[0];
    let resetToken = null;

    if (user?.password_hash) {
      resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(resetToken);

      await pool.query('UPDATE password_reset_tokens SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used = FALSE', [user.id]);
      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
        [user.id, tokenHash, PASSWORD_RESET_EXPIRY_MINUTES]
      );

      const resetUrl = buildResetUrl(resetToken);
      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (emailError) {
        console.warn('Password reset email failed:', emailError.message);
      }

      // This keeps local development testable without adding SMTP yet.
      // In production, wire this token into an email provider instead.
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Password Reset] ${email}: ${resetUrl}`);
      }
    }

    res.json(buildResetResponse(resetToken));
  } catch (error) {
    res.status(500).json({ message: 'Error preparing password reset', error: error.message });
  }
};

export const validateResetToken = async (req, res) => {
  const token = String(req.query?.token || '').trim();

  if (!token) {
    return res.status(400).json({ valid: false, message: 'Reset token is required' });
  }

  try {
    const tokenHash = hashResetToken(token);
    const resetResult = await pool.query(
      `SELECT id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND used = FALSE
         AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    res.json({ valid: resetResult.rowCount > 0 });
  } catch (error) {
    res.status(500).json({ valid: false, message: 'Error validating reset token', error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.new_password ?? req.body?.password ?? '');

  if (!token) {
    return res.status(400).json({ message: 'Reset token is required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const tokenHash = hashResetToken(token);
    const resetResult = await pool.query(
      `SELECT prt.id, prt.user_id, u.email
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1
         AND prt.used = FALSE
         AND prt.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    const resetRecord = resetResult.rows[0];
    if (!resetRecord) {
      return res.status(400).json({ message: 'Reset link is invalid or expired' });
    }

    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query('BEGIN');
    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           auth_provider = CASE WHEN auth_provider = 'google' THEN 'local' ELSE auth_provider END,
           password_changed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, resetRecord.user_id]
    );
    await pool.query('UPDATE password_reset_tokens SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE id = $1', [resetRecord.id]);
    await pool.query('COMMIT');

    sendPasswordChangedEmail(resetRecord.email).catch((emailError) => {
      console.warn('Password changed email failed:', emailError.message);
    });

    res.json({ message: 'Your password has been reset successfully. Please log in with your new password.' });
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => {});
    res.status(500).json({ message: 'Error resetting password', error: error.message });
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

    if (tokenIssuedBeforePasswordChange(decoded, user.password_changed_at)) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Session expired. Please sign in again.' });
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
