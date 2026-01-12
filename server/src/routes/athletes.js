import { Router } from 'express';
import { query } from '../db/config.js';
import { authenticate, requireCoach } from '../middleware/auth.js';

const router = Router();

// Get all athletes for a coach
router.get('/', authenticate, requireCoach, async (req, res) => {
  try {
    const result = query(
      `SELECT u.id, u.email, u.name, u.created_at,
              CASE WHEN gc.id IS NOT NULL THEN 1 ELSE 0 END as garmin_connected,
              (SELECT COUNT(*) FROM runs WHERE athlete_id = u.id AND completed = 1) as completed_runs,
              (SELECT COUNT(*) FROM runs WHERE athlete_id = u.id) as total_runs
       FROM users u
       LEFT JOIN garmin_connections gc ON u.id = gc.user_id
       WHERE u.coach_id = ?
       ORDER BY u.name ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get athletes error:', error);
    res.status(500).json({ error: 'Failed to get athletes' });
  }
});

// Get single athlete with stats
router.get('/:id', authenticate, async (req, res) => {
  try {
    const athleteId = req.params.id;

    // Check access
    if (req.user.role === 'athlete' && req.user.id !== athleteId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = query(
      `SELECT u.id, u.email, u.name, u.created_at, u.coach_id,
              CASE WHEN gc.id IS NOT NULL THEN 1 ELSE 0 END as garmin_connected
       FROM users u
       LEFT JOIN garmin_connections gc ON u.id = gc.user_id
       WHERE u.id = ?`,
      [athleteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    const athlete = result.rows[0];

    // Get recent weekly stats
    const statsResult = query(
      `SELECT * FROM weekly_stats
       WHERE athlete_id = ?
       ORDER BY week_start DESC
       LIMIT 4`,
      [athleteId]
    );

    // Get upcoming runs
    const runsResult = query(
      `SELECT * FROM runs
       WHERE athlete_id = ? AND date >= date('now')
       ORDER BY date ASC
       LIMIT 7`,
      [athleteId]
    );

    res.json({
      ...athlete,
      weekly_stats: statsResult.rows,
      upcoming_runs: runsResult.rows
    });
  } catch (error) {
    console.error('Get athlete error:', error);
    res.status(500).json({ error: 'Failed to get athlete' });
  }
});

// Remove athlete (coach only)
router.delete('/:id', authenticate, requireCoach, async (req, res) => {
  try {
    const existing = query(
      'SELECT id FROM users WHERE id = ? AND coach_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Athlete not found' });
    }

    query('UPDATE users SET coach_id = NULL WHERE id = ?', [req.params.id]);
    res.json({ message: 'Athlete removed from team' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove athlete' });
  }
});

export default router;
