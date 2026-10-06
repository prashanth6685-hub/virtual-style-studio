import { afterEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { signToken, verifyToken } from '../src/middleware/auth';

const OLD_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe('password hashing (bcrypt)', () => {
  it('hashes and verifies round-trip', async () => {
    const hash = await bcrypt.hash('correct horse battery staple', 12);
    expect(hash).not.toContain('correct horse');
    expect(await bcrypt.compare('correct horse battery staple', hash)).toBe(true);
    expect(await bcrypt.compare('wrong password', hash)).toBe(false);
  });
});

describe('JWT cookies', () => {
  it('sign/verify round-trips the identity', () => {
    process.env.JWT_SECRET = 'test-secret-16-chars!!';
    const identity = { id: 'user_123', isGuest: false, email: 'a@b.com' };
    const token = signToken(identity);
    expect(verifyToken(token)).toEqual(identity);
  });

  it('guest identities verify too', () => {
    process.env.JWT_SECRET = 'test-secret-16-chars!!';
    const token = signToken({ id: 'guest_1', isGuest: true, email: null });
    expect(verifyToken(token)).toEqual({ id: 'guest_1', isGuest: true, email: null });
  });

  it('rejects tampered and foreign tokens', () => {
    process.env.JWT_SECRET = 'test-secret-16-chars!!';
    const token = signToken({ id: 'user_1', isGuest: false, email: null });
    expect(verifyToken(`${token}tampered`)).toBeNull();
    expect(verifyToken('not-a-token')).toBeNull();
    process.env.JWT_SECRET = 'a-different-test-secret!!';
    expect(verifyToken(token)).toBeNull();
  });

  it('uses the dev fallback outside production', () => {
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
    const token = signToken({ id: 'u', isGuest: false, email: null });
    expect(verifyToken(token)?.id).toBe('u');
  });
});
