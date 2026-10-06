import { afterEach, describe, expect, it } from 'vitest';
import { getProvider, getProviderName } from '../src/ai';
import { GeminiProvider } from '../src/ai/gemini';
import { MockAIProvider } from '../src/ai/mock';
import { PollinationsProvider, buildPollinationsUrl, POLLINATIONS_BASE, resolvePublicImageUrl } from '../src/ai/pollinations';
import { ReplicateProvider } from '../src/ai/replicate';
import { ProviderError } from '../src/ai/types';

const OLD_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...OLD_ENV };
});

describe('MockAIProvider', () => {
  it('returns results clearly labeled Preview', async () => {
    const provider = new MockAIProvider();
    expect(provider.name()).toBe('mock');
    const person = await provider.generatePerson({ personType: 'woman' });
    expect(person.url.length).toBeGreaterThan(0);
    expect(person.label).toContain('Preview');
    const tryon = await provider.tryOn({
      model: { kind: 'avatar' },
      outfit: { accessories: [] },
      modelImageUrl: 'https://example.com/x.jpg',
    });
    expect(tryon.label).toContain('Preview');
  });

  it('detectPerson returns geometry only', async () => {
    const detection = await new MockAIProvider().detectPerson('https://example.com/x.jpg');
    expect(detection.bbox).toHaveLength(4);
    expect(detection.bbox.every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});

describe('PollinationsProvider', () => {
  it('buildPollinationsUrl produces well-formed URLs', () => {
    const url = buildPollinationsUrl('a red dress', { width: 768, nologo: 'true' });
    expect(url.startsWith(`${POLLINATIONS_BASE}/`)).toBe(true);
    expect(url).toContain(encodeURIComponent('a red dress'));
    expect(url).toContain('width=768');
    expect(url).toContain('nologo=true');
  });

  it('generatePerson returns a pollinations URL for a safe prompt', async () => {
    const provider = new PollinationsProvider();
    const person = await provider.generatePerson({ personType: 'man' });
    expect(person.url.startsWith(POLLINATIONS_BASE)).toBe(true);
    expect(person.label).toBeUndefined();
  });

  it('detectPerson throws NOT_SUPPORTED', async () => {
    await expect(new PollinationsProvider().detectPerson('https://example.com/x.jpg')).rejects.toMatchObject({
      code: 'NOT_SUPPORTED',
    });
  });
});

describe('resolvePublicImageUrl', () => {
  it('throws a clear ProviderError for localhost URLs', () => {
    expect(() => resolvePublicImageUrl('http://localhost:4000/uploads/abc.jpg')).toThrow(ProviderError);
    expect(() => resolvePublicImageUrl('http://localhost:4000/uploads/abc.jpg')).toThrow(/PUBLIC_BASE_URL/);
  });

  it('throws for private-network URLs', () => {
    expect(() => resolvePublicImageUrl('http://192.168.1.5/uploads/abc.jpg')).toThrow(/publicly reachable/);
  });

  it('throws for relative URLs when PUBLIC_BASE_URL is unset', () => {
    delete process.env.PUBLIC_BASE_URL;
    expect(() => resolvePublicImageUrl('/uploads/abc.jpg')).toThrow(/PUBLIC_BASE_URL/);
  });

  it('resolves relative URLs against PUBLIC_BASE_URL', () => {
    process.env.PUBLIC_BASE_URL = 'https://app.example.com';
    expect(resolvePublicImageUrl('/uploads/abc.jpg')).toBe('https://app.example.com/uploads/abc.jpg');
  });

  it('accepts public https URLs as-is', () => {
    expect(resolvePublicImageUrl('https://cdn.example.com/photo.jpg')).toBe('https://cdn.example.com/photo.jpg');
  });
});

describe('stubs', () => {
  it('gemini throws not-configured until GEMINI_API_KEY is set', async () => {
    await expect(new GeminiProvider().generatePerson({ personType: 'woman' })).rejects.toThrow(
      /not configured — set GEMINI_API_KEY/,
    );
    await expect(new GeminiProvider().tryOn({} as never)).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it('replicate throws not-configured until REPLICATE_API_TOKEN is set', async () => {
    await expect(new ReplicateProvider().generatePerson({ personType: 'man' })).rejects.toThrow(
      /not configured — set REPLICATE_API_TOKEN/,
    );
  });
});

describe('getProvider factory', () => {
  it('defaults to pollinations', () => {
    delete process.env.AI_PROVIDER;
    expect(getProvider().name()).toBe('pollinations');
    expect(getProviderName()).toBe('pollinations');
  });

  it('selects mock', () => {
    process.env.AI_PROVIDER = 'mock';
    expect(getProvider().name()).toBe('mock');
  });

  it('rejects unknown providers', () => {
    process.env.AI_PROVIDER = 'midjourney';
    expect(() => getProvider()).toThrow(/Unknown AI_PROVIDER/);
  });
});
