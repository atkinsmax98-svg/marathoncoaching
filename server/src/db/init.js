import { initDb, getDb, saveDb } from './config.js';

const runInit = async () => {
  try {
    await initDb();
    const db = getDb();

    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'athlete',
        coach_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Invites table
    db.run(`
      CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY,
        coach_id TEXT,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )
    `);

    // Runs table
    db.run(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        athlete_id TEXT,
        date DATE NOT NULL,
        title TEXT NOT NULL,
        run_type TEXT NOT NULL DEFAULT 'easy',
        distance_km REAL,
        notes TEXT,
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Garmin connections table
    db.run(`
      CREATE TABLE IF NOT EXISTS garmin_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at DATETIME,
        garmin_user_id TEXT,
        connected_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Weekly stats table
    db.run(`
      CREATE TABLE IF NOT EXISTS weekly_stats (
        id TEXT PRIMARY KEY,
        athlete_id TEXT,
        week_start DATE NOT NULL,
        total_distance_km REAL,
        total_runs INTEGER,
        avg_pace_min_km REAL,
        total_time_minutes INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_runs_athlete_date ON runs(athlete_id, date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_weekly_stats_athlete ON weekly_stats(athlete_id, week_start)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_coach ON users(coach_id)`);

    saveDb();
    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

runInit();
