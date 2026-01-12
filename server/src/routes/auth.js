import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/config.js';
import { authenticate } from '../middleware/auth.js';
import { JWT_SECRET } from '../config.js';

const router = Router();

// Register coach
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    query(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
      [id, email, passwordHash, name, 'coach']
    );

    const user = { id, email, name, role: 'coach' };
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Register athlete with invite token
router.post('/register/athlete', async (req, res) => {
  try {
    const { email, password, name, inviteToken } = req.body;

    // Verify invite token
    const invite = query(
      'SELECT * FROM invites WHERE token = ? AND used = 0 AND expires_at > datetime("now")',
      [inviteToken]
    );

    if (invite.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }

    const inviteData = invite.rows[0];
    if (inviteData.email !== email) {
      return res.status(400).json({ error: 'Email does not match invite' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    query(
      'INSERT INTO users (id, email, password_hash, name, role, coach_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, email, passwordHash, name, 'athlete', inviteData.coach_id]
    );

    // Mark invite as used
    query('UPDATE invites SET used = 1 WHERE id = ?', [inviteData.id]);

    const user = { id, email, name, role: 'athlete', coach_id: inviteData.coach_id };
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Athlete register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = query('SELECT * FROM users WHERE email = ?', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, coach_id: user.coach_id },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = query('SELECT id, email, name, role, coach_id FROM users WHERE id = ?', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
