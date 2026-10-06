import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import { suggestSchema, validate } from '../schemas';
import { suggestOutfit } from '../suggest';
import type { SuggestRequest } from '@vss/shared';

const router = Router();

/**
 * POST /api/outfits/suggest — rule-based outfit from the shared catalog.
 * Body: {personType, occasion?, weather?, style?, colorPref?, budget?}.
 * boy/girl suggestions are always restricted to kidSafe items.
 */
router.post(
  '/suggest',
  requireAuth,
  validate(suggestSchema),
  asyncHandler(async (req, res) => {
    const result = suggestOutfit(req.body as SuggestRequest);
    res.json(result);
  }),
);

export default router;
