import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const createToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });

const buildUserResponse = (user) => ({
  id: user.id,
  firstName: user.first_name ?? user.firstname,
  lastName: user.last_name ?? user.lastname,
  email: user.email,
});

export const signup = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
      [firstName, lastName, email, hashedPassword]
    );

    const userId = result.rows[0].id;

    // Create token
    const token = createToken(userId);

    res.status(201).json({
      token,
      user: { id: userId, firstName, lastName, email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const users = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (users.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users.rows[0];

    // Check password
    const normalizedPassword = user.password_hash ?? user.password;
    if (!normalizedPassword) {
      return res.status(400).json({ message: 'This account uses Google sign-in. Continue with Google instead.' });
    }

    const passwordsMatch = await bcrypt.compare(password, normalizedPassword);
    if (!passwordsMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user.id);

    res.json({
      token,
      user: buildUserResponse(user)
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

    const token = createToken(user.id);

    res.json({
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during Google login', error: error.message });
  }
};
