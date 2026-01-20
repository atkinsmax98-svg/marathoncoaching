/**
 * Calculate weekly running stats from Garmin activities
 */

/**
 * Get the Monday of the week for a given date
 * @param {Date} date
 * @returns {Date}
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  return new Date(d.setDate(diff));
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Check if activity is a running activity
 * @param {object} activity
 * @returns {boolean}
 */
function isRunningActivity(activity) {
  const runningTypes = ['running', 'trail_running', 'treadmill_running', 'track_running'];
  const activityType = (activity.activityType?.typeKey || activity.activityType || '').toLowerCase();
  return runningTypes.some(type => activityType.includes(type) || activityType.includes('run'));
}

/**
 * Calculate weekly stats from a list of activities
 * @param {Array} activities - Array of Garmin activities
 * @param {number} numWeeks - Number of weeks to calculate (default 8)
 * @returns {Array} - Array of weekly stats objects
 */
export function calculateWeeklyStats(activities, numWeeks = 8) {
  // Filter to only running activities
  const runningActivities = activities.filter(isRunningActivity);

  // Group activities by week
  const weekMap = new Map();

  for (const activity of runningActivities) {
    const startTime = new Date(activity.startTimeLocal || activity.startTimeGMT);
    const weekStart = getWeekStart(startTime);
    const weekKey = formatDate(weekStart);

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        week_start: weekKey,
        total_distance_km: 0,
        total_runs: 0,
        total_time_minutes: 0,
        total_pace_weighted: 0 // For calculating weighted average pace
      });
    }

    const week = weekMap.get(weekKey);
    const distanceKm = (activity.distance || 0) / 1000;
    const durationMinutes = (activity.duration || activity.movingDuration || 0) / 60;

    week.total_distance_km += distanceKm;
    week.total_runs += 1;
    week.total_time_minutes += durationMinutes;

    // Weighted pace calculation (pace * distance for weighted average)
    if (distanceKm > 0) {
      const paceMinPerKm = durationMinutes / distanceKm;
      week.total_pace_weighted += paceMinPerKm * distanceKm;
    }
  }

  // Calculate average pace and format results
  const results = [];
  for (const [weekStart, week] of weekMap) {
    const avgPaceMinKm = week.total_distance_km > 0
      ? week.total_pace_weighted / week.total_distance_km
      : 0;

    results.push({
      week_start: weekStart,
      total_distance_km: Math.round(week.total_distance_km * 10) / 10,
      total_runs: week.total_runs,
      avg_pace_min_km: Math.round(avgPaceMinKm * 100) / 100,
      total_time_minutes: Math.round(week.total_time_minutes)
    });
  }

  // Sort by week_start descending and limit to numWeeks
  results.sort((a, b) => b.week_start.localeCompare(a.week_start));
  return results.slice(0, numWeeks);
}

/**
 * Get date range for fetching activities (last N weeks)
 * @param {number} numWeeks
 * @returns {{startDate: Date, endDate: Date}}
 */
export function getActivityDateRange(numWeeks = 8) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (numWeeks * 7));
  return { startDate, endDate };
}
