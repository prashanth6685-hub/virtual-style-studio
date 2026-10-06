import { Router } from 'express';
import { requireDb, toJson } from '../db';
import { assertOwner, requireAuth } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errors';
import { avatarBodySchema, validate } from '../schemas';

const router = Router();

/** GET /api/avatars — list the caller's avatars. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const avatars = await db.avatar.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ avatars });
  }),
);

/** POST /api/avatars — create an avatar (AvatarConfig validated). */
router.post(
  '/',
  requireAuth,
  validate(avatarBodySchema),
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const { name, personType, config } = req.body as {
      name: string;
      personType: string;
      config: object;
    };
    const avatar = await db.avatar.create({
      data: { userId: req.user!.id, name, personType, config: toJson(config) },
    });
    res.status(201).json({ avatar });
  }),
);

/** PUT /api/avatars/:id — owner only. */
router.put(
  '/:id',
  requireAuth,
  validate(avatarBodySchema),
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const existing = await db.avatar.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('NOT_FOUND', 'Avatar not found', 404);
    assertOwner(req.user!, existing.userId);
    const { name, personType, config } = req.body as {
      name: string;
      personType: string;
      config: object;
    };
    const avatar = await db.avatar.update({
      where: { id: existing.id },
      data: { name, personType, config: toJson(config) },
    });
    res.json({ avatar });
  }),
);

/** DELETE /api/avatars/:id — owner only. */
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const existing = await db.avatar.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('NOT_FOUND', 'Avatar not found', 404);
    assertOwner(req.user!, existing.userId);
    await db.avatar.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  }),
);

export default router;
