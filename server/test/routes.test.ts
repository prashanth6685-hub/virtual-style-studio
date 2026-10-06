/**
 * HTTP-level tests for DB-free endpoints and auth-gated paths.
 * No database is running: DB-backed routes are expected to 503.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index';
import { signToken } from '../src/middleware/auth';

process.env.JWT_SECRET = 'route-test-secret-16!!';
delete process.env.DATABASE_URL;

const app = createApp();
const cookie = `vss_token=${signToken({ id: 'user_test', isGuest: false, email: 't@e.com' })}`;

const validAvatarConfig = {
  personType: 'woman',
  skinTone: 5,
  undertone: 'warm',
  face: { shape: 'oval', eyeShape: 'almond', eyeColor: 'brown', brows: 'natural', nose: 'straight', lips: 'full' },
  hair: { color: 'black', length: 'long', texture: 'wavy', style: 'ponytail' },
  body: { height: 'average', build: 'average', shoulder: 'average', waist: 'average', hips: 'average' },
  ageGroup: 'adult',
};

describe('GET /api/health', () => {
  it('returns ok + provider + flags', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.provider).toBe('pollinations');
    expect(typeof res.body.db).toBe('boolean');
    expect(res.body.email).toBe(false);
    expect(typeof res.body.time).toBe('string');
  });
});

describe('GET /api/catalog', () => {
  it('returns the shared catalog', async () => {
    const res = await request(app).get('/api/catalog');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(20);
    expect(res.body.categories).toContain('tops');
  });

  it('filters by personType and category', async () => {
    const res = await request(app).get('/api/catalog/items?personType=girl&category=dresses');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((i: { category: string }) => i.category === 'dresses')).toBe(true);
  });

  it('400s on a bad personType', async () => {
    const res = await request(app).get('/api/catalog/items?personType=alien');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });
});

describe('GET /api/colors/match', () => {
  it('returns complementary suggestions for a valid hex', async () => {
    const res = await request(app).get('/api/colors/match?hex=ff0000');
    expect(res.status).toBe(200);
    expect(res.body.base).toBe('#FF0000');
    expect(res.body.matches).toHaveLength(5);
  });

  it('400s on missing or invalid hex', async () => {
    const missing = await request(app).get('/api/colors/match');
    expect(missing.status).toBe(400);
    const bad = await request(app).get('/api/colors/match?hex=zzz');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION');
  });
});

describe('POST /api/tryon', () => {
  it('401s without auth', async () => {
    const res = await request(app).post('/api/tryon').send({ model: { kind: 'avatar' }, outfit: { accessories: [] } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('renders avatar try-on client-side immediately (no job)', async () => {
    const body = {
      model: { kind: 'avatar', config: validAvatarConfig },
      outfit: {
        top: { garmentId: 'tshirt', colorway: { base: '#FFFFFF', pattern: 'solid', material: 'cotton' } },
        accessories: [],
      },
    };
    const res = await request(app).post('/api/tryon').set('Cookie', cookie).send(body);
    expect(res.status).toBe(200);
    expect(res.body.render).toBe('client');
    expect(res.body.spec.outfit.top.garmentId).toBe('tshirt');
    expect(res.body.spec.model.config.personType).toBe('woman');
  });

  it('fails fast with NOT_PUBLIC for localhost source images', async () => {
    const res = await request(app)
      .post('/api/tryon')
      .set('Cookie', cookie)
      .send({
        model: { kind: 'upload', imageUrl: 'http://localhost:4000/uploads/abc.jpg' },
        outfit: { accessories: [] },
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NOT_PUBLIC');
  });

  it('400s on an invalid try-on payload', async () => {
    const res = await request(app)
      .post('/api/tryon')
      .set('Cookie', cookie)
      .send({ model: { kind: 'avatar' }, outfit: { accessories: [] } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });
});

describe('POST /api/outfits/suggest', () => {
  it('suggests without a database', async () => {
    const res = await request(app)
      .post('/api/outfits/suggest')
      .set('Cookie', cookie)
      .send({ personType: 'boy', occasion: 'casual' });
    expect(res.status).toBe(200);
    expect(res.body.outfit).toBeDefined();
    expect(Array.isArray(res.body.notes)).toBe(true);
  });

  it('401s without auth', async () => {
    const res = await request(app).post('/api/outfits/suggest').send({ personType: 'man' });
    expect(res.status).toBe(401);
  });
});

describe('auth without a database', () => {
  it('signup validates first (400), then 503s on missing DB', async () => {
    const bad = await request(app).post('/api/auth/signup').send({ email: 'x', password: 'y' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION');

    const ok = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'a@b.com', password: 'password123' });
    expect(ok.status).toBe(503);
    expect(ok.body.error.code).toBe('DB_UNAVAILABLE');
  });

  it('logout works without a database', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('uploads without a database', () => {
  it('rejects HEIC with 415 before touching the DB', async () => {
    const res = await request(app)
      .post('/api/uploads/photo')
      .set('Cookie', cookie)
      .attach('photo', Buffer.from('fake-heic-bytes'), { filename: 'photo.heic', contentType: 'image/heic' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });
});

describe('misc', () => {
  it('unknown job id 404s', async () => {
    const res = await request(app).get('/api/ai/jobs/does-not-exist').set('Cookie', cookie);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('unknown /api route 404s with the error envelope', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
