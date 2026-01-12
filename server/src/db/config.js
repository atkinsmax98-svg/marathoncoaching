import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'data', 'running_coach.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

// Initialize sql.js
const initDb = async () => {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  return db;
};

// Save database to file
const saveDb = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

// Auto-save every 5 seconds
setInterval(saveDb, 5000);

// Save on process exit
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

// Helper to match pg's query interface
export const query = (text, params = []) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Convert $1, $2 style params to ? style
  let sqliteText = text;
  let paramIndex = 1;
  while (sqliteText.includes(`$${paramIndex}`)) {
    sqliteText = sqliteText.replace(`$${paramIndex}`, '?');
    paramIndex++;
  }

  // Remove PostgreSQL-specific syntax
  sqliteText = sqliteText.replace(/RETURNING \*/gi, '');
  sqliteText = sqliteText.replace(/RETURNING id/gi, '');
  sqliteText = sqliteText.replace(/RETURNING [^;]+/gi, '');

  const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT');

  try {
    if (isSelect) {
      const stmt = db.prepare(sqliteText);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return { rows };
    } else {
      db.run(sqliteText, params);
      const changes = db.getRowsModified();
      saveDb(); // Save after modifications
      return { rows: changes > 0 ? [{ id: 1 }] : [], rowCount: changes };
    }
  } catch (error) {
    console.error('SQL Error:', error.message);
    console.error('Query:', sqliteText);
    throw error;
  }
};

export const getDb = () => db;
export { initDb, saveDb };
