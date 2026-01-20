import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/config.js';
import { authenticate } from '../middleware/auth.js';
import * as garminService from '../services/garminService.js';

const router = Router();

// Get Garmin connection status
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = garminService.getConnectionStatus(req.user.id);

    if (!status.connected) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      garmin_user_id: status.garminUserId,
      connected_at: status.connectedAt,
      last_sync_at: status.lastSyncAt
    });
  } catch (error) {
    console.error('Garmin status error:', error);
    res.status(500).json({ error: 'Failed to get Garmin status' });
  }
});

// Connect Garmin with username/password
router.post('/connect', authenticate, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if already connected
    const status = garminService.getConnectionStatus(req.user.id);
    if (status.connected) {
      // Disconnect first then reconnect with new credentials
      garminService.disconnect(req.user.id);
    }

    // Attempt to connect
    const result = await garminService.connect(req.user.id, username, password);

    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    // Fetch initial stats
    const { stats } = await garminService.fetchAndCalculateStats(req.user.id, 8);

    // Store weekly stats
    for (const stat of stats) {
      const statId = uuidv4();
      query(
        `INSERT OR REPLACE INTO weekly_stats (id, athlete_id, week_start, total_distance_km, total_runs, avg_pace_min_km, total_time_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [statId, req.user.id, stat.week_start, stat.total_distance_km, stat.total_runs, stat.avg_pace_min_km, stat.total_time_minutes]
      );
    }

    res.json({
      connected: true,
      garmin_user_id: result.garminUserId,
      message: 'Garmin connected successfully',
      stats_count: stats.length
    });
  } catch (error) {
    console.error('Garmin connect error:', error);
    res.status(500).json({ error: 'Failed to connect Garmin' });
  }
});

// Disconnect Garmin
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    garminService.disconnect(req.user.id);
    res.json({ message: 'Garmin disconnected' });
  } catch (error) {
    console.error('Garmin disconnect error:', error);
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
    console.error('Weekly stats error:', error);
    res.status(500).json({ error: 'Failed to get weekly stats' });
  }
});

// Get activities list
router.get('/activities', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const { activities, error } = await garminService.fetchActivities(req.user.id, start, end);

    if (error) {
      return res.status(400).json({ error });
    }

    res.json({
      activities: activities.slice(0, parseInt(limit)),
      count: activities.length
    });
  } catch (error) {
    console.error('Activities fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Sync runs to Garmin (placeholder - limited support in garmin-connect)
router.post('/sync', authenticate, async (req, res) => {
  try {
    const { run_ids } = req.body;

    // Check if Garmin is connected
    const status = garminService.getConnectionStatus(req.user.id);
    if (!status.connected) {
      return res.status(400).json({ error: 'Garmin not connected' });
    }

    // Note: Pushing workouts to Garmin has limited support in the unofficial library
    res.json({
      synced: run_ids?.length || 0,
      message: 'Workout sync has limited support with unofficial Garmin API'
    });
  } catch (error) {
    console.error('Garmin sync error:', error);
    res.status(500).json({ error: 'Failed to sync to Garmin' });
  }
});

// Refresh stats from Garmin
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const status = garminService.getConnectionStatus(req.user.id);
    if (!status.connected) {
      return res.status(400).json({ error: 'Garmin not connected' });
    }

    // Fetch fresh activities and calculate stats
    const { stats, error } = await garminService.fetchAndCalculateStats(req.user.id, 8);

    if (error) {
      return res.status(400).json({ error });
    }

    // Delete old stats and insert new ones
    query('DELETE FROM weekly_stats WHERE athlete_id = ?', [req.user.id]);

    for (const stat of stats) {
      const statId = uuidv4();
      query(
        `INSERT INTO weekly_stats (id, athlete_id, week_start, total_distance_km, total_runs, avg_pace_min_km, total_time_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [statId, req.user.id, stat.week_start, stat.total_distance_km, stat.total_runs, stat.avg_pace_min_km, stat.total_time_minutes]
      );
    }

    res.json({
      message: 'Stats refreshed from Garmin',
      stats_count: stats.length
    });
  } catch (error) {
    console.error('Garmin refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh stats' });
  }
});

export default router;
