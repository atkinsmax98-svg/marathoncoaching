import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/config.js';
import { authenticate, requireCoach } from '../middleware/auth.js';

const router = Router();

// Create invite (coach only)
router.post('/', authenticate, requireCoach, async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user already exists
    const existingUser = query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check for existing unused invite
    const existingInvite = query(
      'SELECT id FROM invites WHERE email = ? AND coach_id = ? AND used = 0 AND expires_at > datetime("now")',
      [email, req.user.id]
    );

    if (existingInvite.rows.length > 0) {
      return res.status(400).json({ error: 'Invite already sent to this email' });
    }

    const id = uuidv4();
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    query(
      `INSERT INTO invites (id, coach_id, email, token, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.user.id, email, token, expiresAt]
    );

    const inviteUrl = `http://localhost:5173/register?invite=${token}`;

    res.status(201).json({
      id,
      email,
      token,
      expires_at: expiresAt,
      invite_url: inviteUrl
    });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// Get all invites (coach only)
router.get('/', authenticate, requireCoach, async (req, res) => {
  try {
    const result = query(
      `SELECT id, email, token, used, created_at, expires_at
       FROM invites
       WHERE coach_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get invites' });
  }
});

// Verify invite token (public)
router.get('/verify/:token', async (req, res) => {
  try {
    const result = query(
      `SELECT i.*, u.name as coach_name
       FROM invites i
       JOIN users u ON i.coach_id = u.id
       WHERE i.token = ? AND i.used = 0 AND i.expires_at > datetime("now")`,
      [req.params.token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invite' });
    }

    const invite = result.rows[0];
    res.json({
      email: invite.email,
      coach_name: invite.coach_name,
      expires_at: invite.expires_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify invite' });
  }
});

// Delete invite (coach only)
router.delete('/:id', authenticate, requireCoach, async (req, res) => {
  try {
    const existing = query(
      'SELECT id FROM invites WHERE id = ? AND coach_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    query('DELETE FROM invites WHERE id = ?', [req.params.id]);
    res.json({ message: 'Invite deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete invite' });
  }
});

export default router;
