/**
 * JWT auth via httpOnly cookie (`vss_token`).
 *
 * - `authenticate` is optional: attaches `req.user` when a valid token is
 *   present, otherwise leaves it null.
 * - `requireAuth` requires a valid token. Guest tokens (from
 *   POST /api/auth/guest) ARE accepted — guests get their own scoped user id.
 * - Google/Apple OAuth is intentionally NOT implemented (brief: frontend
 *   shows disabled "coming soon" buttons, never a fake OAuth flow).
 */
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errors';

export const AUTH_COOKIE = 'vss_token';

export interface AuthIdentity {
  id: string;
  isGuest: boolean;
  email: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthIdentity | null;
    }
  }
}

export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to a 16+ char value in production');
  }
  return 'dev-only-secret-do-not-use-in-prod';
}

export function signToken(identity: AuthIdentity): string {
  return jwt.sign(
    { sub: identity.id, isGuest: identity.isGuest, email: identity.email },
    getJwtSecret(),
    { expiresIn: '30d' },
  );
}

export function verifyToken(token: string): AuthIdentity | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as {
      sub?: string;
      isGuest?: boolean;
      email?: string | null;
    };
    if (!payload.sub) return null;
    return { id: payload.sub, isGuest: !!payload.isGuest, email: payload.email ?? null };
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
}

/** Optional auth: attach identity when a valid token cookie is present. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE];
  req.user = typeof token === 'string' ? verifyToken(token) : null;
  next();
}

/** Require a valid token (guests count as authenticated). */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('AUTH_REQUIRED', 'Sign in or continue as guest to use this endpoint', 401));
    return;
  }
  next();
}

/** Throw 403 unless the identity owns the row. */
export function assertOwner(identity: AuthIdentity, ownerId: string | null | undefined): void {
  if (!ownerId || ownerId !== identity.id) {
    throw new AppError('FORBIDDEN', 'You do not have access to this resource', 403);
  }
}
