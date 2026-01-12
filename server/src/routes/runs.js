import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/config.js';
import { authenticate, requireCoach } from '../middleware/auth.js';

const router = Router();

// Get all runs (coach sees all, athlete sees own)
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, athlete_id } = req.query;

    let sql = `
      SELECT r.*, u.name as athlete_name
      FROM runs r
      JOIN users u ON r.athlete_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by athlete based on role
    if (req.user.role === 'athlete') {
      sql += ` AND r.athlete_id = ?`;
      params.push(req.user.id);
    } else if (athlete_id) {
      sql += ` AND r.athlete_id = ?`;
      params.push(athlete_id);
    } else {
      // Coach viewing all - only show their athletes
      sql += ` AND (u.coach_id = ? OR u.id = ?)`;
      params.push(req.user.id, req.user.id);
    }

    if (start_date) {
      sql += ` AND r.date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      sql += ` AND r.date <= ?`;
      params.push(end_date);
    }

    sql += ' ORDER BY r.date ASC';

    const result = query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get runs error:', error);
    res.status(500).json({ error: 'Failed to get runs' });
  }
});

// Get single run
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = query(
      `SELECT r.*, u.name as athlete_name
       FROM runs r
       JOIN users u ON r.athlete_id = u.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const run = result.rows[0];

    // Check access
    if (req.user.role === 'athlete' && run.athlete_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(run);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get run' });
  }
});

// Create run (coach only)
router.post('/', authenticate, requireCoach, async (req, res) => {
  try {
    const { athlete_id, date, title, run_type, distance_km, notes } = req.body;

    const id = uuidv4();
    query(
      `INSERT INTO runs (id, athlete_id, date, title, run_type, distance_km, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, athlete_id, date, title, run_type || 'easy', distance_km, notes]
    );

    // Get athlete name
    const athleteResult = query('SELECT name FROM users WHERE id = ?', [athlete_id]);
    const run = {
      id,
      athlete_id,
      date,
      title,
      run_type: run_type || 'easy',
      distance_km,
      notes,
      completed: 0,
      athlete_name: athleteResult.rows[0]?.name
    };

    res.status(201).json(run);
  } catch (error) {
    console.error('Create run error:', error);
    res.status(500).json({ error: 'Failed to create run' });
  }
});

// Update run
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { date, title, run_type, distance_km, notes, completed } = req.body;

    // Check if run exists and user has access
    const existing = query('SELECT * FROM runs WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const run = existing.rows[0];

    // Athletes can only update completion status of their own runs
    if (req.user.role === 'athlete') {
      if (run.athlete_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Athletes can only toggle completion
      query(
        'UPDATE runs SET completed = ? WHERE id = ?',
        [completed ? 1 : 0, req.params.id]
      );
      const updated = query('SELECT * FROM runs WHERE id = ?', [req.params.id]);
      return res.json(updated.rows[0]);
    }

    // Coach can update everything
    query(
      `UPDATE runs
       SET date = COALESCE(?, date),
           title = COALESCE(?, title),
           run_type = COALESCE(?, run_type),
           distance_km = COALESCE(?, distance_km),
           notes = COALESCE(?, notes),
           completed = COALESCE(?, completed)
       WHERE id = ?`,
      [date, title, run_type, distance_km, notes, completed !== undefined ? (completed ? 1 : 0) : null, req.params.id]
    );

    const updated = query('SELECT * FROM runs WHERE id = ?', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Update run error:', error);
    res.status(500).json({ error: 'Failed to update run' });
  }
});

// Delete run (coach only)
router.delete('/:id', authenticate, requireCoach, async (req, res) => {
  try {
    const existing = query('SELECT id FROM runs WHERE id = ?', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }

    query('DELETE FROM runs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Run deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete run' });
  }
});

export default router;
