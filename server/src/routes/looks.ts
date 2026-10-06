import { Router } from 'express';
import { requireDb, toJson } from '../db';
import { assertOwner, requireAuth } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errors';
import { lookBodySchema, validate } from '../schemas';

const router = Router();

/** GET /api/looks — list the caller's saved looks. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const looks = await db.savedLook.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ looks });
  }),
);

/** POST /api/looks — save a look. */
router.post(
  '/',
  requireAuth,
  validate(lookBodySchema),
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const { name, outfit, resultImageUrl, modelRef } = req.body as {
      name: string;
      outfit: object;
      resultImageUrl?: string;
      modelRef?: object;
    };
    const look = await db.savedLook.create({
      data: {
        userId: req.user!.id,
        name,
        outfit: toJson(outfit),
        resultImageUrl,
        modelRef: modelRef === undefined ? undefined : toJson(modelRef),
      },
    });
    res.status(201).json({ look });
  }),
);

/** PUT /api/looks/:id — owner only. */
router.put(
  '/:id',
  requireAuth,
  validate(lookBodySchema),
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const existing = await db.savedLook.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('NOT_FOUND', 'Look not found', 404);
    assertOwner(req.user!, existing.userId);
    const { name, outfit, resultImageUrl, modelRef } = req.body as {
      name: string;
      outfit: object;
      resultImageUrl?: string;
      modelRef?: object;
    };
    const look = await db.savedLook.update({
      where: { id: existing.id },
      data: {
        name,
        outfit: toJson(outfit),
        resultImageUrl,
        modelRef: modelRef === undefined ? undefined : toJson(modelRef),
      },
    });
    res.json({ look });
  }),
);

/** DELETE /api/looks/:id — owner only. */
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const existing = await db.savedLook.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('NOT_FOUND', 'Look not found', 404);
    assertOwner(req.user!, existing.userId);
    await db.savedLook.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  }),
);

export default router;
