import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  ApiError,
  buildUrl,
  generateAvatar,
  generatePeople,
  login,
  matchColors,
  signup,
} from '../lib/api';

function mockFetchOnce(handler: (url: string, init?: RequestInit) => unknown) {
  const spy = vi.fn(async (url: string, init?: RequestInit) => {
    const result = handler(url, init);
    if (result instanceof Error) throw result;
    const { status = 200, body = {} } = result as { status?: number; body?: unknown };
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('api client URL building', () => {
  it('builds same-origin URLs by default', () => {
    expect(buildUrl('/api/auth/me')).toBe('/api/auth/me');
    expect(buildUrl('api/health')).toBe('/api/health');
  });

  it('honors VITE_API_URL and trims trailing slashes', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    expect(buildUrl('/api/catalog')).toBe('https://api.example.com/api/catalog');
  });
});

describe('api client requests', () => {
  it('signup POSTs credentials to /api/auth/signup with cookies', async () => {
    const spy = mockFetchOnce((url, init) => {
      expect(url).toBe('/api/auth/signup');
      expect(init?.method).toBe('POST');
      expect(init?.credentials).toBe('include');
      expect(JSON.parse(String(init?.body))).toEqual({ email: 'a@b.c', password: 'secret123' });
      return { body: { id: '1', email: 'a@b.c', isGuest: false, createdAt: 'x' } };
    });
    const user = await signup('a@b.c', 'secret123');
    expect(user.email).toBe('a@b.c');
    expect(spy).toHaveBeenCalledOnce();
  });

  it('login hits /api/auth/login', async () => {
    mockFetchOnce((url) => {
      expect(url).toBe('/api/auth/login');
      return { body: { id: '1', email: 'a@b.c', isGuest: false, createdAt: 'x' } };
    });
    await login('a@b.c', 'secret123');
  });

  it('generatePeople POSTs filters + count to /api/ai/people', async () => {
    mockFetchOnce((url, init) => {
      expect(url).toBe('/api/ai/people');
      const body = JSON.parse(String(init?.body));
      expect(body.filters.ageGroup).toBe('adult');
      expect(body.count).toBe(8);
      return { body: { jobId: 'job-1' } };
    });
    const res = await generatePeople({ ageGroup: 'adult' }, 8);
    expect(res.jobId).toBe('job-1');
  });

  it('generateAvatar POSTs the avatar config to /api/ai/avatar', async () => {
    const config = {
      personType: 'man',
      skinTone: 4,
      undertone: 'neutral',
      face: { shape: 'oval', eyeShape: 'almond', eyeColor: 'brown', brows: 'thick', nose: 'straight', lips: 'medium', facialHair: 'beard', makeup: 'none' },
      hair: { color: '#211d18', length: 'short', texture: 'straight', style: 'fade' },
      body: { height: 0.5, build: 'athletic', shoulder: 0.5, waist: 0.5, hips: 0.5 },
      ageGroup: 'adult',
    } as const;
    mockFetchOnce((url, init) => {
      expect(url).toBe('/api/ai/avatar');
      expect(init?.method).toBe('POST');
      const body = JSON.parse(String(init?.body));
      expect(body.config.personType).toBe('man');
      expect(body.config.face.facialHair).toBe('beard');
      return { status: 202, body: { jobId: 'job-9' } };
    });
    const res = await generateAvatar(config);
    expect(res.jobId).toBe('job-9');
  });

  it('throws ApiError with the server message on failure', async () => {
    mockFetchOnce(() => ({
      status: 409,
      body: { error: { code: 'taken', message: 'Email already registered' } },
    }));
    const err = await signup('a@b.c', 'secret123').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(409);
    expect((err as ApiError).message).toBe('Email already registered');
  });

  it('matchColors falls back to shared color theory when the endpoint fails', async () => {
    mockFetchOnce(() => new Error('offline'));
    const matches = await matchColors('#1a2b4c');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].relation).toBe('complementary');
  });
});
