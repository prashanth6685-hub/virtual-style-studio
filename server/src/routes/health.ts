import { Router } from 'express';
import { getProviderName } from '../ai';
import { dbEnabled } from '../db';

const router = Router();

/** GET /api/health — liveness + provider/db flags. */
router.get('/', (_req, res) => {
  res.json({
    ok: true,
    provider: getProviderName(),
    time: new Date().toISOString(),
    db: dbEnabled(),
    email: false,
  });
});

export default router;
