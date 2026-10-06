import { describe, expect, it } from 'vitest';
import {
  BANNED_TERMS,
  buildPersonPrompt,
  buildTryOnPrompt,
  isSafePrompt,
} from '../src/ai/prompts';

describe('buildPersonPrompt', () => {
  it('always includes modesty phrases', () => {
    for (const personType of ['man', 'woman', 'boy', 'girl'] as const) {
      const prompt = buildPersonPrompt({ personType });
      for (const phrase of ['fully clothed', 'modest', 'non-sexualized']) {
        expect(prompt.toLowerCase(), `${personType} prompt`).toContain(phrase);
      }
      expect(isSafePrompt(prompt), `${personType} prompt passes gate`).toBe(true);
    }
  });

  it('kids prompts specify modest everyday children\'s clothing', () => {
    const prompt = buildPersonPrompt({ personType: 'girl' });
    expect(prompt).toContain("children's clothing");
    const boyPrompt = buildPersonPrompt({ personType: 'boy', ageGroup: 'child' });
    expect(boyPrompt).toContain('child');
  });

  it('uses neutral appearance descriptors only', () => {
    const prompt = buildPersonPrompt({
      personType: 'woman',
      skinTone: 8,
      hairColor: 'black',
      hairStyle: 'braids',
      bodyType: 'athletic',
    });
    expect(prompt).toContain('brown skin');
    expect(prompt).toContain('black hair');
    expect(prompt).toContain('braids hairstyle');
    expect(prompt).toContain('athletic build');
    expect(isSafePrompt(prompt)).toBe(true);
  });

  it('never contains banned terms (outside the "non-sexualized" safety phrase)', () => {
    const prompts = [
      buildPersonPrompt({ personType: 'man' }),
      buildPersonPrompt({ personType: 'girl', skinTone: 12 }),
      buildTryOnPrompt({
        top: { garmentId: 'tshirt', colorway: { base: '#FFFFFF', pattern: 'solid', material: 'cotton' } },
        accessories: [],
      }),
    ];
    for (const p of prompts) {
      expect(isSafePrompt(p), `prompt passes the safety gate:\n${p}`).toBe(true);
      // no banned term as a standalone word (hyphens count as word chars)
      for (const term of BANNED_TERMS) {
        const re = new RegExp(`(?<![\\w-])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i');
        expect(re.test(p), `prompt must not contain "${term}"`).toBe(false);
      }
    }
  });
});

describe('buildTryOnPrompt', () => {
  it('describes the garments and preserves identity', () => {
    const prompt = buildTryOnPrompt({
      dress: { garmentId: 'maxi-dress', colorway: { base: '#1E2A5A', pattern: 'floral', material: 'chiffon' } },
      shoes: { garmentId: 'sandals', colorway: { base: '#8B5E3C', pattern: 'solid', material: 'leather' } },
      accessories: [{ garmentId: 'necklace' }],
    });
    expect(prompt).toContain('maxi dress');
    expect(prompt).toContain('#1E2A5A');
    expect(prompt).toContain('floral');
    expect(prompt).toContain('necklace');
    expect(prompt).toContain("person's face");
    expect(isSafePrompt(prompt)).toBe(true);
  });
});

describe('isSafePrompt', () => {
  it('rejects sexualized inputs', () => {
    for (const bad of [
      'a sexy woman in lingerie',
      'nude portrait, artistic',
      'seductive pose with cleavage',
      'sensual erotic photoshoot',
      'topless model, suggestive',
    ]) {
      expect(isSafePrompt(bad), `"${bad}"`).toBe(false);
    }
  });

  it('rejects stereotyping labels', () => {
    for (const bad of [
      'exotic tribal dancer',
      'oriental beauty portrait',
      'ghetto style outfit',
    ]) {
      expect(isSafePrompt(bad), `"${bad}"`).toBe(false);
    }
  });

  it('accepts neutral fashion descriptions', () => {
    expect(isSafePrompt('full-body portrait of a woman, brown skin, modest dress')).toBe(true);
    expect(isSafePrompt('child wearing modest everyday clothing, t-shirt and jeans')).toBe(true);
  });
});
