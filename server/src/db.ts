/**
 * Prisma client singleton.
 *
 * The database is OPTIONAL at runtime: when `DATABASE_URL` is unset the
 * server still boots and serves DB-free endpoints (catalog, colors,
 * suggest, health, avatar client-render try-on). DB-backed routes return
 * 503 via `requireDb()` in that case. This keeps `vitest` green with no
 * database running and lets the app boot before first migration.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from './middleware/errors';

let client: PrismaClient | null = null;

/** Prisma client, or null when DATABASE_URL is not configured. */
export function getDb(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  if (!client) {
    client = new PrismaClient();
  }
  return client;
}

export function dbEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}

/** Throw 503 when the database is not configured. */
export function requireDb(): PrismaClient {
  const db = getDb();
  if (!db) {
    throw new AppError(
      'DB_UNAVAILABLE',
      'Database is not configured — set DATABASE_URL to enable this endpoint',
      503,
    );
  }
  return db;
}

/** Convert a validated value to a Prisma JSON input (plain-JSON round trip). */
export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
