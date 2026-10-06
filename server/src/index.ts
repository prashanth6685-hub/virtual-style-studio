/**
 * Virtual Style Studio API server.
 *
 * Express + TypeScript + Prisma. All routes live under /api, use zod
 * validation, and return the consistent {error:{code,message}} envelope.
 */
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import pinoHttp from 'pino-http';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

import { authenticate } from './middleware/auth';
import { errorHandler, notFound } from './middleware/errors';
import { uploadDir } from './storage';
import aiRouter from './routes/ai';
import authRouter from './routes/auth';
import avatarsRouter from './routes/avatars';
import catalogRouter from './routes/catalog';
import colorsRouter from './routes/colors';
import healthRouter from './routes/health';
import looksRouter from './routes/looks';
import outfitsRouter from './routes/outfits';
import tryonRouter from './routes/tryon';
import uploadsRouter from './routes/uploads';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
});

function apiLimiter(opts: { windowMs: number; max: number }): RateLimitRequestHandler {
  return rateLimit({
    ...opts,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many requests — please slow down and try again' },
      });
    },
  });
}

export function createApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);

  app.use(pinoHttp({ logger }));
  app.use(
    cors({
      origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(authenticate);

  const authLimiter = apiLimiter({ windowMs: 15 * 60 * 1000, max: 60 });
  const aiLimiter = apiLimiter({ windowMs: 60 * 1000, max: 30 });

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/colors', colorsRouter);
  app.use('/api/outfits', outfitsRouter);
  app.use('/api/avatars', avatarsRouter);
  app.use('/api/looks', looksRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/ai', aiLimiter, aiRouter);
  app.use('/api/tryon', aiLimiter, tryonRouter);

  // Uploaded photos, served at /uploads/:name (random unguessable names).
  app.use('/uploads', express.static(uploadDir()));
  app.use('/uploads', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } });
  });

  // Serve the built client (Docker image) when present.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        next();
        return;
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}

export const app = createApp();

// Only listen when run directly (tsx src/index.ts / node dist/index.js),
// not when imported by tests.
if (require.main === module) {
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, () => {
    logger.info({ port }, 'Virtual Style Studio API listening');
  });
}
