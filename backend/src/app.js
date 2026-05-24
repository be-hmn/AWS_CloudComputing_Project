import express from 'express';

import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import mentorRoutes from './routes/mentor.routes.js';
import applicationRoutes from './routes/application.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import recordRoutes from './routes/record.routes.js';
import adminRoutes from './routes/admin.routes.js';
import fileRoutes from './routes/file.routes.js';
import { mentorController } from './controllers/mentor.controller.js';
import { errorHandler } from './middlewares/errorHandler.js';

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowed = env.CORS_ORIGIN.split(',').map((s) => s.trim());
  if (allowed.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
}

export function createApp() {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));

  // 헬스체크 (양쪽 경로 모두 허용)
  const healthHandler = (_req, res) => res.json({ status: 'ok' });
  app.get('/healthz', healthHandler);
  app.get('/api/healthz', healthHandler);

  // 공개 멘토 목록 (인증 불필요, /api/mentors/me 보다 먼저 등록)
  app.get('/api/mentors', mentorController.listPublic);

  app.use('/api/auth', authRoutes);
  app.use('/api/mentors', mentorRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/files', fileRoutes);
  // /api/me/records, /api/applications/:id/record
  app.use('/api', recordRoutes);

  app.use((req, res, next) => {
    if (res.headersSent) return next();
    res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' });
  });

  app.use(errorHandler);
  return app;
}
