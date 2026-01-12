// Mock Garmin service - generates realistic running data

export function generateMockWeeklyStats(weeks = 4) {
  const stats = [];
  const now = new Date();

  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (weekStart.getDay() || 7) - (i * 7)); // Monday of each week

    // Generate realistic marathon training data
    const totalRuns = Math.floor(Math.random() * 3) + 4; // 4-6 runs per week
    const totalDistanceKm = Math.round((30 + Math.random() * 40) * 10) / 10; // 30-70km per week
    const avgPaceMinKm = Math.round((4.5 + Math.random() * 1.5) * 100) / 100; // 4:30-6:00 min/km
    const totalTimeMinutes = Math.round(totalDistanceKm * avgPaceMinKm);

    stats.push({
      week_start: weekStart.toISOString().split('T')[0],
      total_distance_km: totalDistanceKm,
      total_runs: totalRuns,
      avg_pace_min_km: avgPaceMinKm,
      total_time_minutes: totalTimeMinutes
    });
  }

  return stats;
}

export function generateMockActivities(count = 10) {
  const activities = [];
  const runTypes = ['Easy Run', 'Tempo Run', 'Long Run', 'Interval Training', 'Recovery Run'];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const distanceKm = Math.round((5 + Math.random() * 20) * 10) / 10;
    const paceMinKm = Math.round((4.5 + Math.random() * 2) * 100) / 100;
    const durationMinutes = Math.round(distanceKm * paceMinKm);

    activities.push({
      id: `activity_${Date.now()}_${i}`,
      date: date.toISOString(),
      name: runTypes[Math.floor(Math.random() * runTypes.length)],
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      avg_pace_min_km: paceMinKm,
      avg_heart_rate: Math.floor(130 + Math.random() * 40),
      calories: Math.floor(distanceKm * 60 + Math.random() * 100)
    });
  }

  return activities;
}

export function formatPace(minPerKm) {
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
