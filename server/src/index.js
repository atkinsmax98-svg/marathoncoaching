import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT } from './config.js';
import { initDb } from './db/config.js';
import authRoutes from './routes/auth.js';
import runsRoutes from './routes/runs.js';
import athletesRoutes from './routes/athletes.js';
import garminRoutes from './routes/garmin.js';
import invitesRoutes from './routes/invites.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// CORS - allow localhost in dev, same origin in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.APP_URL].filter(Boolean)
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/runs', runsRoutes);
app.use('/api/athletes', athletesRoutes);
app.use('/api/garmin', garminRoutes);
app.use('/api/invites', invitesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientBuildPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Initialize database and start server
const start = async () => {
  try {
    await initDb();
    console.log('Database connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
