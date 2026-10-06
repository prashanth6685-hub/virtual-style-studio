import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireDb } from '../db';
import {
  authenticate,
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  signToken,
} from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errors';
import { loginSchema, signupSchema, validate } from '../schemas';
import type { PublicUser } from '@vss/shared';

const router = Router();

function toPublicUser(row: { id: string; email: string | null; isGuest: boolean; createdAt: Date }): PublicUser {
  return {
    id: row.id,
    email: row.email,
    isGuest: row.isGuest,
    createdAt: row.createdAt.toISOString(),
  };
}

/** POST /api/auth/signup — email + password signup. */
router.post(
  '/signup',
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const { email, password } = req.body as { email: string; password: string };
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new AppError('EMAIL_TAKEN', 'An account with this email already exists', 409);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { email: email.toLowerCase(), passwordHash, authProvider: 'email', isGuest: false },
    });
    setAuthCookie(res, signToken({ id: user.id, isGuest: false, email: user.email }));
    res.status(201).json({ user: toPublicUser(user) });
  }),
);

/** POST /api/auth/login — email + password login. */
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const { email, password } = req.body as { email: string; password: string };
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401);
    }
    setAuthCookie(res, signToken({ id: user.id, isGuest: user.isGuest, email: user.email }));
    res.json({ user: toPublicUser(user) });
  }),
);

/** POST /api/auth/guest — guest JWT; data is scoped to the guest id. */
router.post(
  '/guest',
  asyncHandler(async (_req, res) => {
    const db = requireDb();
    const user = await db.user.create({
      data: { email: null, passwordHash: null, authProvider: 'guest', isGuest: true },
    });
    setAuthCookie(res, signToken({ id: user.id, isGuest: true, email: null }));
    res.status(201).json({ user: toPublicUser(user) });
  }),
);

/** POST /api/auth/logout — clear the auth cookie. */
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

/** GET /api/auth/me — current identity (or 401). */
router.get(
  '/me',
  authenticate,
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = requireDb();
    const user = await db.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new AppError('AUTH_REQUIRED', 'Account no longer exists', 401);
    }
    res.json({ user: toPublicUser(user) });
  }),
);

export default router;
