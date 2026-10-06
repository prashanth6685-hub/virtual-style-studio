/**
 * PollinationsProvider (default, `AI_PROVIDER=pollinations`): free, keyless.
 *
 * - People: text-to-image via https://image.pollinations.ai/prompt/{enc}
 * - Try-on: image-to-image edit via the `?image={publicUrl}` parameter.
 *
 * The source image for try-on MUST be publicly reachable: Pollinations'
 * servers fetch it. In local dev the upload URL is usually localhost, so we
 * throw a clear ProviderError telling the user to set PUBLIC_BASE_URL (and
 * expose it, e.g. via a tunnel) or switch to AI_PROVIDER=mock.
 */
import { buildPersonPrompt, buildTryOnPrompt, isSafePrompt } from './prompts';
import { AIProvider, GeneratedPerson, PersonDetection, PersonFilters, ProviderError, TryOnInput, TryOnOutput } from './types';

export const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

/** Build a Pollinations image URL from a prompt + query params (exported for tests). */
export function buildPollinationsUrl(
  prompt: string,
  params: Record<string, string | number> = {},
): string {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) query.set(k, String(v));
  const qs = query.toString();
  return `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}${qs ? `?${qs}` : ''}`;
}

function isPubliclyReachable(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return false;
  const m172 = /^172\.(1[6-9]|2\d|3[01])\./.exec(host);
  if (m172) return false;
  return true;
}

/**
 * Resolve a model image reference to a publicly reachable URL.
 * Relative paths are resolved against PUBLIC_BASE_URL.
 */
export function resolvePublicImageUrl(imageUrl: string): string {
  let absolute = imageUrl;
  if (!/^[a-z]+:\/\//i.test(imageUrl)) {
    const base = process.env.PUBLIC_BASE_URL;
    if (!base) {
      throw new ProviderError(
        'Model image URL is relative and PUBLIC_BASE_URL is not set, so the AI provider cannot fetch it. ' +
          'Set PUBLIC_BASE_URL to your public base URL (e.g. https://your-app.onrender.com) ' +
          'or use AI_PROVIDER=mock for local development.',
        'NOT_PUBLIC',
        400,
      );
    }
    absolute = `${base.replace(/\/$/, '')}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
  }
  if (!isPubliclyReachable(absolute)) {
    throw new ProviderError(
      `Source image is not publicly reachable (${absolute}). The AI provider fetches the image ` +
        `from its own servers, so localhost/private URLs do not work. Set PUBLIC_BASE_URL to a ` +
        `public URL and retry, or use AI_PROVIDER=mock for local development.`,
      'NOT_PUBLIC',
      400,
    );
  }
  return absolute;
}

export class PollinationsProvider implements AIProvider {
  name(): string {
    return 'pollinations';
  }

  async generatePerson(filters: PersonFilters): Promise<GeneratedPerson> {
    const prompt = buildPersonPrompt(filters);
    if (!isSafePrompt(prompt)) {
      throw new ProviderError('Generated prompt failed the safety check', 'UNSAFE_PROMPT', 500);
    }
    const url = buildPollinationsUrl(prompt, {
      width: 768,
      height: 1024,
      nologo: 'true',
      seed: Math.floor(Math.random() * 1_000_000),
      model: 'flux',
    });
    return { url };
  }

  async tryOn(input: TryOnInput): Promise<TryOnOutput> {
    const publicUrl = resolvePublicImageUrl(input.modelImageUrl);
    const prompt = buildTryOnPrompt(input.outfit);
    if (!isSafePrompt(prompt)) {
      throw new ProviderError('Generated prompt failed the safety check', 'UNSAFE_PROMPT', 500);
    }
    const url = buildPollinationsUrl(prompt, {
      image: publicUrl,
      width: 768,
      height: 1024,
      nologo: 'true',
    });
    return { url };
  }

  async detectPerson(_imageUrl: string): Promise<PersonDetection> {
    throw new ProviderError(
      'detectPerson is not supported by the pollinations provider (geometry-only detection needs a vision model)',
      'NOT_SUPPORTED',
      501,
    );
  }
}
