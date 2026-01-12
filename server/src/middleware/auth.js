import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireCoach = (req, res, next) => {
  if (req.user.role !== 'coach') {
    return res.status(403).json({ error: 'Coach access required' });
  }
  next();
};

export const requireAthleteOrCoach = (req, res, next) => {
  const athleteId = req.params.athleteId || req.body.athlete_id;

  // Coaches can access any athlete's data
  if (req.user.role === 'coach') {
    return next();
  }

  // Athletes can only access their own data
  if (req.user.id === athleteId) {
    return next();
  }

  return res.status(403).json({ error: 'Access denied' });
};
