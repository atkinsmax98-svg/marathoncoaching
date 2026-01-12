import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/config.js';
import { authenticate } from '../middleware/auth.js';
import { generateMockWeeklyStats } from '../services/garminMock.js';

const router = Router();

// Get Garmin connection status
router.get('/status', authenticate, async (req, res) => {
  try {
    const result = query(
      'SELECT id, garmin_user_id, connected_at FROM garmin_connections WHERE user_id = ?',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      garmin_user_id: result.rows[0].garmin_user_id,
      connected_at: result.rows[0].connected_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Garmin status' });
  }
});

// Connect Garmin (mock - simulates OAuth flow)
router.post('/connect', authenticate, async (req, res) => {
  try {
    // Check if already connected
    const existing = query(
      'SELECT id FROM garmin_connections WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Garmin already connected' });
    }

    // Mock: Create fake connection
    const id = uuidv4();
    const mockGarminUserId = `garmin_${Date.now()}`;
    const tokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    query(
      `INSERT INTO garmin_connections (id, user_id, access_token, refresh_token, garmin_user_id, token_expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, 'mock_access_token', 'mock_refresh_token', mockGarminUserId, tokenExpires]
    );

    // Generate initial mock weekly stats
    const mockStats = generateMockWeeklyStats(4);
    for (const stat of mockStats) {
      const statId = uuidv4();
      // Use INSERT OR REPLACE for SQLite upsert
      query(
        `INSERT OR REPLACE INTO weekly_stats (id, athlete_id, week_start, total_distance_km, total_runs, avg_pace_min_km, total_time_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [statId, req.user.id, stat.week_start, stat.total_distance_km, stat.total_runs, stat.avg_pace_min_km, stat.total_time_minutes]
      );
    }

    res.json({
      connected: true,
      garmin_user_id: mockGarminUserId,
      message: 'Garmin connected successfully (mock)'
    });
  } catch (error) {
    console.error('Garmin connect error:', error);
    res.status(500).json({ error: 'Failed to connect Garmin' });
  }
});

// Disconnect Garmin
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    query('DELETE FROM garmin_connections WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Garmin disconnected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect Garmin' });
  }
});

// Get weekly stats
router.get('/stats/weekly', authenticate, async (req, res) => {
  try {
    const athleteId = req.query.athlete_id || req.user.id;

    // Check access
    if (req.user.role === 'athlete' && req.user.id !== athleteId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = query(
      `SELECT * FROM weekly_stats
       WHERE athlete_id = ?
       ORDER BY week_start DESC
       LIMIT 8`,
      [athleteId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get weekly stats' });
  }
});

// Sync runs to Garmin (mock)
router.post('/sync', authenticate, async (req, res) => {
  try {
    const { run_ids } = req.body;

    // Check if Garmin is connected
    const connection = query(
      'SELECT id FROM garmin_connections WHERE user_id = ?',
      [req.user.id]
    );

    if (connection.rows.length === 0) {
      return res.status(400).json({ error: 'Garmin not connected' });
    }

    // Mock: Just return success
    res.json({
      synced: run_ids?.length || 0,
      message: 'Runs synced to Garmin calendar (mock)'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync to Garmin' });
  }
});

// Refresh stats from Garmin (mock - generates new random data)
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const connection = query(
      'SELECT id FROM garmin_connections WHERE user_id = ?',
      [req.user.id]
    );

    if (connection.rows.length === 0) {
      return res.status(400).json({ error: 'Garmin not connected' });
    }

    // Delete old stats
    query('DELETE FROM weekly_stats WHERE athlete_id = ?', [req.user.id]);

    // Generate fresh mock stats
    const mockStats = generateMockWeeklyStats(4);
    for (const stat of mockStats) {
      const statId = uuidv4();
      query(
        `INSERT INTO weekly_stats (id, athlete_id, week_start, total_distance_km, total_runs, avg_pace_min_km, total_time_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [statId, req.user.id, stat.week_start, stat.total_distance_km, stat.total_runs, stat.avg_pace_min_km, stat.total_time_minutes]
      );
    }

    res.json({ message: 'Stats refreshed from Garmin (mock)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh stats' });
  }
});

export default router;
