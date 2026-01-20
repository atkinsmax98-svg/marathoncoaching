import gc from 'garmin-connect';
const { GarminConnect } = gc;
import { query } from '../db/config.js';
import { encrypt, decrypt } from './encryptionService.js';
import { calculateWeeklyStats, getActivityDateRange } from '../utils/statsCalculator.js';

// Cache of authenticated Garmin clients
const clientCache = new Map();

/**
 * Authenticate with Garmin Connect and store credentials
 * @param {string} userId - The app user ID
 * @param {string} username - Garmin email/username
 * @param {string} password - Garmin password
 * @returns {Promise<{success: boolean, garminUserId?: string, error?: string}>}
 */
export async function connect(userId, username, password) {
  try {
    const client = new GarminConnect({
      username: username,
      password: password
    });

    // Authenticate with Garmin
    await client.login();

    // Get user profile to verify connection
    const userProfile = await client.getUserProfile();
    const garminUserId = userProfile?.displayName || username.split('@')[0];

    // Encrypt credentials for storage
    const encryptedUsername = encrypt(username);
    const encryptedPassword = encrypt(password);

    // Store OAuth tokens if available
    const oauth1Token = client.oauth1Token ? JSON.stringify(client.oauth1Token) : null;
    const oauth2Token = client.oauth2Token ? JSON.stringify(client.oauth2Token) : null;

    // Check if user already has a connection
    const existing = query(
      'SELECT id FROM garmin_connections WHERE user_id = ?',
      [userId]
    );

    if (existing.rows.length > 0) {
      // Update existing connection
      query(
        `UPDATE garmin_connections
         SET encrypted_username = ?, encrypted_password = ?,
             oauth1_token = ?, oauth2_token = ?,
             garmin_user_id = ?, connected_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [encryptedUsername, encryptedPassword, oauth1Token, oauth2Token, garminUserId, userId]
      );
    } else {
      // Create new connection
      const id = crypto.randomUUID();
      query(
        `INSERT INTO garmin_connections
         (id, user_id, encrypted_username, encrypted_password, oauth1_token, oauth2_token, garmin_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, encryptedUsername, encryptedPassword, oauth1Token, oauth2Token, garminUserId]
      );
    }

    // Cache the authenticated client
    clientCache.set(userId, {
      client,
      lastAuth: Date.now()
    });

    return { success: true, garminUserId };
  } catch (error) {
    console.error('Garmin connect error:', error);

    // Parse common error messages
    let errorMessage = 'Failed to connect to Garmin';
    if (error.message?.includes('credentials') || error.message?.includes('401')) {
      errorMessage = 'Invalid Garmin username or password';
    } else if (error.message?.includes('MFA') || error.message?.includes('verification')) {
      errorMessage = 'MFA-enabled accounts are not supported';
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Get or restore an authenticated Garmin client for a user
 * @param {string} userId - The app user ID
 * @returns {Promise<GarminConnect|null>}
 */
export async function getClient(userId) {
  // Check cache first
  const cached = clientCache.get(userId);
  if (cached && (Date.now() - cached.lastAuth) < 30 * 60 * 1000) { // 30 min cache
    return cached.client;
  }

  // Get stored credentials
  const result = query(
    'SELECT encrypted_username, encrypted_password, oauth1_token, oauth2_token FROM garmin_connections WHERE user_id = ?',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const { encrypted_username, encrypted_password, oauth1_token, oauth2_token } = result.rows[0];

  // Decrypt credentials
  const username = decrypt(encrypted_username);
  const password = decrypt(encrypted_password);

  const client = new GarminConnect({
    username: username,
    password: password
  });

  // Try to restore session from tokens first
  if (oauth1_token && oauth2_token) {
    try {
      client.oauth1Token = JSON.parse(oauth1_token);
      client.oauth2Token = JSON.parse(oauth2_token);

      // Test if tokens are still valid
      await client.getUserProfile();

      clientCache.set(userId, {
        client,
        lastAuth: Date.now()
      });

      return client;
    } catch (e) {
      // Tokens expired, need to re-auth
      console.log('Garmin tokens expired, re-authenticating...');
    }
  }

  // Re-authenticate with stored credentials
  try {
    await client.login();

    // Update stored tokens
    const newOauth1Token = client.oauth1Token ? JSON.stringify(client.oauth1Token) : null;
    const newOauth2Token = client.oauth2Token ? JSON.stringify(client.oauth2Token) : null;

    query(
      'UPDATE garmin_connections SET oauth1_token = ?, oauth2_token = ? WHERE user_id = ?',
      [newOauth1Token, newOauth2Token, userId]
    );

    clientCache.set(userId, {
      client,
      lastAuth: Date.now()
    });

    return client;
  } catch (error) {
    console.error('Failed to re-authenticate with Garmin:', error);
    return null;
  }
}

/**
 * Fetch activities from Garmin for a user
 * @param {string} userId - The app user ID
 * @param {Date} startDate - Start date for activity range
 * @param {Date} endDate - End date for activity range
 * @returns {Promise<{activities: Array, error?: string}>}
 */
export async function fetchActivities(userId, startDate, endDate) {
  const client = await getClient(userId);

  if (!client) {
    return { activities: [], error: 'Not connected to Garmin' };
  }

  try {
    // Fetch activities for the date range
    const activities = await client.getActivities(0, 100); // Get last 100 activities

    // Filter to date range
    const filteredActivities = activities.filter(activity => {
      const activityDate = new Date(activity.startTimeLocal || activity.startTimeGMT);
      return activityDate >= startDate && activityDate <= endDate;
    });

    // Update last sync time
    query(
      'UPDATE garmin_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );

    return { activities: filteredActivities };
  } catch (error) {
    console.error('Failed to fetch Garmin activities:', error);
    return { activities: [], error: 'Failed to fetch activities from Garmin' };
  }
}

/**
 * Fetch activities and calculate weekly stats
 * @param {string} userId - The app user ID
 * @param {number} numWeeks - Number of weeks to fetch
 * @returns {Promise<{stats: Array, activities: Array, error?: string}>}
 */
export async function fetchAndCalculateStats(userId, numWeeks = 8) {
  const { startDate, endDate } = getActivityDateRange(numWeeks);
  const { activities, error } = await fetchActivities(userId, startDate, endDate);

  if (error) {
    return { stats: [], activities: [], error };
  }

  const stats = calculateWeeklyStats(activities, numWeeks);
  return { stats, activities };
}

/**
 * Disconnect Garmin and clear stored credentials
 * @param {string} userId - The app user ID
 */
export function disconnect(userId) {
  // Remove from cache
  clientCache.delete(userId);

  // Delete from database
  query('DELETE FROM garmin_connections WHERE user_id = ?', [userId]);

  // Also clear cached activities
  query('DELETE FROM garmin_activities WHERE user_id = ?', [userId]);
}

/**
 * Check if a user is connected to Garmin
 * @param {string} userId - The app user ID
 * @returns {{connected: boolean, garminUserId?: string, connectedAt?: string, lastSyncAt?: string}}
 */
export function getConnectionStatus(userId) {
  const result = query(
    'SELECT garmin_user_id, connected_at, last_sync_at FROM garmin_connections WHERE user_id = ?',
    [userId]
  );

  if (result.rows.length === 0) {
    return { connected: false };
  }

  return {
    connected: true,
    garminUserId: result.rows[0].garmin_user_id,
    connectedAt: result.rows[0].connected_at,
    lastSyncAt: result.rows[0].last_sync_at
  };
}
